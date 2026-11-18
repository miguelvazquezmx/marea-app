// =====================================================================
// MAREA · App del cliente (y panel del coach)
// Flujo del cliente: se registra con el link del coach -> elige membresía
// (queda pendiente hasta que el coach confirme el pago) -> llena su
// valoración inicial -> ve su inicio.
// El coach (dueño del negocio) entra con su cuenta y ve el panel de clientes.
// =====================================================================
import { CONFIG } from "./config.js";
import { FORM_VERSION, mountForm, analyze, answersHTML, coachSummaryHTML, LIGHT_TEXT, esc } from "./valoracion.js";

const recoveringAtStart = /type=recovery/.test(location.hash);
const sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const S = { business: null, user: null, member: null, client: null, memberships: [], membership: null, intake: null };
const $app = document.getElementById("app");
const $tide = document.getElementById("tide");
const APP_URL = location.origin + location.pathname;
const TZ = "America/Cancun";
const MONTHS = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 };
const CYCLE = { monthly: "Mensual", quarterly: "Trimestral", semiannual: "Semestral", annual: "Anual", per_sessions: "Por sesiones", one_time: "Pago único" };
const METHODS = [["transfer", "Transferencia"], ["cash", "Efectivo"], ["card", "Tarjeta"], ["other", "Otro"]];

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------
const ICON = {
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>`,
  wa: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.4.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.2-.3-.3-.5-.4Z"/></svg>`,
  wave: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M2 19c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" opacity=".5"/><circle cx="12" cy="7" r="3"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
};

function view(html, cls = "") {
  $app.innerHTML = `<div class="screen ${cls}">${html}</div>`;
  window.scrollTo(0, 0);
  return $app.firstElementChild;
}
const q = (sel, root = $app) => root.querySelector(sel);
function setTide(pct) { $tide.style.height = Math.max(0, Math.min(100, pct)) + "%"; }

let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 2600);
}

