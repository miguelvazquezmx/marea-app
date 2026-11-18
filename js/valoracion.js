// =====================================================================
// MAREA · Formulario de valoración inicial (versión "general-v1")
// Basado en el prototipo aprobado (marea_formulario_valoracion.html) y en el
// formulario original de resistencia a la insulina.
// =====================================================================
export const FORM_VERSION = "general-v1";

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const FREQ = ["Nunca", "1–2 por semana", "3–5 por semana", "Diario"];
const isWoman = a => a.sexo === "Mujer";
const has = (v, x) => Array.isArray(v) && v.includes(x);
const any = (v, none) => Array.isArray(v) && v.some(x => x !== none);
const hasRI = a => has(a.condiciones, "Resistencia a la insulina o prediabetes") || has(a.condiciones, "Diabetes");

export const STEPS = [
  { t: "Sobre ti", d: "Lo básico para tu expediente. Tu nombre, correo y WhatsApp ya los tenemos de tu registro.", known: true, f: [
    { id: "nacimiento", type: "date", q: "Fecha de nacimiento", req: true },
    { id: "sexo", type: "radio", q: "Sexo", h: "Lo uso para interpretar tus mediciones de composición corporal.", o: ["Mujer", "Hombre", "Prefiero no decir"], req: true },
    { id: "estatura", type: "number", q: "Estatura (cm)", ph: "Ej. 165" },
    { id: "trabajo", type: "radio", q: "En tu trabajo pasas la mayor parte del día…", o: ["Sentado(a)", "De pie o caminando", "Mixto", "Con esfuerzo físico"] },
  ] },
  { t: "Tus objetivos", d: "Lo que quieres lograr y lo que te ha frenado antes.", f: [
    { id: "objetivos", type: "check", max: 3, q: "¿Qué quieres lograr? Elige hasta 3", o: ["Bajar grasa", "Ganar músculo / tonificar", "Ganar fuerza", "Tener más energía", "Mejorar mi salud (glucosa, presión, colesterol)", "Mejorar postura o dolores", "Rendir mejor en un deporte", "Sentirme seguro(a) en el gym"] },
    { id: "prioridad", type: "text", q: "Si solo pudieras lograr una cosa en los próximos 3 meses, ¿cuál sería?", ph: "Ej. bajar 4 kg y dejar de tener dolor de espalda" },
    { id: "por_que", type: "text", q: "¿Por qué ahora? ¿Qué te hizo decidirte a empezar?", ph: "Opcional" },
    { id: "compromiso", type: "scale", q: "¿Qué tan comprometido(a) te sientes hoy?", min: 1, max: 10, lo: "Poco", hi: "Totalmente" },
    { id: "obstaculos", type: "check", q: "¿Qué te ha impedido ser constante antes?", o: ["Falta de tiempo", "Cansancio", "Antojos o ansiedad por comer", "Trabajo o viajes", "Lesiones o dolor", "Me aburro", "No sé qué hacer en el gym", "Nada en especial"], none: "Nada en especial" },
  ] },
  { t: "Seguridad para entrenar", d: "Preguntas basadas en el cuestionario internacional PAR-Q+. Un “sí” no te impide entrenar: solo me dice qué cuidar.", f: [
    { id: "parq", type: "yesno", req: true, items: [
      { id: "p1", t: "¿Algún médico te ha dicho que tienes un problema del corazón o presión arterial alta?", lvl: "r" },
      { id: "p2", t: "¿Sientes dolor en el pecho en reposo, en tus actividades diarias o al hacer ejercicio?", lvl: "r" },
      { id: "p3", t: "¿En los últimos 12 meses has perdido el equilibrio por mareo o has perdido el conocimiento?", lvl: "r" },
      { id: "p4", t: "¿Te han diagnosticado otra condición médica crónica?", lvl: "y" },
      { id: "p5", t: "¿Tomas medicamentos recetados para alguna condición crónica?", lvl: "y" },
      { id: "p6", t: "¿Tienes, o tuviste en los últimos 12 meses, algún problema de huesos, articulaciones o músculos que pueda empeorar con el ejercicio?", lvl: "y" },
      { id: "p7", t: "¿Algún médico te ha dicho que solo debes hacer ejercicio con supervisión médica?", lvl: "r" },
    ] },
    { id: "zonas", type: "check", q: "¿Tienes dolor o alguna lesión?", o: ["Cuello", "Hombros", "Codos o muñecas", "Espalda alta", "Espalda baja", "Cadera", "Rodillas", "Tobillos o pies", "Ninguna"], none: "Ninguna" },
    { id: "zonas_det", type: "textarea", q: "Cuéntame qué pasó o qué movimientos te molestan", show: a => any(a.zonas, "Ninguna") },
    { id: "cirugias", type: "text", q: "Cirugías en los últimos 2 años", ph: "Si no has tenido, déjalo vacío" },
  ] },
  { t: "Tu salud", d: "Me ayuda a entrenarte con seguridad y a coordinarme con tu médico o nutrióloga.", f: [
    { id: "condiciones", type: "check", q: "¿Te han diagnosticado alguna de estas?", o: a => ["Resistencia a la insulina o prediabetes", "Diabetes", "Presión alta", "Colesterol o triglicéridos altos", "Problema de tiroides", "Hígado graso", "Asma", ...(isWoman(a) ? ["Ovario poliquístico (SOP)"] : []), "Otra", "Ninguna"], none: "Ninguna" },
    { id: "condiciones_otra", type: "text", q: "¿Cuál otra?", show: a => has(a.condiciones, "Otra") },
    { id: "ri_quien", type: "radio", q: "¿Quién te diagnosticó la resistencia a la insulina o la diabetes?", o: ["Médico general", "Endocrinólogo(a)", "Nutrióloga(o)", "Salió en estudios, sin consulta"], show: hasRI },
    { id: "ri_cuando", type: "radio", q: "¿Hace cuánto?", o: ["Menos de 6 meses", "6 meses a 1 año", "1 a 3 años", "Más de 3 años"], show: hasRI },
    { id: "medico", type: "text", q: "¿Quién te atiende por esto?", h: "Médico, especialista o nutrióloga. Así no te damos indicaciones encontradas.", show: a => any(a.condiciones, "Ninguna") },
    { id: "familia", type: "check", q: "En tu familia directa (padres, hermanos) hay…", o: ["Diabetes tipo 2", "Enfermedad del corazón", "Presión alta", "Ninguno / no sé"], none: "Ninguno / no sé" },
    { id: "sintomas", type: "check", q: "¿Notas alguno de estos en tu día a día?", o: ["Sueño o cansancio después de comer", "Antojos fuertes de dulce o harinas", "Hambre poco después de comer", "Manchas oscuras en cuello, axilas o codos", "Mareo, temblor o sudor frío si no como", "Ninguno"], none: "Ninguno" },
    { id: "meds", type: "radio", q: "¿Tomas algún medicamento o suplemento?", h: "Incluye metformina, inyectables como Ozempic o Mounjaro, anticonceptivos, proteína o creatina.", o: ["No", "Sí"] },
    { id: "meds_det", type: "text", q: "¿Cuáles y en qué dosis?", show: a => a.meds === "Sí" },
    { id: "estudios", type: "radio", q: "¿Tienes estudios de laboratorio de los últimos 6 meses?", o: ["No", "Sí"] },
    { id: "estudios_cuales", type: "check", q: "¿Cuáles?", o: ["Glucosa en ayunas", "Insulina en ayunas", "Hemoglobina glucosilada (HbA1c)", "Curva de tolerancia a la glucosa", "Colesterol y triglicéridos", "Otros"], show: a => a.estudios === "Sí" },
    { id: "estudios_valores", type: "text", q: "Si tienes los resultados a la mano, escribe los valores", h: "También me los puedes mandar en foto por WhatsApp.", ph: "Ej. glucosa 102, insulina 18, HbA1c 5.8", show: a => a.estudios === "Sí" },
    { id: "embarazo", type: "radio", q: "¿Estás embarazada, lactando o buscando embarazo?", o: ["No", "Sí", "Prefiero platicarlo"], show: isWoman },
    { id: "ciclo", type: "radio", q: "Tu ciclo menstrual es…", h: "Sirve para programar tus mediciones en días comparables.", o: ["Regular", "Irregular", "No menstrúo actualmente", "Prefiero platicarlo"], show: isWoman },
  ] },
  { t: "Tu experiencia", d: "Para saber desde dónde arrancamos.", f: [
    { id: "actual", type: "radio", q: "¿Haces ejercicio actualmente?", o: ["No", "1–2 veces por semana", "3–4 veces por semana", "5 o más"] },
    { id: "pesas", type: "radio", q: "Tu experiencia con pesas y máquinas", o: ["Nunca", "Algo, sin guía", "Menos de 1 año constante", "Más de 1 año constante"] },
    { id: "disfruta", type: "check", q: "¿Qué tipo de ejercicio disfrutas?", o: ["Pesas / gym", "Caminar o correr", "Clases (spinning, baile, funcional)", "Yoga o pilates", "Natación", "Deportes", "Todavía no sé"] },
    { id: "nogusta", type: "text", q: "¿Algún ejercicio que de plano no te guste?" },
    { id: "pasos", type: "radio", q: "¿Cuántos pasos das al día, más o menos?", o: ["No sé", "Menos de 4,000", "4,000–7,000", "7,000–10,000", "Más de 10,000"] },
  ] },
  { t: "Tu agenda", d: "Con esto armo un programa que sí te quepa en la semana.", f: [
    { id: "dias", type: "radio", q: "¿Cuántos días a la semana puedes entrenar?", o: ["2", "3", "4", "5 o más"] },
    { id: "tiempo", type: "radio", q: "¿Cuánto tiempo tienes por sesión?", o: ["30 min", "45 min", "60 min", "90 min"] },
    { id: "lugar", type: "radio", q: "¿Dónde vas a entrenar?", o: ["Gimnasio completo", "Gym básico (condominio u hotel)", "Casa con algo de equipo", "Casa sin equipo", "Al aire libre"] },
    { id: "horario", type: "radio", q: "¿A qué hora prefieres entrenar?", o: ["Temprano (5 a 8 am)", "Media mañana", "Mediodía", "Tarde", "Noche"] },
  ] },
  { t: "Comida y descanso", d: "Sin juicios. Solo necesito una foto real de tu semana.", f: [
    { id: "nutri", type: "radio", q: "¿Llevas plan con nutrióloga(o)?", o: ["Sí", "No", "Tuve, pero lo dejé"] },
    { id: "plan_alim", type: "radio", q: "¿Te interesaría un plan de alimentación?", h: "Opcional. Lo podemos sumar a tu entrenamiento.", o: ["Sí", "Tal vez más adelante", "No"], show: a => a.nutri === "No" || a.nutri === "Tuve, pero lo dejé" },
    { id: "comidas", type: "radio", q: "¿Cuántas veces comes al día?", o: ["1–2", "3", "4", "5 o más"] },
    { id: "proteina", type: "radio", q: "¿Incluyes proteína (huevo, pollo, pescado, carne, lácteos o frijoles) en cada comida?", o: ["Casi siempre", "En algunas", "Casi nunca"] },
    { id: "agua", type: "radio", q: "Agua natural al día", o: ["Menos de 1 L", "1–2 L", "Más de 2 L"] },
    { id: "freq", type: "freq", q: "¿Con qué frecuencia consumes…?", items: [
      { id: "f1", t: "Refresco o bebidas azucaradas" }, { id: "f2", t: "Pan dulce, galletas o postres" }, { id: "f3", t: "Frituras o comida rápida" }, { id: "f4", t: "Alcohol" }] },
    { id: "antojos", type: "radio", q: "¿Te dan antojos o hambre fuerte por la noche?", o: ["Casi nunca", "A veces", "Casi diario"] },
    { id: "alergias", type: "text", q: "Alergias o intolerancias a algún alimento", ph: "Si no tienes, déjalo vacío" },
    { id: "sueno", type: "radio", q: "¿Cuántas horas duermes normalmente?", o: ["Menos de 6", "6–7", "7–8", "Más de 8"] },
    { id: "calidad", type: "scale", q: "Calidad de tu sueño", min: 1, max: 5, lo: "Muy mala", hi: "Excelente" },
    { id: "estres", type: "scale", q: "Nivel de estrés en tu día a día", min: 1, max: 10, lo: "Tranquilo(a)", hi: "Al límite" },
    { id: "tabaco", type: "radio", q: "¿Fumas o vapeas?", o: ["No", "Ocasional", "Diario"] },
  ] },
  { t: "Último paso", d: "Algo más que quieras contarme antes de empezar.", f: [
    { id: "extra", type: "textarea", q: "¿Hay algo más que deba saber antes de empezar?" },
    { id: "consent", type: "consent", req: true, q: "Entiendo que esta información es confidencial, que solo la verá mi coach para diseñar mi programa y que no sustituye una valoración médica. Acepto el aviso de privacidad de MAREA." },
  ] },
];

