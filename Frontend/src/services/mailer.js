// src/services/mailer.js
import emailjs from "@emailjs/browser";

// IDs base
const SVC = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Templates (define estos en tu .env con los IDs REALES de EmailJS)
const TPL_REPORT_ADMIN   = import.meta.env.VITE_EMAILJS_TPL_REPORT_ADMIN;
const TPL_REPORT_RECEIPT = import.meta.env.VITE_EMAILJS_TPL_REPORT_RECEIPT;
const TPL_VERIFY_ADMIN   = import.meta.env.VITE_EMAILJS_TPL_VERIFY_ADMIN;   // opcional si quieres separar
const TPL_VERIFY_RECEIPT = import.meta.env.VITE_EMAILJS_TPL_VERIFY_RECEIPT; // opcional si quieres separar

// Si tu template admin NO tiene destinatario fijo, puedes pasar {{to_email}} desde .env
const ADMIN = import.meta.env.VITE_ADMIN_EMAIL || "";

// -------- Debug opcional (quítalo en prod) --------
console.log("ENV check", {
  SVC,
  KEY,
  TPL_REPORT_ADMIN,
  TPL_REPORT_RECEIPT,
  TPL_VERIFY_ADMIN,
  TPL_VERIFY_RECEIPT,
  ADMIN,
});
// --------------------------------------------------

function isPlaceholder(v) {
  return !v || /^tu_|^your_/i.test(v);
}

function assertBaseEnv() {
  const missing = [];
  if (isPlaceholder(SVC)) missing.push("VITE_EMAILJS_SERVICE_ID");
  if (isPlaceholder(KEY)) missing.push("VITE_EMAILJS_PUBLIC_KEY");
  if (missing.length) {
    const msg = `EmailJS no configurado (.env incompleto): ${missing.join(", ")}`;
    console.error(msg);
    throw new Error(msg);
  }
}

function assertReportEnv() {
  const missing = [];
  if (isPlaceholder(TPL_REPORT_ADMIN))   missing.push("VITE_EMAILJS_TPL_REPORT_ADMIN");
  if (isPlaceholder(TPL_REPORT_RECEIPT)) missing.push("VITE_EMAILJS_TPL_REPORT_RECEIPT");
  if (missing.length) {
    const msg = `Templates de reporte incompletos: ${missing.join(", ")}`;
    console.error(msg);
    throw new Error(msg);
  }
}

function assertVerifyEnv() {
  const missing = [];
  if (isPlaceholder(TPL_VERIFY_ADMIN))   missing.push("VITE_EMAILJS_TPL_VERIFY_ADMIN");
  if (isPlaceholder(TPL_VERIFY_RECEIPT)) missing.push("VITE_EMAILJS_TPL_VERIFY_RECEIPT");
  if (missing.length) {
    const msg = `Templates de verificación incompletos: ${missing.join(", ")}`;
    console.error(msg);
    throw new Error(msg);
  }
}

/** Helpers */
function maybeAdminParam(params = {}) {
  // Si tu template admin usa {{to_email}}, pásalo.
  // Si pusiste tu correo fijo directamente en el template, no hace falta.
  return ADMIN ? { to_email: ADMIN, ...params } : params;
}

/* =====================
   RECLAMOS / REPORTES
   ===================== */

/** Enviar reporte al ADMIN */
async function sendReportToAdmin({ name, userId, userEmail, title, message }) {
  assertBaseEnv();
  assertReportEnv();
  const params = maybeAdminParam({
    name: name || "Usuario",
    user_id: userId || "sin-id",
    user_email: userEmail || "",
    title: title || "(sin título)",
    message: message || "(sin mensaje)",
    type: "report",
  });
  const res = await emailjs.send(SVC, TPL_REPORT_ADMIN, params, { publicKey: KEY });
  return res;
}

/** Enviar acuse al USUARIO */
async function sendReportReceiptToUser({ name, userEmail, title }) {
  assertBaseEnv();
  assertReportEnv();
  if (!userEmail) return; // si no tienes email del usuario, omite recibo
  const params = {
    to_email: userEmail,  // tu template debe usar {{to_email}}
    name: name || "User",
    title: title || "(your request)",
  };
  const res = await emailjs.send(SVC, TPL_REPORT_RECEIPT, params, { publicKey: KEY });
  return res;
}

/** Público: envía a admin y al usuario */
export async function sendReportBoth({ name, userId, userEmail, title, message }) {
  try {
    await sendReportToAdmin({ name, userId, userEmail, title, message });
  } catch (e) {
    console.error("EmailJS report ADMIN error:", e?.text || e?.message || e);
    throw e;
  }
  try {
    await sendReportReceiptToUser({ name, userEmail, title });
  } catch (e) {
    // no abortamos si el acuse falla; ya le llegó al admin
    console.warn("EmailJS report RECEIPT warn:", e?.text || e?.message || e);
  }
}

/* =====================
   VERIFICACIÓN DE CUENTA
   ===================== */

/** Enviar solicitud de verificación al ADMIN */
async function sendVerifyToAdmin({ name, userId, userEmail, message }) {
  assertBaseEnv();
  assertVerifyEnv();
  const params = maybeAdminParam({
    name: name || "Usuario",
    user_id: userId || "sin-id",
    user_email: userEmail || "",
    message: message || "Solicitud de verificación",
    type: "verification",
  });
  const res = await emailjs.send(SVC, TPL_VERIFY_ADMIN, params, { publicKey: KEY });
  return res;
}

/** Enviar acuse de verificación al USUARIO */
async function sendVerifyReceiptToUser({ name, userEmail }) {
  assertBaseEnv();
  assertVerifyEnv();
  if (!userEmail) return;
  const params = {
    to_email: userEmail,
    name: name || "User",
  };
  const res = await emailjs.send(SVC, TPL_VERIFY_RECEIPT, params, { publicKey: KEY });
  return res;
}

/** Público: verificación (admin + acuse) */
export async function sendVerificationBoth({ name, userId, userEmail, message }) {
  try {
    await sendVerifyToAdmin({ name, userId, userEmail, message });
  } catch (e) {
    console.error("EmailJS verify ADMIN error:", e?.text || e?.message || e);
    throw e;
  }
  try {
    await sendVerifyReceiptToUser({ name, userEmail });
  } catch (e) {
    console.warn("EmailJS verify RECEIPT warn:", e?.text || e?.message || e);
  }
}