function sheet(html) {
  const bg = document.createElement("div");
  bg.className = "sheet-bg";
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => { bg.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = e => { if (e.key === "Escape") close(); };
  bg.addEventListener("click", e => { if (e.target === bg) close(); });
  document.addEventListener("keydown", onKey);
  document.body.appendChild(bg);
  return { el: bg.firstElementChild, close };
}

const money = (n, cur = "MXN") => new Intl.NumberFormat("es-MX", { style: "currency", currency: cur, maximumFractionDigits: Number(n) % 1 ? 2 : 0 }).format(Number(n));
const todayLocal = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
function addMonths(ymd, n) {
  const [y, m, d] = ymd.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1 + n, d));
  if (x.getUTCDate() !== d) x.setUTCDate(0); // 31 ene + 1 mes = 28/29 feb
  return x.toISOString().slice(0, 10);
}
const fmtDate = (ymd, withYear = true) => ymd ? new Date(ymd.slice(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" }).replace(".", "") : "";
const fmtStamp = ts => ts ? new Date(ts).toLocaleDateString("es-MX", { day: "numeric", month: "long", timeZone: TZ }) : "";
const firstName = n => (n || "").trim().split(/\s+/)[0] || "";
const initials = n => (n || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
function waNumber(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.length === 10) d = "52" + d;
  return d.length >= 11 ? d : "";
}
const waLink = (num, text) => `https://wa.me/${num}${text ? "?text=" + encodeURIComponent(text) : ""}`;

function errMsg(e) {
  console.error(e);
  const m = String(e?.message || e || "").toLowerCase();
  if (m.includes("invalid login")) return "Correo o contraseña incorrectos.";
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user_already_exists")) return "Ya existe una cuenta con ese correo. Inicia sesión.";
  if (m.includes("password should") || m.includes("at least 6")) return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("weak")) return "Esa contraseña es muy fácil de adivinar. Prueba con otra.";
  if (m.includes("different from the old") || m.includes("same_password")) return "La nueva contraseña debe ser distinta a la anterior.";
  if (m.includes("email not confirmed")) return "Falta confirmar tu correo. Revisa tu bandeja de entrada.";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes")) return "Demasiados intentos seguidos. Espera unos minutos y vuelve a intentar.";
  if (m.includes("invalid") && m.includes("email")) return "Revisa que tu correo esté bien escrito.";
  if (m.includes("failed to fetch") || m.includes("network") || m.includes("load failed")) return "Sin conexión. Revisa tu internet e intenta de nuevo.";
  if (m.includes("signups not allowed")) return "Por ahora no se pueden crear cuentas nuevas. Escríbele a tu coach.";
  if (m.includes("membresía no disponible")) return "Esa membresía ya no está disponible. Elige otra.";
  return "Algo salió mal. Intenta de nuevo en un momento.";
}

async function busy(btn, label, fn) {
  const old = btn.innerHTML; btn.disabled = true;
  btn.innerHTML = `<span class="spin" aria-hidden="true"></span> ${esc(label)}`;
  try { return await fn(); } finally { if (btn.isConnected) { btn.disabled = false; btn.innerHTML = old; } }
}

function must(res) { if (res.error) throw res.error; return res.data; }

const planById = id => (S.business?.plans || []).find(p => p.id === id);
function planLabel(p) { return p ? p.name : "Membresía"; }

// Membresía que cuenta hoy: la pendiente más nueva, si no la activa vigente, si no la última.
function currentMembership(list) {
  const today = todayLocal();
  return list.find(m => m.status === "pending")
    || list.find(m => m.status === "active" && (!m.end_date || m.end_date >= today))
    || list[0] || null;
}
function mState(m) {
  if (!m) return { k: "none", t: "Sin membresía", c: "off" };
  if (m.status === "pending") return { k: "pending", t: "Pendiente de pago", c: "pending" };
  if (m.status === "active" && m.end_date && m.end_date < todayLocal()) return { k: "expired", t: "Vencida", c: "red" };
  if (m.status === "active") return { k: "active", t: "Activa", c: "active" };
  if (m.status === "expired") return { k: "expired", t: "Vencida", c: "red" };
  return { k: "canceled", t: "Cancelada", c: "off" };
}
const pill = st => `<span class="pill ${st.c}"><i></i>${esc(st.t)}</span>`;

// ---------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------
async function loadBusiness() {
  const data = must(await sb.rpc("get_business_public", { p_slug: CONFIG.businessSlug }));
  if (!data) throw new Error("Negocio no encontrado");
  S.business = data;
  document.title = `${data.name} · Entrenamiento`;
}

async function loadUser() {
  const uid = S.user.id, b = S.business.id;
  S.member = null; S.client = null; S.memberships = []; S.membership = null; S.intake = null;
  const mem = must(await sb.from("business_members").select("id,role,name,title,is_active").eq("business_id", b).eq("user_id", uid).maybeSingle());
  if (mem && mem.is_active) { S.member = mem; return; }
  let c = must(await sb.from("clients").select("id,name,email,phone,status,created_at").eq("business_id", b).eq("user_id", uid).maybeSingle());
  if (!c) {
    const meta = S.user.user_metadata || {};
    const name = (meta.name || "").trim() || (S.user.email || "").split("@")[0];
    must(await sb.rpc("join_business", { p_slug: CONFIG.businessSlug, p_name: name, p_phone: meta.phone || null }));
    c = must(await sb.from("clients").select("id,name,email,phone,status,created_at").eq("business_id", b).eq("user_id", uid).single());
  }
  S.client = c;
  await loadClientData();
}

async function loadClientData() {
  const [ms, it] = await Promise.all([
    sb.from("client_memberships").select("id,plan_id,status,start_date,end_date,created_at").eq("client_id", S.client.id).order("created_at", { ascending: false }),
    sb.from("intake_forms").select("id,answers,submitted_at,safety_light").eq("client_id", S.client.id).order("submitted_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  S.memberships = must(ms) || [];
  S.membership = currentMembership(S.memberships);
  S.intake = must(it);
}

// ---------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------
const PUBLIC = ["bienvenida", "entrar", "registro", "olvide", "confirma"];
let recovering = recoveringAtStart;

function home() {
  if (!S.user) return "bienvenida";
  if (S.member) return "clientes";
  if (!S.membership) return "planes";
  if (!S.intake) return "valoracion";
  return "inicio";
}

function go(path, replace = false) {
  const h = "#/" + path;
  if (replace) { history.replaceState(null, "", h); router(); }
  else if (location.hash === h) router();
  else location.hash = h;
}

function router() {
  const h = location.hash;
  if (!h.startsWith("#/")) return go(recovering && S.user ? "nueva-clave" : home(), true);
  const [name, arg] = h.slice(2).split("/");
  setTide(0);
  if (name === "aviso") return screenPrivacy();
  if (name === "nueva-clave") return S.user ? screenNewPassword() : go("entrar", true);
  if (!S.user) return PUBLIC.includes(name) ? R[name]() : go("bienvenida", true);
  if (PUBLIC.includes(name)) return go(home(), true);
  if (S.member) {
    if (name === "clientes") return screenCoachList();
    if (name === "cliente" && arg) return screenCoachClient(arg);
    return go("clientes", true);
  }
  const ok = {
    planes: true,
    "plan-elegido": !!S.membership,
    valoracion: !!S.membership,
    inicio: !!S.membership && !!S.intake,
    "mis-respuestas": !!S.intake,
  };
  if (!ok[name]) return go(home(), true);
  return R[name](arg);
}

const R = {
  bienvenida: screenWelcome, entrar: screenLogin, registro: screenSignup, olvide: screenForgot, confirma: screenConfirm,
  planes: screenPlans, "plan-elegido": screenPlanChosen, valoracion: screenIntake, inicio: screenHome, "mis-respuestas": screenMyAnswers,
};

async function afterLogin(user) {
  S.user = user;
  view(`<div class="spinner" role="status" aria-label="Cargando"></div>`, "center");
  try { await loadUser(); go(home(), true); }
  catch (e) { screenError(e); }
}

// ---------------------------------------------------------------------
// Pantallas públicas
// ---------------------------------------------------------------------
function topbar(back) {
  return `<div class="topbar">${back ? `<button class="back" type="button" data-back="${esc(back)}">${ICON.back}Atrás</button>` : `<span class="wordmark">${esc(S.business?.name || "MAREA")}</span>`}<span></span></div>`;
}
function wireBack(root) { root.querySelectorAll("[data-back]").forEach(b => b.onclick = () => go(b.dataset.back)); }

function screenWelcome() {
  setTide(8);
  const B = S.business;
  const root = view(`
    <div class="hero">
      <span class="wordmark">${esc(B.name)}</span>
      <div class="eyebrow">Entrenamiento personalizado en línea</div>
      <p class="tagline">Tu programa de entrenamiento, hecho a tu medida y siempre en tu celular.</p>
      <ol class="how">
        <li><b>1</b><span><strong>Crea tu cuenta.</strong> Toma un minuto.</span></li>
        <li><b>2</b><span><strong>Elige tu membresía.</strong> La que mejor va contigo.</span></li>
        <li><b>3</b><span><strong>Llena tu valoración.</strong> Con ella armamos tu programa a tu medida.</span></li>
      </ol>
    </div>
    <div class="spacer"></div>
    <div class="stack">
      <button class="btn main block" id="go-signup" type="button">Crear mi cuenta</button>
      <button class="btn ghost block" id="go-login" type="button">Ya tengo cuenta</button>
    </div>`, "split");
  q("#go-signup", root).onclick = () => go("registro");
  q("#go-login", root).onclick = () => go("entrar");
}

function pwField(id, label, auto) {
  return `<div class="q"><label for="${id}">${label}</label><div class="pw"><input class="inp" id="${id}" name="${id}" type="password" autocomplete="${auto}" minlength="6" required><button type="button" data-toggle="${id}" aria-label="Mostrar contraseña">Ver</button></div></div>`;
}
function wirePw(root) {
  root.querySelectorAll("[data-toggle]").forEach(b => b.onclick = () => {
    const i = q("#" + b.dataset.toggle, root); const show = i.type === "password";
    i.type = show ? "text" : "password"; b.textContent = show ? "Ocultar" : "Ver";
    b.setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
  });
}

function screenSignup() {
  setTide(14);
  const root = view(`
    ${topbar("bienvenida")}
    <div class="eyebrow">Paso 1 de 3</div>
    <h1>Crea tu cuenta</h1>
    <p class="lede">Con esta cuenta vas a ver tus rutinas y tu avance.</p>
    <form class="fields" id="f" novalidate>
      <div class="q"><label for="name">Nombre completo</label><input class="inp" id="name" name="name" autocomplete="name" autocapitalize="words" required></div>
      <div class="q"><label for="phone">WhatsApp</label><div class="hint">10 dígitos. Por aquí te contacta tu coach.</div><input class="inp" id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="984 123 4567" required></div>
      <div class="q"><label for="email">Correo</label><input class="inp" id="email" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" required></div>
      ${pwField("password", "Crea una contraseña", "new-password")}
      <div class="hint" style="margin-top:-12px">Mínimo 6 caracteres.</div>
      <p class="err" id="err" role="alert"></p>
      <button class="btn main block" id="submit" type="submit">Crear mi cuenta</button>
      <p class="small" style="margin:0;text-align:center">Al crear tu cuenta aceptas el <a href="#" data-aviso>aviso de privacidad</a>.</p>
    </form>
    <div class="spacer"></div>
    <p class="small" style="text-align:center;margin-top:18px">¿Ya tienes cuenta? <button class="linkbtn accent" type="button" id="to-login">Inicia sesión</button></p>`);
  wireBack(root); wirePw(root);
  q("#to-login", root).onclick = () => go("entrar");
  const f = q("#f", root), err = q("#err", root);
  f.onsubmit = async e => {
    e.preventDefault(); err.textContent = "";
    const name = f.name.value.trim().replace(/\s+/g, " "), phone = f.phone.value.replace(/\D/g, ""), email = f.email.value.trim().toLowerCase(), password = f.password.value;
    const bad = (el, msg) => { err.textContent = msg; el.setAttribute("aria-invalid", "true"); el.focus(); };
    f.querySelectorAll("[aria-invalid]").forEach(x => x.removeAttribute("aria-invalid"));
    if (name.length < 3) return bad(f.name, "Escribe tu nombre completo.");
    if (phone.length < 10) return bad(f.phone, "Escribe tu WhatsApp a 10 dígitos.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad(f.email, "Revisa que tu correo esté bien escrito.");
    if (password.length < 6) return bad(f.password, "La contraseña debe tener al menos 6 caracteres.");
    await busy(q("#submit", root), "Creando tu cuenta…", async () => {
      try {
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name, phone }, emailRedirectTo: APP_URL } });
        if (error) throw error;
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error("already registered");
        if (!data.session) { sessionStorage.setItem("marea-confirm-email", email); return go("confirma"); }
        await afterLogin(data.session.user);
      } catch (e2) { err.textContent = errMsg(e2); }
    });
  };
}

function screenConfirm() {
  setTide(20);
  const email = sessionStorage.getItem("marea-confirm-email") || "tu correo";
  const root = view(`
    ${topbar("entrar")}
    <div class="eyebrow">Casi listo</div>
    <h1>Revisa tu correo</h1>
    <p class="lede">Te mandamos un enlace a <b>${esc(email)}</b>. Ábrelo desde este mismo celular para confirmar tu cuenta y seguir.</p>
    <div class="note"><i></i><span>Si no lo ves en unos minutos, busca en la carpeta de spam o promociones.</span></div>
    <div class="spacer"></div>
    <button class="btn ghost block" id="login" type="button" style="margin-top:22px">Ya lo confirmé, iniciar sesión</button>`, "");
  wireBack(root);
  q("#login", root).onclick = () => go("entrar");
}

function screenLogin() {
  setTide(10);
  const root = view(`
    ${topbar("bienvenida")}
    <h1>Inicia sesión</h1>
    <p class="lede">Entra con el correo y la contraseña de tu cuenta.</p>
    <form class="fields" id="f" novalidate>
      <div class="q"><label for="email">Correo</label><input class="inp" id="email" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" required></div>
      ${pwField("password", "Contraseña", "current-password")}
      <p class="err" id="err" role="alert"></p>
      <button class="btn main block" id="submit" type="submit">Entrar</button>
      <button class="linkbtn" type="button" id="forgot" style="align-self:center">Olvidé mi contraseña</button>
    </form>
    <div class="spacer"></div>
    <p class="small" style="text-align:center;margin-top:18px">¿Eres nuevo? <button class="linkbtn accent" type="button" id="to-signup">Crea tu cuenta</button></p>`);
  wireBack(root); wirePw(root);
  q("#forgot", root).onclick = () => go("olvide");
  q("#to-signup", root).onclick = () => go("registro");
  const f = q("#f", root), err = q("#err", root);
  f.onsubmit = async e => {
    e.preventDefault(); err.textContent = "";
    const email = f.email.value.trim().toLowerCase(), password = f.password.value;
    if (!email || !password) { err.textContent = "Escribe tu correo y tu contraseña."; return; }
    await busy(q("#submit", root), "Entrando…", async () => {
      try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await afterLogin(data.user);
      } catch (e2) { err.textContent = errMsg(e2); }
    });
  };
}