const opts = (f, A) => typeof f.o === "function" ? f.o(A) : f.o;
const visible = (f, A) => !f.show || f.show(A);

// Quita respuestas de preguntas que ya no aplican (ej. detalle de dolor si eligió "Ninguna").
export function cleanAnswers(A) {
  const out = {};
  for (const st of STEPS) for (const f of st.f) {
    if (!visible(f, A)) continue;
    const v = A[f.id];
    if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) continue;
    if (f.type === "check") { const allowed = opts(f, A); out[f.id] = v.filter(x => allowed.includes(x)); if (!out[f.id].length) delete out[f.id]; }
    else out[f.id] = typeof v === "string" ? v.trim() : v;
  }
  return out;
}

// Semáforo, alertas y columnas para la base de datos.
export function analyze(a) {
  const parq = STEPS[2].f[0];
  const alerts = [];
  parq.items.forEach(it => { if ((a.parq || {})[it.id] === "Sí") alerts.push({ lvl: it.lvl, tag: "PAR-Q", txt: it.t.replace(/^¿|\?$/g, "") + ": sí" }); });
  if (a.embarazo === "Sí") alerts.push({ lvl: "y", tag: "EMBARAZO", txt: "Embarazada, lactando o buscando embarazo" });
  if (any(a.zonas, "Ninguna")) alerts.push({ lvl: "y", tag: "DOLOR", txt: list(a.zonas) + (a.zonas_det ? ` · “${a.zonas_det}”` : "") });
  if (a.cirugias) alerts.push({ lvl: "y", tag: "CIRUGÍA", txt: a.cirugias });
  const conds = (a.condiciones || []).filter(c => c !== "Ninguna" && c !== "Otra");
  if (any(a.condiciones, "Ninguna")) alerts.push({ lvl: "i", tag: "SALUD", txt: [...conds, a.condiciones_otra].filter(Boolean).join(", ") + (a.medico ? ` · le atiende: ${a.medico}` : "") });
  const sint = (a.sintomas || []).filter(s => s !== "Ninguno");
  if (sint.length >= 2 || (sint.length && has(a.familia, "Diabetes tipo 2"))) alerts.push({ lvl: "i", tag: "SEÑALES RI", txt: `${sint.length} señal${sint.length > 1 ? "es" : ""} de resistencia a la insulina: ${sint.join(", ").toLowerCase()}` + (has(a.familia, "Diabetes tipo 2") ? " · diabetes en la familia" : "") });
  if (a.meds === "Sí") alerts.push({ lvl: "i", tag: "MEDS", txt: a.meds_det || "Toma medicamentos o suplementos (sin detalle)" });
  const order = { r: 0, y: 1, i: 2 }; alerts.sort((x, y) => order[x.lvl] - order[y.lvl]);
  const light = alerts.some(x => x.lvl === "r") ? "red" : alerts.some(x => x.lvl === "y") ? "yellow" : "green";
  const meal = { "Sí": "yes", "Tal vez más adelante": "maybe", "No": "no" }[a.plan_alim] || null;
  const conditions = [...conds, ...(a.condiciones_otra ? [a.condiciones_otra] : [])];
  return { alerts, light, pain_zones: (a.zonas || []).filter(z => z !== "Ninguna"), conditions, wants_meal_plan: meal };
}

