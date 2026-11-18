// =====================================================================
// MAREA · Función "pagos" (Supabase Edge Function)
// Hace tres cosas:
//   1. "checkout": el cliente toca "Pagar con tarjeta" -> crea la página de
//      pago de Stripe (cobro automático cada mes / 3 / 6 / 12 meses).
//   2. "portal": el cliente quiere cambiar su tarjeta o cancelar -> abre el
//      portal de Stripe.
//   3. Aviso de Stripe (webhook): cuando alguien paga, renueva o cancela,
//      actualiza su membresía y registra el pago en la base de datos.
//
// Secretos que necesita (Supabase -> Edge Functions -> Secrets):
//   STRIPE_SECRET_KEY      sk_test_... (prueba) o sk_live_... (real)
//   STRIPE_WEBHOOK_SECRET  whsec_...
//   APP_URL                (opcional) link de la app; por defecto GitHub Pages
// Al crearla, apaga "Verify JWT" (Stripe no manda sesión de usuario; la
// función revisa la sesión del cliente por su cuenta).
// =====================================================================

const STRIPE_API = "https://api.stripe.com/v1";
const STRIPE_VERSION = "2024-06-20"; // fija la forma de las respuestas de Stripe
const TZ = "America/Cancun";
const env = (k: string) => Deno.env.get(k) ?? "";
const APP_URL = (env("APP_URL") || "https://miguelvazquezmx.github.io/marea-app/").replace(/#.*$/, "");
const ALLOWED_RETURN = [APP_URL, "http://localhost:8765/"];
const INTERVAL: Record<string, [string, number]> = {
  monthly: ["month", 1], quarterly: ["month", 3], semiannual: ["month", 6], annual: ["year", 1],
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// ---------------------------------------------------------------------
// Supabase (con la llave secreta: salta los candados, solo vive aquí)
// ---------------------------------------------------------------------
function serviceKey(): string {
  try {
    const keys = JSON.parse(env("SUPABASE_SECRET_KEYS") || "{}");
    if (keys.default) return keys.default;
    const first = Object.values(keys)[0];
    if (typeof first === "string") return first;
  } catch { /* sin llaves nuevas */ }
  return env("SUPABASE_SERVICE_ROLE_KEY");
}
function sbHeaders(extra: Record<string, string> = {}) {
  const k = serviceKey();
  const h: Record<string, string> = { apikey: k, "Content-Type": "application/json", ...extra };
  if (k.startsWith("eyJ")) h.Authorization = `Bearer ${k}`; // llave antigua (JWT)
  return h;
}
async function db(path: string, init: RequestInit = {}) {
  const res = await fetch(`${env("SUPABASE_URL")}/rest/v1/${path}`, { ...init, headers: sbHeaders((init.headers as Record<string, string>) || {}) });
  const text = await res.text();
  if (!res.ok) throw new Error(`db ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}
const one = async (path: string) => (await db(path))?.[0] ?? null;
const enc = encodeURIComponent;

async function userFromToken(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token || token.startsWith("sb_")) return null;
  const res = await fetch(`${env("SUPABASE_URL")}/auth/v1/user`, { headers: { apikey: serviceKey(), Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return await res.json();
}

// ---------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------
function form(obj: Record<string, unknown>, prefix = "", out: string[] = []): string {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") form(v as Record<string, unknown>, key, out);
    else out.push(`${enc(key)}=${enc(String(v))}`);
  }
  return out.join("&");
}
async function stripe(method: string, path: string, params?: Record<string, unknown>) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${env("STRIPE_SECRET_KEY")}`, "Stripe-Version": STRIPE_VERSION, "Content-Type": "application/x-www-form-urlencoded" },
    body: params ? form(params) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`stripe ${res.status}: ${data?.error?.message || "error"}`);
  return data;
}

// Revisa que el aviso de verdad venga de Stripe (firma HMAC-SHA256).
async function verifyStripe(raw: string, header: string, secret: string, toleranceSec = 300): Promise<boolean> {
  const parts = Object.fromEntries(header.split(",").map(p => p.split("=", 2)).filter(p => p.length === 2).map(([k, v]) => [k.trim(), v]));
  const t = parts.t;
  const sigs = header.split(",").filter(p => p.trim().startsWith("v1=")).map(p => p.trim().slice(3));
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSec) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${raw}`)));
  const expected = Array.from(mac, b => b.toString(16).padStart(2, "0")).join("");
  return sigs.some(s => s.length === expected.length && timingSafeEqual(s, expected));
}
function timingSafeEqual(a: string, b: string) {
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const ymd = (unix: number) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(unix * 1000));

// ---------------------------------------------------------------------
// 1. Página de pago
// ---------------------------------------------------------------------
async function checkout(req: Request, body: Record<string, string>) {
  const user = await userFromToken(req);
  if (!user?.id) return json({ error: "Necesitas iniciar sesión" }, 401);
  const returnUrl = ALLOWED_RETURN.includes(body.return_url) ? body.return_url : APP_URL;

  const m = await one(`client_memberships?select=id,business_id,client_id,plan_id,status&id=eq.${enc(body.membership_id || "")}`);
  if (!m || m.status !== "pending") return json({ error: "No hay una membresía pendiente de pago" }, 400);
  const c = await one(`clients?select=id,user_id,email,name,stripe_customer_id&id=eq.${enc(m.client_id)}`);
  if (!c || c.user_id !== user.id) return json({ error: "Esta membresía no es tuya" }, 403);
  const p = await one(`membership_plans?select=id,name,price,currency,billing_cycle,is_active&id=eq.${enc(m.plan_id)}`);
  const b = await one(`businesses?select=id,name&id=eq.${enc(m.business_id)}`);
  const iv = INTERVAL[p?.billing_cycle];
  if (!p || !p.is_active || !iv) return json({ error: "Esta membresía no se puede pagar en línea" }, 400);

  const meta = { membership_id: m.id, client_id: c.id, business_id: m.business_id };
  const session = await stripe("POST", "/checkout/sessions", {
    mode: "subscription",
    locale: "es-419",
    client_reference_id: m.id,
    ...(c.stripe_customer_id ? { customer: c.stripe_customer_id } : { customer_email: c.email || user.email }),
    line_items: { 0: { quantity: 1, price_data: {
      currency: String(p.currency || "MXN").toLowerCase(),
      unit_amount: Math.round(Number(p.price) * 100),
      recurring: { interval: iv[0], interval_count: iv[1] },
      product_data: { name: `${b?.name || "MAREA"} · ${p.name}` },
    } } },
    metadata: meta,
    subscription_data: { metadata: meta },
    allow_promotion_codes: "true",
    success_url: `${returnUrl}#/pago-ok`,
    cancel_url: `${returnUrl}#/plan-elegido`,
  });
  return json({ url: session.url });
}