function screenForgot() {
  setTide(10);
  const root = view(`
    ${topbar("entrar")}
    <h1>Recupera tu contraseña</h1>
    <p class="lede">Escribe tu correo y te mandamos un enlace para crear una nueva.</p>
    <form class="fields" id="f" novalidate>
      <div class="q"><label for="email">Correo</label><input class="inp" id="email" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" required></div>
      <p class="err" id="err" role="alert"></p>
      <button class="btn main block" id="submit" type="submit">Enviar enlace</button>
    </form>`);
  wireBack(root);
  const f = q("#f", root), err = q("#err", root);
  f.onsubmit = async e => {
    e.preventDefault(); err.textContent = "";
    const email = f.email.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = "Revisa que tu correo esté bien escrito."; return; }
    await busy(q("#submit", root), "Enviando…", async () => {
      try {
        must(await sb.auth.resetPasswordForEmail(email, { redirectTo: APP_URL }));
        f.outerHTML = `<div class="note"><i></i><span>Listo. Si <b>${esc(email)}</b> tiene una cuenta, en unos minutos te llega el enlace. Ábrelo desde este celular.</span></div>
          <p class="small" style="margin-top:16px">¿No te llega? Escríbele a tu coach y te ayuda.</p>`;
      } catch (e2) { err.textContent = errMsg(e2); }
    });
  };
}