export const LIGHT_TEXT = {
  red: { c: "r", t: "Pedir visto bueno médico antes de entrenar", s: "Contestó sí a una pregunta clave del PAR-Q+." },
  yellow: { c: "y", t: "Puede entrenar, con cuidados", s: "Revisa las alertas antes de armar su primera rutina." },
  green: { c: "g", t: "Listo(a) para entrenar", s: "Sin alertas de seguridad." },
};

// ---------------------------------------------------------------------
// Formulario paso a paso
// ---------------------------------------------------------------------
function chips(name, list, type, checkedFn) {
  return `<div class="chips">${list.map((o, i) => `<label class="chip"><input type="${type}" name="${esc(name)}" id="${esc(name)}_${i}" value="${esc(o)}" ${checkedFn(o) ? "checked" : ""}><span>${esc(o)}</span></label>`).join("")}</div>`;
}

function field(f, A) {
  const req = f.req ? `<span class="req" aria-hidden="true">*</span>` : "";
  const hint = f.h ? `<div class="hint">${esc(f.h)}</div>` : "";
  const v = A[f.id];
  switch (f.type) {
    case "text": case "number": case "date": {
      const extra = f.type === "number" ? 'inputmode="numeric" min="100" max="230"' : f.type === "date" ? `max="${new Date().toISOString().slice(0, 10)}" min="1920-01-01"` : 'autocomplete="off"';
      return `<div class="q"><label for="${f.id}">${esc(f.q)}${req}</label>${hint}<input class="inp" id="${f.id}" name="${f.id}" type="${f.type}" ${extra} placeholder="${esc(f.ph || "")}" value="${esc(v || "")}"></div>`;
    }
    case "textarea":
      return `<div class="q"><label for="${f.id}">${esc(f.q)}${req}</label>${hint}<textarea class="inp" id="${f.id}" name="${f.id}">${esc(v || "")}</textarea></div>`;
    case "radio":
      return `<div class="q" role="radiogroup" aria-labelledby="l_${f.id}"><div class="ql" id="l_${f.id}">${esc(f.q)}${req}</div>${hint}${chips(f.id, opts(f, A), "radio", o => v === o)}</div>`;
    case "check":
      return `<div class="q" role="group" aria-labelledby="l_${f.id}"><div class="ql" id="l_${f.id}">${esc(f.q)}${req}</div>${hint}${chips(f.id, opts(f, A), "checkbox", o => (v || []).includes(o))}</div>`;
    case "scale": {
      const n = []; for (let i = f.min; i <= f.max; i++) n.push(String(i));
      return `<div class="q" role="radiogroup" aria-labelledby="l_${f.id}"><div class="ql" id="l_${f.id}">${esc(f.q)}</div><div class="scale"><div class="srow">${n.map((o, i) => `<label class="chip"><input type="radio" name="${f.id}" id="${f.id}_${i}" value="${o}" ${v === o ? "checked" : ""}><span>${o}</span></label>`).join("")}</div><div class="ends"><span>${esc(f.lo)}</span><span>${esc(f.hi)}</span></div></div></div>`;
    }
    case "yesno":
      return `<div class="q"><div class="yn">${f.items.map(it => `<div class="item" role="radiogroup" aria-label="${esc(it.t)}"><p>${esc(it.t)}</p>${chips(f.id + "__" + it.id, ["No", "Sí"], "radio", o => (v || {})[it.id] === o)}</div>`).join("")}</div></div>`;
    case "freq":
      return `<div class="q"><div class="ql">${esc(f.q)}</div><div class="freq">${f.items.map(it => `<div class="fi" role="radiogroup" aria-label="${esc(it.t)}"><p>${esc(it.t)}</p>${chips(f.id + "__" + it.id, FREQ, "radio", o => (v || {})[it.id] === o)}</div>`).join("")}</div></div>`;
    case "consent":
      return `<label class="consent" for="${f.id}"><input type="checkbox" id="${f.id}" name="${f.id}" ${v ? "checked" : ""}><span>${esc(f.q)} <a href="#" data-aviso>Leer el aviso</a><span class="req" aria-hidden="true">*</span></span></label>`;
  }
  return "";
}