// ---------------------------------------------------------------------
// 2. Portal del cliente (cambiar tarjeta o cancelar)
// ---------------------------------------------------------------------
async function portal(req: Request, body: Record<string, string>) {
  const user = await userFromToken(req);
  if (!user?.id) return json({ error: "Necesitas iniciar sesión" }, 401);
  const returnUrl = ALLOWED_RETURN.includes(body.return_url) ? body.return_url : APP_URL;
  const c = await one(`clients?select=id,stripe_customer_id&user_id=eq.${enc(user.id)}&stripe_customer_id=not.is.null&limit=1`);
  if (!c?.stripe_customer_id) return json({ error: "Todavía no tienes un pago con tarjeta" }, 400);
  const s = await stripe("POST", "/billing_portal/sessions", { customer: c.stripe_customer_id, return_url: `${returnUrl}#/inicio` });
  return json({ url: s.url });
}

// ---------------------------------------------------------------------
// 3. Avisos de Stripe
// ---------------------------------------------------------------------
const STATUS: Record<string, string> = {
  active: "active", trialing: "active", past_due: "active", // past_due: Stripe sigue reintentando; vence sola si no paga
  canceled: "canceled", unpaid: "expired", incomplete_expired: "expired", paused: "expired",
};

// Lee la suscripción directo de Stripe y deja la membresía igual.
async function syncSubscription(subId: string) {
  const sub = await stripe("GET", `/subscriptions/${enc(subId)}`);
  const membershipId = sub.metadata?.membership_id;
  if (!membershipId) return null;
  const m = await one(`client_memberships?select=id,client_id,status,start_date&id=eq.${enc(membershipId)}`);
  if (!m) return null;
  const status = STATUS[sub.status];
  const patch: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    auto_renew: sub.status === "active" && !sub.cancel_at_period_end,
  };
  if (status) patch.status = status;
  if (status === "active") {
    if (m.status !== "active") patch.start_date = ymd(sub.current_period_start);
    patch.end_date = ymd(sub.current_period_end);
  }
  if (status === "canceled" && sub.ended_at) patch.end_date = ymd(sub.ended_at);
  await db(`client_memberships?id=eq.${enc(m.id)}`, { method: "PATCH", body: JSON.stringify(patch) });
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (customer) await db(`clients?id=eq.${enc(m.client_id)}`, { method: "PATCH", body: JSON.stringify({ stripe_customer_id: customer }) });
  return { sub, m };
}