function screenNewPassword() {
  const root = view(`
    <div class="topbar"><span class="wordmark">${esc(S.business?.name || "MAREA")}</span></div>
    <h1>Nueva contraseña</h1>
    <p class="lede">Escribe la contraseña que vas a usar a partir de hoy.</p>
    <form class="fields" id="f" novalidate>
      ${pwField("password", "Nueva contraseña", "new-password")}
      <p class="err" id="err" role="alert"></p>
      <button class="btn main block" id="submit" type="submit">Guardar contraseña</button>
    </form>`);
  wirePw(root);
  const f = q("#f", root), err = q("#err", root);
  f.onsubmit = async e => {
    e.preventDefault(); err.textContent = "";
    if (f.password.value.length < 6) { err.textContent = "La contraseña debe tener al menos 6 caracteres."; return; }
    await busy(q("#submit", root), "Guardando…", async () => {
      try {
        const { data, error } = await sb.auth.updateUser({ password: f.password.value });
        if (error) throw error;
        recovering = false; toast("Contraseña guardada");
        await afterLogin(data.user);
      } catch (e2) { err.textContent = errMsg(e2); }
    });
  };
}

// ---------------------------------------------------------------------
// Membresía
// ---------------------------------------------------------------------
function groupPlans(plans) {
  const groups = [];
  for (const p of plans) {
    const key = /alimentaci/i.test(p.name + " " + (p.description || "")) ? "Entrenamiento + guía de alimentación" : "Entrenamiento";
    let g = groups.find(x => x.key === key);
    if (!g) groups.push(g = { key, plans: [] });
    g.plans.push(p);
  }
  return groups;
}

function planCard(p, checked) {
  const months = MONTHS[p.billing_cycle];
  const per = months > 1 ? `${money(Math.round(p.price / months), p.currency)} al mes` : "por mes";
  const saveMatch = (p.description || "").match(/(Ahorras \d+%|\d+ mes(?:es)? gratis)/i);
  const desc = (p.description || "").replace(/\s*(Ahorras \d+%|\d+ mes(?:es)? gratis)\.?/i, "").trim();
  return `<label class="plan"><input type="radio" name="plan" value="${esc(p.id)}" ${checked ? "checked" : ""}>
    <div class="box">
      <span class="name">${esc(p.name)}</span><span class="price">${esc(money(p.price, p.currency))}</span>
      <span class="desc">${esc(desc)}</span><span class="per">${esc(per)}</span>
      ${saveMatch ? `<span class="pill active save">${esc(saveMatch[1])}</span>` : ""}
    </div></label>`;
}

function screenPlans() {
  setTide(36);
  const plans = S.business.plans || [];
  const pending = S.membership?.status === "pending" ? S.membership : null;
  const canBack = !!S.intake || !!pending;
  const root = view(`
    ${canBack ? topbar(S.intake ? "inicio" : "plan-elegido") : `<div class="topbar"><span class="wordmark">${esc(S.business.name)}</span><button class="iconbtn" id="out" type="button">Salir</button></div>`}
    ${S.intake ? "" : `<div class="eyebrow">Paso 2 de 3</div>`}
    <h1>${pending ? "Cambia tu membresía" : "Elige tu membresía"}</h1>
    <p class="lede">Tu membresía se activa en cuanto se confirme tu pago.</p>
    ${plans.length ? groupPlans(plans).map(g => `<div class="plan-group"><div class="gh"><h3>${esc(g.key)}</h3></div><div class="plans">${g.plans.map(p => planCard(p, pending?.plan_id === p.id)).join("")}</div></div>`).join("")
      : `<div class="empty">Tu coach todavía no publica sus membresías. Vuelve a intentar más tarde.</div>`}
    <p class="err" id="err" role="alert"></p>
    <div class="nav"><button class="btn main block" id="choose" type="button" ${pending ? "" : "disabled"}>${pending ? "Guardar cambio" : "Elige una opción"}</button></div>`);
  wireBack(root);
  q("#out", root)?.addEventListener("click", signOut);
  const btn = q("#choose", root), err = q("#err", root);
  root.addEventListener("change", e => {
    if (e.target.name !== "plan") return;
    const p = planById(e.target.value);
    btn.disabled = false; btn.textContent = `Continuar con ${p.name} · ${money(p.price, p.currency)}`;
  });
  btn.onclick = async () => {
    const sel = q('input[name="plan"]:checked', root);
    if (!sel) { err.textContent = "Elige una membresía."; return; }
    err.textContent = "";
    await busy(btn, "Guardando…", async () => {
      try {
        must(await sb.rpc("choose_membership", { p_plan_id: sel.value }));
        await loadClientData();
        go("plan-elegido");
      } catch (e) { err.textContent = errMsg(e); }
    });
  };
}

function payMessage() {
  const p = planById(S.membership?.plan_id);
  return `Hola, soy ${S.client.name}. Me registré en ${S.business.name} y elegí la membresía ${planLabel(p)}${p ? ` (${money(p.price, p.currency)})` : ""}. ¿Me pasas los datos para pagar?`;
}

function screenPlanChosen() {
  setTide(52);
  const p = planById(S.membership.plan_id);
  const st = mState(S.membership);
  const wa = CONFIG.coachWhatsApp ? `<a class="btn wa block" href="${esc(waLink(CONFIG.coachWhatsApp, payMessage()))}" target="_blank" rel="noopener">${ICON.wa} Pedir datos de pago por WhatsApp</a>` : "";
  const root = view(`
    <div class="topbar"><span class="wordmark">${esc(S.business.name)}</span><span></span></div>
    <div class="eyebrow">Membresía elegida</div>
    <h1 class="big">${st.k === "active" ? "¡Activa!" : "¡Listo!"}</h1>
    <div class="card" style="margin:8px 0 18px">
      <div class="mstat"><b>${esc(planLabel(p))}</b>${pill(st)}</div>
      ${p ? `<p class="small">${esc(money(p.price, p.currency))} · ${esc(CYCLE[p.billing_cycle] || "")}</p>` : ""}
    </div>
    ${st.k === "pending" ? `<p class="lede">Tu coach te va a mandar los datos para pagar. En cuanto confirme tu pago, tu membresía se activa y lo verás en tu inicio.</p>` : ""}
    <div class="spacer"></div>
    <div class="stack">
      ${st.k === "pending" ? wa : ""}
      <button class="btn main block" id="next" type="button">${S.intake ? "Ir a mi inicio" : "Llenar mi valoración"}</button>
      <button class="linkbtn" id="change" type="button" style="align-self:center">Cambiar de membresía</button>
    </div>`, "split");
  q("#next", root).onclick = () => go(S.intake ? "inicio" : "valoracion");
  q("#change", root).onclick = () => go("planes");
}

