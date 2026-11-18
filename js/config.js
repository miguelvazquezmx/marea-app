// =====================================================================
// MAREA · Ajustes de la app
// Estos datos son públicos: van dentro de la app y es seguro tenerlos aquí.
// NUNCA pongas aquí la "secret key" ni la contraseña de la base de datos.
// =====================================================================
export const CONFIG = {
  // Conexión a Supabase (Project URL + Publishable key)
  supabaseUrl: "https://thebmkfysfssupgrfrzy.supabase.co",
  supabaseKey: "sb_publishable_IOfoh5FElNZXu1FQ4dD48w_C_hmR_FM",

  // Tu negocio en la base de datos
  businessSlug: "marea",

  // La app se presenta solo como MAREA (sin nombre del coach).
  // Responsable legal que aparece en el aviso de privacidad (la ley pide nombre y domicilio).
  legalName: "MAREA",
  legalCity: "Playa del Carmen, Quintana Roo",

  // Cobro automático con tarjeta (Stripe). true = aparece el botón "Pagar con tarjeta".
  // Se enciende cuando la función "pagos" ya está en Supabase.
  cardPayments: true,

  // Tu WhatsApp para que los clientes te avisen de su pago.
  // Formato: 52 + tus 10 dígitos, sin espacios. Ej. "529841234567". Vacío = no se muestra el botón.
  coachWhatsApp: "",

  // Correo de contacto para temas de privacidad (aparece en el aviso de privacidad)
  privacyEmail: "",
};