async function recordInvoice(inv: Record<string, any>, subId: string) {
  const amount = Number(inv.amount_paid || 0) / 100;
  if (!amount) return;
  const exists = await one(`payments?select=id&provider_payment_id=eq.${enc(inv.id)}`);
  if (exists) return;
  const sub = await stripe("GET", `/subscriptions/${enc(subId)}`);
  const membershipId = sub.metadata?.membership_id;
  const m = membershipId ? await one(`client_memberships?select=id,business_id,client_id&id=eq.${enc(membershipId)}`) : null;
  if (!m) return;
  const paidAt = inv.status_transitions?.paid_at || inv.created;
  await db("payments?on_conflict=provider_payment_id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates" },
    body: JSON.stringify({
      business_id: m.business_id, client_id: m.client_id, client_membership_id: m.id,
      amount, currency: String(inv.currency || "mxn").toUpperCase(), payment_date: ymd(paidAt),
      method: "card", status: "paid", notes: "Cobro automático con tarjeta (Stripe)", provider_payment_id: inv.id,
    }),
  });
}

function subIdOf(event: Record<string, any>): string | null {
  const o = event.data?.object || {};
  if (event.type.startsWith("customer.subscription.")) return o.id;
  if (event.type === "checkout.session.completed") return typeof o.subscription === "string" ? o.subscription : o.subscription?.id ?? null;
  if (event.type.startsWith("invoice.")) {
    const s = o.subscription ?? o.parent?.subscription_details?.subscription; // cambia según la versión de Stripe
    return typeof s === "string" ? s : s?.id ?? null;
  }
  return null;
}

async function webhook(req: Request) {
  const raw = await req.text();
  const ok = await verifyStripe(raw, req.headers.get("Stripe-Signature") || "", env("STRIPE_WEBHOOK_SECRET"));
  if (!ok) return json({ error: "firma inválida" }, 400);
  const event = JSON.parse(raw);
  const subId = subIdOf(event);
  if (!subId) return json({ received: true, ignored: event.type });
  await syncSubscription(subId);
  if (event.type === "invoice.paid") await recordInvoice(event.data.object, subId);
  return json({ received: true });
}

// ---------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  try {
    if (req.headers.get("Stripe-Signature")) return await webhook(req);
    const body = await req.json().catch(() => ({}));
    if (body.action === "checkout") return await checkout(req, body);
    if (body.action === "portal") return await portal(req, body);
    return json({ error: "Acción desconocida" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "No se pudo completar. Intenta de nuevo." }, 500);
  }
});