// ---------------------------------------------------------------------
// Valoración
// ---------------------------------------------------------------------
const draftKey = () => `marea-valoracion-${S.user.id}`;
function loadDraft() { try { return JSON.parse(localStorage.getItem(draftKey()) || "null"); } catch { return null; } }
function saveDraft(a, step) { try { localStorage.setItem(draftKey(), JSON.stringify({ a, step, at: Date.now() })); } catch { /* sin espacio o modo privado */ } }
function clearDraft() { try { localStorage.removeItem(draftKey()); } catch { } }

function screenIntake(arg) {
  const editing = arg === "editar" && S.intake;
  const draft = loadDraft();
  const startAnswers = draft?.a || (editing ? S.intake.answers : {});
  const p = planById(S.membership.plan_id);
  const st = mState(S.membership);
  setTide(4);
  const resumable = draft && Object.keys(draft.a || {}).length > 0;
  const root = view(`
    <div class="topbar">${S.intake ? `<button class="back" type="button" data-back="inicio">${ICON.back}Mi inicio</button>` : `<span class="wordmark">${esc(S.business.name)}</span>`}<button class="iconbtn" id="out" type="button">Salir</button></div>
    <div>
      <div class="eyebrow">${S.intake ? "Actualiza tu valoración" : "Paso 3 de 3 · Tu valoración"}</div>
      <h1 class="big">Hola, ${esc(firstName(S.client.name))}</h1>
      <p class="lede">${S.intake ? "Cambia lo que necesites. Tu coach verá tus respuestas nuevas." : "Antes de empezar, cuéntame de ti. Con tus respuestas diseño un programa a tu medida y sé qué cuidar desde el día uno."}</p>
      ${st.k === "pending" ? `<div class="note warn"><i></i><span>Tu membresía <b>${esc(planLabel(p))}</b> está pendiente de pago. Mientras, llena tu valoración para que tu coach vaya preparando tu programa.</span></div>`
        : st.k === "active" ? `<div class="note"><i></i><span>Tu membresía <b>${esc(planLabel(p))}</b> está activa.</span></div>` : ""}
      <div class="meta"><div><b>8</b><small>pasos</small></div><div><b>8–10</b><small>minutos</small></div><div><b>1 toque</b><small>casi todo</small></div></div>
    </div>
    <div class="spacer"></div>
    <div class="stack">
      <button class="btn main block" id="start" type="button">${resumable ? "Continuar donde me quedé" : "Empezar"}</button>
      ${resumable ? `<button class="linkbtn" id="restart" type="button" style="align-self:center">Empezar de nuevo</button>` : ""}
    </div>`, "split");
  wireBack(root);
  q("#out", root).onclick = signOut;
  q("#restart", root)?.addEventListener("click", () => { clearDraft(); screenIntake(arg); });
  q("#start", root).onclick = () => {
    const holder = view(``);
    mountForm(holder, {
      answers: startAnswers,
      step: resumable ? draft.step : 0,
      known: [S.client.name, S.client.email, S.client.phone ? `WhatsApp ${S.client.phone}` : ""],
      setProgress: setTide,
      onSave: saveDraft,
      onExit: () => screenIntake(arg),
      onSubmit: submitIntake,
    });
  };
}

async function submitIntake(answers) {
  const an = analyze(answers);
  const res = await sb.from("intake_forms").insert({
    business_id: S.business.id, client_id: S.client.id, form_version: FORM_VERSION, answers,
    safety_light: an.light, pain_zones: an.pain_zones, conditions: an.conditions, wants_meal_plan: an.wants_meal_plan,
    consent_signed_at: new Date().toISOString(),
  });
  if (res.error) throw new Error(errMsg(res.error));
  clearDraft();
  await loadClientData();
  setTide(100);
  const root = view(`
    <div class="topbar"><span class="wordmark">${esc(S.business.name)}</span><span></span></div>
    <div>
      <div class="eyebrow">Valoración enviada</div>
      <h1 class="big">Listo, ${esc(firstName(S.client.name))}</h1>
      <p class="lede">Tu coach ya tiene tus respuestas y con ellas va a armar tu primera rutina.</p>
      <div class="note"><i></i><span>Cuando tu primera rutina esté lista, la vas a ver en tu inicio.</span></div>
    </div>
    <div class="spacer"></div>
    <button class="btn main block" id="home" type="button">Ir a mi inicio</button>`, "split");
  q("#home", root).onclick = () => go("inicio");
}

function screenMyAnswers() {
  const root = view(`
    ${topbar("inicio")}
    <div class="eyebrow">Enviada el ${esc(fmtStamp(S.intake.submitted_at))}</div>
    <h1>Mis respuestas</h1>
    <p class="lede">Esto es lo que ve tu coach. Si algo cambió, actualízalo.</p>
    <div class="answers">${answersHTML(S.intake.answers || {})}</div>
    <button class="btn ghost block" id="edit" type="button" style="margin-top:18px">Actualizar mis respuestas</button>`);
  wireBack(root);
  q("#edit", root).onclick = () => go("valoracion/editar");
}

// ---------------------------------------------------------------------
// Inicio del cliente
// ---------------------------------------------------------------------
function membershipCardHTML(m, { coach = false } = {}) {
  const p = planById(m?.plan_id);
  const st = mState(m);
  const rows = [];
  if (p) rows.push(["Precio", `${money(p.price, p.currency)} · ${CYCLE[p.billing_cycle] || ""}`]);
  if (st.k === "active" || st.k === "expired") {
    if (m.start_date) rows.push(["Desde", fmtDate(m.start_date)]);
    if (m.end_date) rows.push([st.k === "expired" ? "Venció" : "Vence", fmtDate(m.end_date)]);
  }
  if (st.k === "pending" && m?.created_at) rows.push(["La eligió", fmtStamp(m.created_at)]);
  return `<div class="mstat"><b>${esc(planLabel(p))}</b>${pill(st)}</div>
    ${rows.map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join("")}
    ${!coach && st.k === "pending" ? `<p class="small" style="margin-top:8px">Se activa en cuanto tu coach confirme tu pago.</p>` : ""}`;
}