function ageFrom(d) {
  if (!d) return null;
  const b = new Date(d + "T12:00:00"), n = new Date();
  if (isNaN(b)) return null;
  let a = n.getFullYear() - b.getFullYear();
  const m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
  return a;
}

/**
 * Dibuja el formulario dentro de `root`.
 * opts: { answers, step, known:[...], onSave(answers, step), onSubmit(answers) -> Promise, onExit(), setProgress(pct) }
 */
export function mountForm(root, o) {
  let A = structuredClone(o.answers || {});
  let cur = Math.min(Math.max(o.step || 0, 0), STEPS.length - 1);
  let currentIds = "";
  const total = STEPS.length;

  function render(keepScroll) {
    const pos = window.scrollY;
    const st = STEPS[cur];
    o.setProgress?.(Math.round((cur / total) * 100) + 4);
    const pips = STEPS.map((_, i) => `<i class="${i < cur ? "on" : i === cur ? "now" : ""}"></i>`).join("");
    root.innerHTML = `
      <div class="steptop"><span class="step-count">PASO ${cur + 1} DE ${total}</span><span class="saved">Se guarda solo</span></div>
      <div class="pips" aria-hidden="true">${pips}</div>
      <h1>${esc(st.t)}</h1><p class="lede">${esc(st.d)}</p>
      ${st.known && o.known?.length ? `<div class="known">${o.known.filter(Boolean).map(k => `<span>${esc(k)}</span>`).join("")}</div>` : ""}
      <form class="fields" id="stepform" novalidate>${st.f.filter(f => visible(f, A)).map(f => field(f, A)).join("")}</form>
      <p class="err" id="err" role="alert"></p>
      <div class="nav"><button class="btn ghost" id="back" type="button">Atrás</button><button class="btn main" id="next" type="button" style="flex:1">${cur === total - 1 ? "Enviar a mi coach" : "Siguiente"}</button></div>`;
    currentIds = st.f.filter(f => visible(f, A)).map(x => x.id).join();
    const form = root.querySelector("#stepform");
    form.addEventListener("input", onInput);
    form.addEventListener("change", onInput);
    form.addEventListener("submit", e => e.preventDefault());
    root.querySelector("#back").onclick = () => {
      if (cur === 0) return o.onExit?.();
      cur--; o.onSave?.(A, cur); render(); window.scrollTo(0, 0);
    };
    root.querySelector("#next").onclick = next;
    if (keepScroll) window.scrollTo(0, pos);
  }

  function onInput(e) {
    const el = e.target; if (!el.name) return;
    const st = STEPS[cur];
    const err = root.querySelector("#err");
    el.removeAttribute("aria-invalid");
    if (err.textContent && !err.textContent.startsWith("Elige hasta")) err.textContent = "";
    if (el.name.includes("__")) {
      const [fid, item] = el.name.split("__");
      A[fid] = { ...(A[fid] || {}), [item]: el.value };
    } else {
      const f = st.f.find(x => x.id === el.name); if (!f) return;
      if (f.type === "check") {
        let vals = [...root.querySelectorAll(`input[name="${f.id}"]:checked`)].map(i => i.value);
        if (f.none && el.checked) vals = el.value === f.none ? [f.none] : vals.filter(v => v !== f.none);
        if (f.max && vals.length > f.max) { vals = vals.filter(v => v !== el.value); err.textContent = `Elige hasta ${f.max}.`; }
        else if (err.textContent.startsWith("Elige hasta")) err.textContent = "";
        A[f.id] = vals;
      } else if (f.type === "consent") { A[f.id] = el.checked; }
      else { A[f.id] = el.value; }
      if (f.type === "radio" || f.type === "check") {
        const ids = st.f.filter(x => visible(x, A)).map(x => x.id).join();
        if (ids !== currentIds) { o.onSave?.(A, cur); render(true); return; }
        if (f.type === "check") root.querySelectorAll(`input[name="${f.id}"]`).forEach(i => i.checked = A[f.id].includes(i.value));
      }
    }
    o.onSave?.(A, cur);
  }

  function validate() {
    const st = STEPS[cur];
    for (const f of st.f.filter(x => visible(x, A))) {
      if (f.id === "nacimiento" && A.nacimiento) {
        const age = ageFrom(A.nacimiento);
        if (age === null || age < 12 || age > 100) return { msg: "Revisa tu fecha de nacimiento.", id: f.id };
      }
      if (f.id === "estatura" && A.estatura) {
        const n = Number(A.estatura);
        if (!(n >= 100 && n <= 230)) return { msg: "Escribe tu estatura en centímetros, por ejemplo 165.", id: f.id };
      }
      if (!f.req) continue;
      if (f.type === "yesno" && f.items.some(it => !(A[f.id] || {})[it.id])) return { msg: `Contesta Sí o No en las ${f.items.length} preguntas de seguridad.` };
      if (f.type === "consent" && !A[f.id]) return { msg: "Para enviar, marca la casilla de confidencialidad." };
      if (!["yesno", "consent"].includes(f.type) && !A[f.id]) return { msg: `Falta: ${f.q.toLowerCase()}.`, id: f.id };
    }
    return null;
  }

  async function next() {
    const err = root.querySelector("#err"); err.textContent = "";
    const bad = validate();
    if (bad) {
      err.textContent = bad.msg;
      const el = bad.id && root.querySelector(`[name="${bad.id}"]`);
      if (el) { el.setAttribute("aria-invalid", "true"); el.focus({ preventScroll: true }); el.scrollIntoView({ block: "center", behavior: "smooth" }); }
      return;
    }
    if (cur === total - 1) {
      const btn = root.querySelector("#next");
      btn.disabled = true; btn.innerHTML = `<span class="spin" aria-hidden="true"></span> Enviando…`;
      try { await o.onSubmit(cleanAnswers(A)); }
      catch (e) { btn.disabled = false; btn.textContent = "Enviar a mi coach"; err.textContent = e.message || "No se pudo enviar. Intenta de nuevo."; }
      return;
    }
    cur++; o.onSave?.(A, cur); render(); window.scrollTo(0, 0);
  }

  render();
}