function screenHome() {
  setTide(18);
  const st = mState(S.membership);
  const wa = CONFIG.coachWhatsApp;
  const root = view(`
    <div class="topbar"><span class="wordmark">${esc(S.business.name)}</span><button class="iconbtn" id="out" type="button">Salir</button></div>
    <div class="hello">
      <div class="eyebrow">Tu entrenamiento</div>
      <h1 class="big">Hola, ${esc(firstName(S.client.name))}</h1>
    </div>
    <section class="card">
      <h3>Tu entrenamiento</h3>
      <div class="waiting"><div class="wave">${ICON.wave}</div><div><b>Tu coach está armando tu programa</b><p class="small">Cuando tu primera rutina esté lista, la vas a ver aquí.</p></div></div>
    </section>
    <section class="card">
      <h3>Tu membresía</h3>
      ${membershipCardHTML(S.membership)}
      <div class="actions">
        ${st.k === "pending" && wa ? `<a class="btn wa sm" href="${esc(waLink(wa, payMessage()))}" target="_blank" rel="noopener">${ICON.wa} Pedir datos de pago</a>` : ""}
        ${st.k === "pending" ? `<button class="btn ghost sm" id="change" type="button">Cambiar de membresía</button>` : ""}
        ${st.k === "expired" || st.k === "canceled" ? `<button class="btn main sm" id="renew" type="button">Renovar mi membresía</button>` : ""}
      </div>
    </section>
    <section class="card">
      <h3>Tu valoración</h3>
      <p class="small">Enviada el ${esc(fmtStamp(S.intake.submitted_at))}.</p>
      <div class="actions"><button class="btn ghost sm" id="answers" type="button">Ver mis respuestas</button></div>
    </section>
    ${installCardHTML()}
    ${wa && st.k !== "pending" ? `<a class="btn ghost block" style="margin-top:14px" href="${esc(waLink(wa))}" target="_blank" rel="noopener">${ICON.wa} Escribir a mi coach</a>` : ""}`);
  q("#out", root).onclick = signOut;
  q("#change", root)?.addEventListener("click", () => go("planes"));
  q("#renew", root)?.addEventListener("click", () => go("planes"));
  q("#answers", root).onclick = () => go("mis-respuestas");
  wireInstall(root);
}

// ---------------------------------------------------------------------
// Panel del coach
// ---------------------------------------------------------------------
let coachFilter = "pending";

async function screenCoachList() {
  setTide(0);
  view(`<div class="spinner" role="status" aria-label="Cargando"></div>`, "center");
  let clients, mships, intakes;
  try {
    const b = S.business.id;
    [clients, mships, intakes] = await Promise.all([
      sb.from("clients").select("id,name,email,phone,created_at").eq("business_id", b).order("created_at", { ascending: false }).then(must),
      sb.from("client_memberships").select("id,client_id,plan_id,status,start_date,end_date,created_at").eq("business_id", b).order("created_at", { ascending: false }).then(must),
      sb.from("intake_forms").select("client_id,safety_light,submitted_at").eq("business_id", b).order("submitted_at", { ascending: false }).then(must),
    ]);
  } catch (e) { return screenError(e); }
  const rows = clients.map(c => {
    const m = currentMembership(mships.filter(x => x.client_id === c.id));
    const it = intakes.find(x => x.client_id === c.id);
    return { c, m, st: mState(m), it };
  });
  const counts = { all: rows.length, pending: rows.filter(r => r.st.k === "pending").length, active: rows.filter(r => r.st.k === "active").length };
  if (coachFilter === "pending" && !counts.pending && counts.all) coachFilter = "all";
  const shareMsg = `¡Hola! Para empezar tu entrenamiento conmigo, crea tu cuenta aquí: ${APP_URL}`;
  const root = view(`
    <div class="topbar"><span class="wordmark">${esc(S.business.name)}</span><button class="iconbtn" id="out" type="button">Salir</button></div>
    <div class="eyebrow">Panel del coach</div>
    <h1>Tus clientes</h1>
    <div class="stats"><div><b>${counts.all}</b><small>Clientes</small></div><div><b>${counts.pending}</b><small>Por activar</small></div><div><b>${counts.active}</b><small>Activos</small></div></div>
    <div class="seg" role="group" aria-label="Filtrar">
      <button type="button" data-f="pending" aria-pressed="${coachFilter === "pending"}">Por activar</button>
      <button type="button" data-f="active" aria-pressed="${coachFilter === "active"}">Activos</button>
      <button type="button" data-f="all" aria-pressed="${coachFilter === "all"}">Todos</button>
    </div>
    <div id="list"></div>
    <section class="card" style="margin-top:18px">
      <h3>Tu link para nuevos clientes</h3>
      <div class="share">
        <code>${esc(APP_URL)}</code>
        <div class="row"><button class="btn ghost sm" id="copy" type="button" style="flex:1">Copiar link</button><a class="btn wa sm" style="flex:1" href="${esc(waLink("", shareMsg).replace("https://wa.me/?", "https://wa.me/?"))}" target="_blank" rel="noopener">${ICON.wa} Compartir</a></div>
      </div>
    </section>
    ${installCardHTML()}`, "");
  q("#out", root).onclick = signOut;
  q("#copy", root).onclick = async () => { try { await navigator.clipboard.writeText(APP_URL); toast("Link copiado"); } catch { toast("No se pudo copiar. Mantén presionado el link para copiarlo."); } };
  wireInstall(root);
  const draw = () => {
    const list = rows.filter(r => coachFilter === "all" || r.st.k === coachFilter);
    root.querySelectorAll("[data-f]").forEach(b => b.setAttribute("aria-pressed", b.dataset.f === coachFilter));
    q("#list", root).innerHTML = list.length ? `<ul class="clist">${list.map(({ c, m, st, it }) => `
      <li><button type="button" data-id="${esc(c.id)}">
        <span class="avatar">${esc(initials(c.name))}<i class="light ${it ? esc(it.safety_light || "none") : "none"}" title="${it ? "Valoración enviada" : "Sin valoración"}"></i></span>
        <span class="info"><span class="nm" style="display:block">${esc(c.name)}</span><span class="sub" style="display:block">${esc(planLabel(planById(m?.plan_id)))} · ${it ? "Valoración lista" : "Sin valoración"}</span></span>
        ${pill(st)}
      </button></li>`).join("")}</ul>`
      : `<div class="empty">${counts.all ? (coachFilter === "pending" ? "No hay membresías por activar." : "No hay clientes en esta lista.") : "Aún no tienes clientes. Comparte tu link de abajo para que se registren."}</div>`;
    q("#list", root).querySelectorAll("[data-id]").forEach(b => b.onclick = () => go("cliente/" + b.dataset.id));
  };
  root.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { coachFilter = b.dataset.f; draw(); });
  draw();
}

async function screenCoachClient(id) {
  view(`<div class="spinner" role="status" aria-label="Cargando"></div>`, "center");
  let c, ms, it, pays;
  try {
    [c, ms, it, pays] = await Promise.all([
      sb.from("clients").select("id,name,email,phone,created_at").eq("id", id).maybeSingle().then(must),
      sb.from("client_memberships").select("id,client_id,plan_id,status,start_date,end_date,created_at").eq("client_id", id).order("created_at", { ascending: false }).then(must),
      sb.from("intake_forms").select("id,answers,submitted_at,safety_light").eq("client_id", id).order("submitted_at", { ascending: false }).limit(1).maybeSingle().then(must),
      sb.from("payments").select("id,amount,currency,method,payment_date").eq("client_id", id).order("payment_date", { ascending: false }).limit(10).then(must),
    ]);
  } catch (e) { return screenError(e); }
  if (!c) return go("clientes", true);
  const m = currentMembership(ms);
  const st = mState(m);
  const p = planById(m?.plan_id);
  const wa = waNumber(c.phone);
  const L = it ? LIGHT_TEXT[it.safety_light] : null;
  const root = view(`
    <div class="topbar"><button class="back" type="button" data-back="clientes">${ICON.back}Tus clientes</button><span></span></div>
    <div class="ctop">
      <div><div class="eyebrow">Cliente desde ${esc(fmtStamp(c.created_at))}</div><h1>${esc(c.name)}</h1></div>
      <div class="row">
        ${wa ? `<a class="btn wa sm" href="${esc(waLink(wa, `Hola ${firstName(c.name)}, `))}" target="_blank" rel="noopener">${ICON.wa} WhatsApp</a>` : ""}
        ${c.email ? `<a class="btn ghost sm" href="mailto:${esc(c.email)}">${ICON.mail} Correo</a>` : ""}
      </div>
    </div>
    <div class="vgrid" style="margin-bottom:12px">
      <section class="card">
        <h3>Membresía</h3>
        ${m ? membershipCardHTML(m, { coach: true }) : `<p class="small">Todavía no elige membresía.</p>`}
        ${st.k === "pending" ? `<div class="actions"><button class="btn main" id="activate" type="button">Registrar pago y activar</button></div>` : ""}
      </section>
      <section class="card">
        <h3>Contacto y pagos</h3>
        <div class="kv"><span>WhatsApp</span><span>${esc(c.phone || "—")}</span></div>
        <div class="kv"><span>Correo</span><span style="overflow-wrap:anywhere">${esc(c.email || "—")}</span></div>
        ${pays.length ? pays.map(x => `<div class="kv"><span>${esc(fmtDate(x.payment_date))} · ${esc((METHODS.find(mm => mm[0] === x.method) || [, ""])[1])}</span><span class="mono">${esc(money(x.amount, x.currency))}</span></div>`).join("") : `<div class="kv"><span>Pagos</span><span>Sin pagos registrados</span></div>`}
      </section>
    </div>
    ${it ? coachSummaryHTML(it.answers || {}, { name: null, planLabel: p ? p.name : "", submittedAt: fmtStamp(it.submitted_at) })
      : `<div class="empty">Todavía no llena su valoración. Le aparece en cuanto inicia sesión.</div>`}
    ${L ? `<p class="small" style="margin-top:12px">El semáforo es una sugerencia automática; la decisión siempre es tuya.</p>` : ""}`, "wide");
  wireBack(root);
  q("#activate", root)?.addEventListener("click", () => activateSheet(c, m, p));
}

function activateSheet(c, m, p) {
  const start = todayLocal();
  const months = MONTHS[p?.billing_cycle];
  const end = months ? addMonths(start, months) : null;
  const s = sheet(`
    <h2>Activar membresía</h2>
    <p class="small" style="margin:0 0 16px">${esc(c.name)} · ${esc(planLabel(p))}</p>
    <form class="fields" id="af" novalidate>
      <div class="q"><label for="amount">Monto que recibiste</label><input class="inp" id="amount" name="amount" type="number" inputmode="decimal" min="0" step="1" value="${esc(p ? p.price : "")}"></div>
      <div class="q" role="radiogroup" aria-labelledby="l_m"><div class="ql" id="l_m">¿Cómo te pagó?</div>
        <div class="chips">${METHODS.map(([v, t], i) => `<label class="chip"><input type="radio" name="method" value="${v}" ${i === 0 ? "checked" : ""}><span>${t}</span></label>`).join("")}</div></div>
      <div class="note"><i></i><span>Queda activa desde hoy, ${esc(fmtDate(start))}${end ? `, hasta el ${esc(fmtDate(end))}` : ""}.</span></div>
      <p class="err" id="aerr" role="alert"></p>
      <div class="row"><button class="btn ghost" type="button" id="cancel">Cancelar</button><button class="btn main" type="submit" id="ok" style="flex:1">Activar</button></div>
    </form>`);
  const f = q("#af", s.el), err = q("#aerr", s.el);
  q("#cancel", s.el).onclick = s.close;
  f.onsubmit = async e => {
    e.preventDefault(); err.textContent = "";
    const amount = Number(f.amount.value);
    if (!(amount >= 0) || f.amount.value === "") { err.textContent = "Escribe el monto que recibiste."; return; }
    await busy(q("#ok", s.el), "Activando…", async () => {
      try {
        const upd = must(await sb.from("client_memberships").update({ status: "active", start_date: start, end_date: end }).eq("id", m.id).select("id"));
        if (!upd?.length) throw new Error("No se pudo activar");
        const pay = await sb.from("payments").insert({
          business_id: S.business.id, client_id: c.id, client_membership_id: m.id, amount, currency: p?.currency || "MXN",
          payment_date: start, method: f.method.value, status: "paid", recorded_by: S.member.id,
        });
        s.close();
        toast(pay.error ? "Membresía activada (el pago no se pudo guardar)" : "Membresía activada");
        screenCoachClient(c.id);
      } catch (e2) { err.textContent = errMsg(e2); }
    });
  };
}