// ---------------------------------------------------------------------
// Vistas de solo lectura
// ---------------------------------------------------------------------
const list = v => Array.isArray(v) ? v.filter(Boolean).join(", ") : (v || "");

function answerText(f, a) {
  const v = a[f.id];
  if (v === undefined || v === "" || v === null) return "";
  if (f.type === "consent") return v ? "Aceptado" : "";
  if (f.type === "yesno" || f.type === "freq") return null; // se muestran por renglón
  if (f.type === "date") return fmtLongDate(v);
  if (f.type === "number" && f.id === "estatura") return `${v} cm`;
  if (f.type === "scale") return `${v} de ${f.max}`;
  return list(v);
}

function fmtLongDate(d) {
  const x = new Date(d + "T12:00:00");
  return isNaN(x) ? d : x.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

// Lo que el cliente ve en "Mis respuestas".
export function answersHTML(a) {
  return STEPS.map(st => {
    const rows = [];
    for (const f of st.f) {
      if (!visible(f, a)) continue;
      if (f.type === "yesno" || f.type === "freq") {
        f.items.forEach(it => { const v = (a[f.id] || {})[it.id]; if (v) rows.push([it.t, v]); });
        continue;
      }
      const t = answerText(f, a);
      if (t) rows.push([f.q.replace(/\s*Elige hasta \d+$/, ""), t]);
    }
    if (!rows.length) return "";
    return `<section class="card"><h3>${esc(st.t)}</h3><dl>${rows.map(([q, v]) => `<dt>${esc(q)}</dt><dd>${esc(v)}</dd>`).join("")}</dl></section>`;
  }).join("");
}

function meter(v, max, good) {
  if (!v) return "—";
  const r = v / max, p = Math.round(r * 100);
  const c = good ? (r >= .6 ? "var(--tide)" : r >= .4 ? "var(--amber)" : "var(--red)") : (r <= .4 ? "var(--tide)" : r <= .7 ? "var(--amber)" : "var(--red)");
  return `<div class="meter"><div class="track"><div class="fill" style="width:${p}%;background:${c}"></div></div><b>${esc(v)}/${max}</b></div>`;
}
const row = (k, v) => v ? `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>` : "";
const dl = body => body.trim() ? `<dl>${body}</dl>` : `<p class="small">Sin respuestas.</p>`;

// Lo que recibe el coach: semáforo, alertas y tarjetas.
export function coachSummaryHTML(a, { name, planLabel, submittedAt }) {
  const { alerts, light } = analyze(a);
  const L = LIGHT_TEXT[light];
  const ag = ageFrom(a.nacimiento);
  const sub = [ag ? `${ag} años` : "", a.sexo && a.sexo !== "Prefiero no decir" ? a.sexo : "", a.estatura ? `${a.estatura} cm` : "", planLabel].filter(Boolean).join(" · ");
  const opp = a.plan_alim === "Sí" ? `<div class="opp"><b>OPORTUNIDAD</b><span>Le interesa un plan de alimentación. Ofréceselo junto con su primera rutina.</span></div>`
    : a.plan_alim === "Tal vez más adelante" ? `<div class="opp maybe"><b>MÁS ADELANTE</b><span>Quizá le interese un plan de alimentación. Vuelve a ofrecérselo en unas semanas.</span></div>` : "";
  const fq = a.freq || {}; const FI = STEPS[6].f.find(f => f.id === "freq").items;
  const labs = a.estudios === "Sí" ? ["Sí", list(a.estudios_cuales), a.estudios_valores].filter(Boolean).join(" · ") : a.estudios;
  return `
    <div class="vhead">
      <div>${name ? `<h2>${esc(name)}</h2>` : `<h2>Valoración inicial</h2>`}<p>${esc(sub)}</p>${submittedAt ? `<p class="small">Valoración enviada el ${esc(submittedAt)}</p>` : ""}</div>
      <div class="slight ${L.c}"><i></i><div>${esc(L.t)}<small>${esc(L.s)}</small></div></div>
    </div>
    ${opp}
    <div class="vgrid">
      <div class="card full"><h3>Alertas para cuidar</h3>${alerts.length ? `<ul class="alist">${alerts.map(x => `<li class="${x.lvl}"><b>${esc(x.tag)}</b><span>${esc(x.txt)}</span></li>`).join("")}</ul>` : `<p class="small">Sin alertas.</p>`}</div>
      <div class="card"><h3>Objetivo</h3>${dl(`${row("Quiere", list(a.objetivos))}${row("Prioridad 3 meses", a.prioridad)}${row("Por qué ahora", a.por_que)}${row("Lo ha frenado", list(a.obstaculos))}<dt>Compromiso</dt><dd>${meter(a.compromiso, 10, true)}</dd>`)}</div>
      <div class="card"><h3>Salud</h3>${dl(`${row("Diagnósticos", list([...(a.condiciones || []).filter(c => c !== "Otra"), a.condiciones_otra].filter(Boolean)))}${row("Diagnosticó", a.ri_quien)}${row("Hace cuánto", a.ri_cuando)}${row("Le atiende", a.medico)}${row("Familia", list(a.familia))}${row("Señales", list(a.sintomas))}${row("Medicamentos", a.meds === "Sí" ? (a.meds_det || "Sí") : a.meds)}${row("Estudios", labs)}${row("Embarazo", a.embarazo)}${row("Ciclo", a.ciclo)}`)}</div>
      <div class="card"><h3>Agenda</h3>${dl(`${row("Días por semana", a.dias)}${row("Tiempo por sesión", a.tiempo)}${row("Dónde", a.lugar)}${row("Horario", a.horario)}`)}</div>
      <div class="card"><h3>Experiencia</h3>${dl(`${row("Hoy", a.actual)}${row("Pesas", a.pesas)}${row("Disfruta", list(a.disfruta))}${row("No le gusta", a.nogusta)}${row("Pasos al día", a.pasos)}${row("Trabajo", a.trabajo)}`)}</div>
      <div class="card"><h3>Comida y descanso</h3>${dl(`${row("Nutrióloga", a.nutri)}${row("Plan de alimentación", a.plan_alim ? "¿Le interesa? " + a.plan_alim : "")}${row("Comidas al día", a.comidas)}${row("Proteína", a.proteina)}${row("Agua", a.agua)}${FI.map(it => row(it.t, fq[it.id])).join("")}${row("Antojos de noche", a.antojos)}${row("Alergias", a.alergias)}${row("Sueño", a.sueno ? `${a.sueno} h` : "")}<dt>Calidad de sueño</dt><dd>${meter(a.calidad, 5, true)}</dd><dt>Estrés</dt><dd>${meter(a.estres, 10, false)}</dd>${row("Tabaco o vape", a.tabaco)}`)}</div>
      <div class="card"><h3>Notas</h3>${dl(`${row("Cirugías", a.cirugias)}${row("Comentarios", a.extra)}${row("Consentimiento", a.consent ? "Firmado" : "")}`)}</div>
    </div>`;
}