// ---------------------------------------------------------------------
// Instalar en el celular
// ---------------------------------------------------------------------
let installPrompt = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; document.querySelectorAll("[data-install]").forEach(b => b.hidden = false); });
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
function installDismissed() { try { return localStorage.getItem("marea-install-dismissed") === "1"; } catch { return false; } }

function installCardHTML() {
  if (isStandalone() || installDismissed()) return "";
  const how = isIOS()
    ? `En Safari, toca el botón <b>Compartir</b> (el cuadro con la flecha hacia arriba) y luego <b>Agregar a inicio</b>.`
    : `Toca el botón de abajo o, en el menú <b>⋮</b> de Chrome, elige <b>Agregar a la pantalla principal</b>.`;
  return `<section class="card" id="install" style="margin-top:12px">
    <h3>Tenla a un toque</h3>
    <p class="small">Agrega ${esc(S.business?.name || "MAREA")} a tu pantalla de inicio y ábrela como cualquier app. ${how}</p>
    <div class="actions" style="flex-direction:row">
      <button class="btn tide sm" type="button" data-install ${installPrompt ? "" : "hidden"} style="flex:1">Instalar app</button>
      <button class="btn ghost sm" type="button" id="install-no">Ahora no</button>
    </div></section>`;
}
function wireInstall(root) {
  q("[data-install]", root)?.addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    installPrompt = null; q("#install", root)?.remove();
  });
  q("#install-no", root)?.addEventListener("click", () => { try { localStorage.setItem("marea-install-dismissed", "1"); } catch { } q("#install", root)?.remove(); });
}

// ---------------------------------------------------------------------
// Aviso de privacidad, errores y salida
// ---------------------------------------------------------------------
function privacyHTML() {
  const contact = CONFIG.privacyEmail ? `escribiendo a <b>${esc(CONFIG.privacyEmail)}</b>` : `escribiéndole a tu coach por WhatsApp o correo`;
  return `<div class="prose">
    <p><b>${esc(CONFIG.legalName || S.business?.name || "MAREA")}</b>, con domicilio en ${esc(CONFIG.legalCity)}, es responsable del uso y protección de tus datos personales.</p>
    <h3>Qué datos pedimos</h3>
    <ul><li>Identificación y contacto: nombre, correo y WhatsApp.</li>
    <li>Datos de salud y hábitos (datos sensibles): condiciones médicas, medicamentos, lesiones, alimentación, sueño y actividad física.</li>
    <li>Datos de tu membresía y pagos.</li></ul>
    <h3>Para qué los usamos</h3>
    <ul><li>Diseñar tu programa de entrenamiento y cuidar tu seguridad al entrenar.</li>
    <li>Dar seguimiento a tu avance.</li>
    <li>Administrar tu membresía y tus pagos.</li></ul>
    <p>De forma secundaria, para ofrecerte servicios relacionados, como la guía de alimentación. Si no quieres esto último, avísanos y lo dejamos de hacer.</p>
    <h3>Con quién se comparten</h3>
    <p>Con nadie más, salvo los proveedores tecnológicos que guardan la información de forma segura para que la app funcione, o cuando una autoridad lo pida por ley. Tu información de salud solo la ve tu coach.</p>
    <h3>Tus derechos</h3>
    <p>Puedes pedir ver, corregir o borrar tus datos, oponerte a su uso o retirar tu consentimiento en cualquier momento ${contact}.</p>
    <h3>Tu consentimiento</h3>
    <p>Al marcar la casilla de tu valoración das tu consentimiento expreso para el uso de tus datos de salud con estos fines. Tu valoración no sustituye una consulta médica.</p>
    <p class="small">Última actualización: 18 de noviembre de 2026.</p></div>`;
}
function screenPrivacy() {
  const root = view(`${topbar(S.user ? home() : "bienvenida")}<h1>Aviso de privacidad</h1>${privacyHTML()}`);
  wireBack(root);
}
// Al corregir un campo, se quita la marca roja y el mensaje de error.
document.addEventListener("input", e => {
  const f = e.target.closest("form#f, form#af");
  if (!f) return;
  e.target.removeAttribute("aria-invalid");
  const err = f.querySelector(".err"); if (err) err.textContent = "";
});
document.addEventListener("click", e => {
  const a = e.target.closest("[data-aviso]");
  if (!a) return;
  e.preventDefault();
  const s = sheet(`<h2>Aviso de privacidad</h2>${privacyHTML()}<button class="btn main block" type="button" id="pclose" style="margin-top:16px">Entendido</button>`);
  q("#pclose", s.el).onclick = s.close;
});

function screenError(e) {
  const msg = errMsg(e);
  const root = view(`
    <div class="topbar"><span class="wordmark">${esc(S.business?.name || "MAREA")}</span><span></span></div>
    <h1>Ups</h1>
    <p class="lede">${esc(msg)}</p>
    <div class="stack"><button class="btn main block" id="retry" type="button">Intentar de nuevo</button>
    ${S.user ? `<button class="btn ghost block" id="out" type="button">Cerrar sesión</button>` : ""}</div>`);
  q("#retry", root).onclick = () => location.reload();
  q("#out", root)?.addEventListener("click", signOut);
}

async function signOut() {
  try { await sb.auth.signOut(); } catch { /* sin red: igual limpiamos */ }
  Object.assign(S, { user: null, member: null, client: null, memberships: [], membership: null, intake: null });
  go("bienvenida", true);
}

// ---------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------
sb.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    recovering = true;
    setTimeout(() => { S.user = session?.user || S.user; go("nueva-clave", true); }, 0);
  }
});

async function boot() {
  try {
    const [, sess] = await Promise.all([loadBusiness(), sb.auth.getSession()]);
    const session = sess.data?.session;
    if (session) { S.user = session.user; if (!recovering) await loadUser(); }
  } catch (e) { return screenError(e); }
  window.addEventListener("hashchange", router);
  router();
}

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => { }));
boot();
