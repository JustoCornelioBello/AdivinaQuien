// src/pages/Settings.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useUser } from "../context/UserContext.jsx";
import {
  FaUserEdit, FaLock, FaUnlockAlt, FaTrash, FaDownload, FaSignInAlt,
  FaShieldAlt, FaUserSecret, FaUser, FaExclamationTriangle, FaSyncAlt,
  FaEnvelopeOpenText, FaInfoCircle, FaQuestionCircle, FaCheckCircle,
  FaPowerOff, FaHistory, FaMobileAlt, FaDesktop, FaKey, FaAt, FaUserTag
} from "react-icons/fa";
import {
  readGlobalStateSnapshot, writeGlobalStateFromSnapshot, saveSnapshotFor,
  loadSnapshotFor, deleteSnapshotFor, resetGlobalStateOnly
} from "../utils/accountState.js";

// -------------------- storage helpers --------------------
const ls = {
  get: (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: (k) => localStorage.removeItem(k),
};

// -------------------- KEYS --------------------
const KEYS = {
  USER: "gw_user",
  PASSWORD: "gw_password",            // compat antiguo (global)
  PRIVACY: "gw_privacy",
  SOCIAL_ME: "social_currentUserId",
  ACCOUNTS: "accounts_list",
  VERIFIED: "gw_verified",
  VERIFY_PENDING: "gw_verify_pending",
  ACTIVITY_LOG: "gw_activity_log",    // [{ts, type, meta}]
  SESSIONS: "gw_sessions",            // [{id, ua, createdAt, lastActive, device}]
  SESSION_CURRENT: "gw_session_current",
  TWOFA_ENABLED: "gw_2fa_enabled",
  TWOFA_SECRET: "gw_2fa_secret",
  TWOFA_LAST_CODE: "gw_2fa_last_code",
  // Cambio correo/usuario (demo)
  PENDING_IDENTITY: "gw_pending_identity", // { email, username, code, ts }
  // PIN Lock
  PIN_VALUE: "gw_pin_value",          // string (no cifrado en demo)
  PIN_SET: "gw_pin_set",              // boolean
  PIN_LOCK_ACTIVE: "gw_pin_lock_active" // boolean
};

// -------- utils
function downloadJSON(obj, filename = "datos.json") {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}
function downloadCSV(rows, filename = "actividad.csv") {
  const csv = rows.map(r => r.map(v => {
    const s = (v ?? "").toString().replace(/"/g, '""');
    return `"${s}"`;
  }).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}
function logActivity(type, meta = {}) {
  const list = ls.get(KEYS.ACTIVITY_LOG, []);
  list.unshift({ ts: Date.now(), type, meta });
  ls.set(KEYS.ACTIVITY_LOG, list.slice(0, 300));
}
function ensureCurrentSession() {
  let sid = ls.get(KEYS.SESSION_CURRENT, null);
  if (!sid) { sid = crypto.randomUUID(); ls.set(KEYS.SESSION_CURRENT, sid); }
  const list = ls.get(KEYS.SESSIONS, []);
  const now = Date.now();
  const ua = navigator.userAgent || "unknown";
  const device = /Mobile|Android|iPhone|iPad/i.test(ua) ? "mobile" : "desktop";
  const idx = list.findIndex(s => s.id === sid);
  if (idx >= 0) list[idx] = { ...list[idx], lastActive: now };
  else list.unshift({ id: sid, ua, device, createdAt: now, lastActive: now });
  ls.set(KEYS.SESSIONS, list);
  return sid;
}
function deviceIcon(device) { return device === "mobile" ? <FaMobileAlt className="me-1" /> : <FaDesktop className="me-1" />; }
function formatDate(ts) { try { return new Date(ts).toLocaleString(); } catch { return String(ts); } }
function passwordStrength(pw = "") {
  let s = 0; if (pw.length >= 6) s++; if (pw.length >= 10) s++; if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++; if (/\d/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 5);
}

export default function Settings() {
  const { user, login, logout, avatarUrl, xp, coins, diamonds, weeklyXp } = useUser();

  // UI tabs
  const [tab, setTab] = useState("profile"); // profile | security | accounts | privacy | help

  // Perfil
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [privacy, setPrivacy] = useState(user?.privacy || ls.get(KEYS.PRIVACY, "public"));

  // Verificación visual
  const [verified] = useState(!!ls.get(KEYS.VERIFIED, false));
  const [verifyPending, setVerifyPending] = useState(!!ls.get(KEYS.VERIFY_PENDING, false));
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");

  // Password
  const savedPass = ls.get(KEYS.PASSWORD, "");
  const [hasPassword, setHasPassword] = useState(!!savedPass);
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const strength = passwordStrength(newPass);

  // 2FA demo
  const [twoFAEnabled, setTwoFAEnabled] = useState(!!ls.get(KEYS.TWOFA_ENABLED, false));
  const [twoFAOpen, setTwoFAOpen] = useState(false);
  const [twoFACodeSent, setTwoFACodeSent] = useState("");
  const [twoFACodeInput, setTwoFACodeInput] = useState("");
  const [twoFAErr, setTwoFAErr] = useState("");

  // Cambio correo/usuario (demo)
  const [idOpen, setIdOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [idCodeInput, setIdCodeInput] = useState("");
  const [idErr, setIdErr] = useState("");

  // PIN Lock
  const [pinSet, setPinSet] = useState(!!ls.get(KEYS.PIN_SET, false));
  const [pinOpen, setPinOpen] = useState(!!ls.get(KEYS.PIN_LOCK_ACTIVE, false)); // si estaba bloqueado, abre modal
  const [pinErr, setPinErr] = useState("");
  const [pinCurrent, setPinCurrent] = useState("");
  const [pinNew, setPinNew] = useState("");
  const [pinNew2, setPinNew2] = useState("");

  // Reporte
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");

  // Confirmaciones
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Cuentas
  const [accounts, setAccounts] = useState(ls.get(KEYS.ACCOUNTS, []));
  const myId = user?.id;

  // Cambiar de cuenta (con contraseña)
  const [switchOpen, setSwitchOpen] = useState(false);
  const [switchTarget, setSwitchTarget] = useState(null);
  const [switchPass, setSwitchPass] = useState("");
  const [switchErr, setSwitchErr] = useState("");

  // Sesiones
  const [sessions, setSessions] = useState(ls.get(KEYS.SESSIONS, []));
  const [currentSessionId, setCurrentSessionId] = useState(ls.get(KEYS.SESSION_CURRENT, null));

  // Helpers
  function getPasswordForAccount(accId, accObj) {
    if (accObj?.password) return String(accObj.password);
    const k = `password_${accId}`;
    const lsPass = ls.get(k, null);
    if (lsPass) return String(lsPass);
    if (user?.id === accId && savedPass) return String(savedPass);
    return null;
  }
  const sortedAccounts = useMemo(() => {
    const list = [...accounts];
    if (myId) {
      const idx = list.findIndex(a => a.id === myId);
      if (idx >= 0) { const [me] = list.splice(idx, 1); list.unshift(me); }
      else if (user) list.unshift({ id: myId, name: user.name, avatar: user.avatar, bio: user.bio, privacy: user.privacy || privacy, email: user.email || "" });
    }
    return list;
  }, [accounts, myId, user, privacy]);

  // Mount
  useEffect(() => {
    setHasPassword(!!ls.get(KEYS.PASSWORD, ""));
    setName(user?.name || "");
    setBio(user?.bio || "");
    setPrivacy(user?.privacy || ls.get(KEYS.PRIVACY, "public"));
  }, [user]);

  useEffect(() => {
    const sid = ensureCurrentSession();
    setCurrentSessionId(sid);
    setSessions(ls.get(KEYS.SESSIONS, []));
  }, []);

  // -------- Perfil
  function saveProfile(e) {
    e.preventDefault();
    if (!user) return;
    const cur = ls.get(KEYS.USER, {}) || {};
    const updated = { ...cur, id: user.id, name, bio, privacy, avatar: avatarUrl || cur.avatar || "", email: cur.email || user.email || "" };
    ls.set(KEYS.USER, updated);

    const list = [...ls.get(KEYS.ACCOUNTS, [])];
    const idx = list.findIndex(a => a.id === user.id);
    if (idx >= 0) list[idx] = { ...list[idx], name, bio, privacy, avatar: updated.avatar };
    else list.unshift({ id: user.id, name, bio, privacy, avatar: updated.avatar, email: updated.email || "" });
    ls.set(KEYS.ACCOUNTS, list);
    setAccounts(list);

    login(name, updated.avatar || "");
    ls.set(KEYS.PRIVACY, privacy);
    logActivity("profile_update", { userId: user.id });
    alert("Perfil actualizado ✅");
  }

  // -------- Password
  function savePassword(e) {
    e.preventDefault();
    const currentStore = getPasswordForAccount(user?.id, accounts.find(a=>a.id===user?.id));
    if (currentStore) {
      if (!curPass) return alert("Ingresa tu contraseña actual.");
      if (String(currentStore || "") !== String(curPass)) return alert("Contraseña actual incorrecta.");
    }
    if (!newPass || newPass.length < 6) return alert("La nueva contraseña debe tener al menos 6 caracteres.");
    if (newPass !== newPass2) return alert("Las contraseñas no coinciden.");

    ls.set(KEYS.PASSWORD, newPass); // compat global
    if (user?.id) {
      localStorage.setItem(`password_${user.id}`, JSON.stringify(newPass));
      const list = [...ls.get(KEYS.ACCOUNTS, [])];
      const idx = list.findIndex(a => a.id === user.id);
      if (idx >= 0) { list[idx] = { ...list[idx], password: newPass }; ls.set(KEYS.ACCOUNTS, list); setAccounts(list); }
    }

    setHasPassword(true);
    setCurPass(""); setNewPass(""); setNewPass2("");
    logActivity("password_change", { userId: user?.id });
    alert("Contraseña actualizada ✅");
  }

  // -------- Snapshot export
  function exportCurrentSnapshot() {
    if (!user?.id) return alert("No hay cuenta activa.");
    const snap = readGlobalStateSnapshot();
    downloadJSON(snap || {}, `snapshot-${user.id}.json`);
  }

  // -------- Progreso reset
  function confirmReset() {
    resetGlobalStateOnly();
    setConfirmResetOpen(false);
    logActivity("progress_reset", { userId: user?.id });
    alert("Progreso reiniciado ✅");
    window.location.reload();
  }

  // -------- Borrar cuenta actual
  function deleteAccount() {
    if (!user) return;
    deleteSnapshotFor(user.id);
    const rest = accounts.filter(a => a.id !== user.id);
    ls.set(KEYS.ACCOUNTS, rest);
    setAccounts(rest);
    ls.del(KEYS.USER); ls.del(KEYS.PASSWORD); ls.del(KEYS.PRIVACY);
    localStorage.setItem(KEYS.SOCIAL_ME, "");
    logActivity("account_deleted", { userId: user.id });
    logout();
    setConfirmDeleteOpen(false);
    alert("Cuenta eliminada ✅");
  }

  // -------- Cambiar de cuenta
  function openSwitchModal(acc) {
    if (!acc || acc.id === myId) return;
    setSwitchTarget(acc); setSwitchPass(""); setSwitchErr(""); setSwitchOpen(true);
  }
  function confirmSwitch() {
    if (!switchTarget) return;
    const stored = getPasswordForAccount(switchTarget.id, switchTarget);
    if (!stored) { setSwitchErr("Esta cuenta no tiene contraseña registrada."); return; }
    if (!switchPass) { setSwitchErr("Ingresa la contraseña."); return; }
    if (String(switchPass) !== String(stored)) { setSwitchErr("Contraseña incorrecta."); return; }

    if (user?.id) saveSnapshotFor(user.id);
    const snap = loadSnapshotFor(switchTarget.id);
    writeGlobalStateFromSnapshot(snap);

    const accountsList = ls.get(KEYS.ACCOUNTS, []);
    const found = accountsList.find(a => a.id === switchTarget.id);
    const updated = {
      id: switchTarget.id,
      name: found?.name || "Usuario",
      avatar: found?.avatar || "",
      bio: found?.bio || "",
      privacy: found?.privacy || "public",
      email: found?.email || ""
    };
    ls.set(KEYS.USER, updated);
    localStorage.setItem(KEYS.SOCIAL_ME, switchTarget.id);
    login(updated.name, updated.avatar || "");
    setSwitchOpen(false);
    logActivity("account_switched", { from: user?.id, to: switchTarget.id });
    alert(`Has cambiado a ${updated.name}`);
    window.location.reload();
  }

  // -------- Sesiones
  function logoutCurrentSession() {
    if (user?.id) saveSnapshotFor(user.id);
    logActivity("logout_current", { sessionId: currentSessionId });
    logout();
    alert("Sesión cerrada ✅");
    window.location.reload();
  }
  function logoutOtherSessions() {
    const list = ls.get(KEYS.SESSIONS, []);
    const filtered = list.filter(s => s.id === currentSessionId);
    ls.set(KEYS.SESSIONS, filtered);
    setSessions(filtered);
    logActivity("logout_others", {});
    alert("Otras sesiones cerradas ✅");
  }
  function logoutAllSessions() {
    ls.set(KEYS.SESSIONS, []);
    ls.del(KEYS.SESSION_CURRENT);
    logActivity("logout_all", {});
    if (user?.id) saveSnapshotFor(user.id);
    logout();
    alert("Todas las sesiones cerradas ✅");
    window.location.reload();
  }

  // -------- 2FA (demo)
  function open2FA() {
    setTwoFAErr("");
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setTwoFACodeSent(code);
    ls.set(KEYS.TWOFA_LAST_CODE, code);
    if (!ls.get(KEYS.TWOFA_SECRET, null)) { ls.set(KEYS.TWOFA_SECRET, crypto.randomUUID()); }
    setTwoFAOpen(true);
  }
  function verify2FA() {
    const last = ls.get(KEYS.TWOFA_LAST_CODE, "");
    if (!twoFACodeInput) return setTwoFAErr("Ingresa el código.");
    if (twoFACodeInput !== last) return setTwoFAErr("Código inválido.");
    ls.set(KEYS.TWOFA_ENABLED, true); setTwoFAEnabled(true);
    setTwoFAOpen(false); setTwoFACodeInput("");
    logActivity("2fa_enabled", {});
    alert("2FA habilitado ✅");
  }
  function disable2FA() {
    if (!confirm("¿Deshabilitar 2FA?")) return;
    ls.set(KEYS.TWOFA_ENABLED, false); setTwoFAEnabled(false);
    logActivity("2fa_disabled", {}); alert("2FA deshabilitado ✅");
  }

  // -------- Cambio correo/usuario (demo verificación)
  function openIdentityModal() {
    setIdErr("");
    const curUser = ls.get(KEYS.USER, {});
    setNewEmail(curUser?.email || "");
    setNewUsername(curUser?.name || name || "");
    setIdOpen(true);
  }
  function sendIdentityCode() {
    // validaciones simples
    if (!newUsername?.trim()) { setIdErr("El nombre de usuario es requerido."); return; }
    if (!/^\S+@\S+\.\S+$/.test(newEmail || "")) { setIdErr("Correo no válido."); return; }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    ls.set(KEYS.PENDING_IDENTITY, { email: newEmail.trim(), username: newUsername.trim(), code, ts: Date.now() });
    setIdErr(`Código enviado (demo): ${code}`); // en producción se enviaría por email
    logActivity("identity_code_sent", {});
  }
  function verifyIdentityChange() {
    const pending = ls.get(KEYS.PENDING_IDENTITY, null);
    if (!pending) { setIdErr("No hay cambios pendientes. Envía el código primero."); return; }
    if (!idCodeInput) { setIdErr("Ingresa el código."); return; }
    if (idCodeInput !== pending.code) { setIdErr("Código incorrecto."); return; }

    // aplicar cambios
    const curUser = ls.get(KEYS.USER, {});
    const updated = { ...curUser, name: pending.username, email: pending.email };
    ls.set(KEYS.USER, updated);

    // actualizar accounts_list
    const list = [...ls.get(KEYS.ACCOUNTS, [])];
    const idx = list.findIndex(a => a.id === updated.id);
    if (idx >= 0) list[idx] = { ...list[idx], name: pending.username, email: pending.email };
    ls.set(KEYS.ACCOUNTS, list);
    setAccounts(list);

    // refrescar UI/ctx
    login(pending.username, updated.avatar || "");
    setName(pending.username);
    setIdOpen(false); setIdErr(""); setIdCodeInput("");
    ls.del(KEYS.PENDING_IDENTITY);
    logActivity("identity_changed", { email: pending.email, username: pending.username });
    alert("Correo/usuario actualizados ✅");
  }

  // -------- Actividad CSV
  function exportActivityCSV() {
    const items = ls.get(KEYS.ACTIVITY_LOG, []);
    const rows = [
      ["timestamp", "fecha_local", "tipo", "meta_json"],
      ...items.map(it => [it.ts, formatDate(it.ts), it.type, JSON.stringify(it.meta || {})])
    ];
    downloadCSV(rows, "actividad.csv");
  }

  // -------- PIN Lock
  function handleSetOrChangePIN(e) {
    e.preventDefault();
    const stored = ls.get(KEYS.PIN_VALUE, "");
    if (stored) {
      if (!pinCurrent) return alert("Ingresa tu PIN actual.");
      if (pinCurrent !== stored) return alert("PIN actual incorrecto.");
    }
    if (!pinNew || pinNew.length < 4 || pinNew.length > 8 || !/^\d+$/.test(pinNew)) {
      return alert("El PIN debe tener 4–8 dígitos.");
    }
    if (pinNew !== pinNew2) return alert("Los PIN no coinciden.");
    ls.set(KEYS.PIN_VALUE, pinNew);
    ls.set(KEYS.PIN_SET, true);
    setPinSet(true);
    setPinCurrent(""); setPinNew(""); setPinNew2("");
    logActivity("pin_set_or_changed", {});
    alert("PIN configurado/actualizado ✅");
  }
  function lockNow() {
    if (!ls.get(KEYS.PIN_SET, false)) return alert("Configura un PIN primero.");
    ls.set(KEYS.PIN_LOCK_ACTIVE, true);
    setPinOpen(true);
    logActivity("pin_locked", {});
  }
  function unlockByPIN(pinInput) {
    const stored = ls.get(KEYS.PIN_VALUE, "");
    if (!stored) { setPinErr("No hay PIN configurado."); return false; }
    if (pinInput !== stored) { setPinErr("PIN incorrecto."); return false; }
    ls.set(KEYS.PIN_LOCK_ACTIVE, false);
    setPinOpen(false); setPinErr("");
    logActivity("pin_unlocked", {});
    return true;
  }

  // -------- Reporte (mailer opcional)
  async function sendReport() {
    try {
      // if (typeof sendReportEmail !== "function") throw new Error("Mailer no configurado");
      // await sendReportEmail({ fromName: user?.name, fromId: user?.id, fromEmail: user?.email || "", message: reportText || "(sin mensaje)" });
      setReportOpen(false); setReportText("");
      logActivity("report_sent", {});
      alert("Reporte enviado ✅ (demo).");
    } catch (err) {
      console.error(err);
      alert("No se pudo enviar el reporte. Revisa EmailJS / .env (ver consola).");
    }
  }

  // -------- Solicitar verificación (badge)
  async function requestVerification() {
    if (verified) return alert("Tu cuenta ya está verificada ✅");
    try {
      // if (typeof sendVerificationEmail !== "function") throw new Error("Mailer no configurado");
      // await sendVerificationEmail({ fromName: user?.name, fromId: user?.id, fromEmail: user?.email || "", message: verifyMsg || "Solicitud de verificación" });
      setVerifyPending(true);
      localStorage.setItem(KEYS.VERIFY_PENDING, JSON.stringify(true));
      setVerifyOpen(false);
      logActivity("verify_requested", {});
      alert("Solicitud enviada ✅ (demo).");
    } catch (err) {
      console.error(err);
      alert("No se pudo enviar la solicitud. Revisa EmailJS / .env (ver consola).");
    }
  }

  // -------- Descargar todo
  function downloadAll() {
    const dump = {};
    for (const k of Object.keys(localStorage)) {
      try { dump[k] = JSON.parse(localStorage.getItem(k)); }
      catch { dump[k] = localStorage.getItem(k); }
    }
    downloadJSON(dump, "guesswho-datos.json");
  }

  return (
    <div className="container">
      {/* HEADER */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <h4 className="mb-0">Ajustes</h4>
        <div className="d-flex align-items-center gap-2">
          <div className="small">
            Estado:&nbsp;
            {verified ? (
              <span className="badge bg-success">
                <FaCheckCircle className="me-1" /> Verificada
              </span>
            ) : verifyPending ? (
              <span className="badge bg-warning text-dark">Pendiente de verificación</span>
            ) : (
              <span className="badge bg-secondary">No verificada</span>
            )}
          </div>
          <button className="btn btn-sm btn-outline-danger" onClick={logoutCurrentSession}>
            <FaPowerOff className="me-1" /> Cerrar sesión
          </button>
        </div>
      </div>

      {/* TABS */}
      <ul className="nav nav-pills mb-3">
        {[
          ["profile","Perfil"],
          ["security","Seguridad"],
          ["accounts","Cuentas"],
          ["privacy","Privacidad & Términos"],
          ["help","Ayuda"]
        ].map(([id,label])=>(
          <li className="nav-item" key={id}>
            <button className={`nav-link ${tab===id?'active':''}`} onClick={()=>setTab(id)}>{label}</button>
          </li>
        ))}
      </ul>

      {/* -------- PROFILE -------- */}
      {tab==="profile" && (
        <div className="row g-3">
          <div className="col-12 col-lg-8">
            <div className="duo-card">
              <div className="d-flex align-items-center gap-2 mb-2"><FaUserEdit/> <h5 className="mb-0">Perfil</h5></div>
              <form onSubmit={saveProfile} className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label small">Nombre</label>
                  <input className="form-control" value={name} onChange={e=>setName(e.target.value)} required />
                </div>
                <div className="col-12">
                  <label className="form-label small">Bio</label>
                  <textarea className="form-control" rows={3} value={bio} onChange={e=>setBio(e.target.value)} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small">Privacidad</label>
                  <div className="d-flex gap-2 flex-wrap">
                    {[
                      ["public","Pública", <FaUser key="i1"/>],
                      ["private","Privada", <FaShieldAlt key="i2"/>],
                      ["anonymous","Anónima", <FaUserSecret key="i3"/>],
                    ].map(([val,lab,ico])=>(
                      <label key={val} className={`btn btn-sm ${privacy===val?'btn-duo':'btn-outline-secondary'}`}>
                        <input type="radio" className="d-none" checked={privacy===val} onChange={()=>setPrivacy(val)} />
                        {ico} {lab}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="col-12 d-flex gap-2">
                  <button className="btn btn-duo"><FaSyncAlt className="me-1"/> Guardar cambios</button>
                  <button type="button" className="btn btn-outline-secondary" onClick={()=>{ setName(user?.name||""); setBio(user?.bio||""); setPrivacy(user?.privacy||"public"); }}>
                    Deshacer
                  </button>
                </div>
              </form>
            </div>

            <div className="duo-card mt-3">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <FaCheckCircle className={verified?"text-success":"text-muted"}/>
                  <h6 className="mb-0">Verificación de cuenta</h6>
                </div>
                {!verified && !verifyPending && (
                  <button className="btn btn-sm btn-duo" onClick={()=>setVerifyOpen(true)}>Solicitar verificación</button>
                )}
              </div>
              <div className="small text-muted mt-1">
                Requisitos sugeridos: nombre real, actividad constante (7+ días), email confirmado, buen comportamiento.
              </div>
            </div>
          </div>

          {/* Resumen + Sesiones rápidas */}
          <div className="col-12 col-lg-4">
            <div className="duo-card">
              <h6 className="mb-2">Resumen</h6>
              <div className="small text-muted">XP total: <strong>{xp}</strong></div>
              <div className="small text-muted">XP semanal: <strong>{weeklyXp}</strong></div>
              <div className="small text-muted">Monedas: <strong>{coins}</strong> · Diamantes: <strong>{diamonds}</strong></div>
              <div className="d-grid mt-2">
                <button className="btn btn-outline-secondary" onClick={exportCurrentSnapshot}><FaDownload className="me-1" /> Exportar snapshot</button>
              </div>
            </div>
            <div className="duo-card mt-3">
              <div className="d-flex align-items-center gap-2 mb-1"><FaHistory/> <h6 className="mb-0">Sesiones</h6></div>
              <div className="d-grid gap-2">
                <button className="btn btn-outline-secondary" onClick={logoutOtherSessions}>Cerrar otras sesiones</button>
                <button className="btn btn-outline-danger" onClick={logoutAllSessions}>Cerrar todas</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------- SECURITY -------- */}
      {tab==="security" && (
        <div className="row g-3">
          <div className="col-12 col-lg-8">
            {/* Contraseña */}
            <div className="duo-card">
              <div className="d-flex align-items-center gap-2 mb-2"><FaLock/><h5 className="mb-0">Seguridad</h5></div>
              <form onSubmit={savePassword} className="row g-3">
                {hasPassword && (
                  <div className="col-12 col-md-6">
                    <label className="form-label small">Contraseña actual</label>
                    <input type="password" className="form-control" value={curPass} onChange={e=>setCurPass(e.target.value)} />
                  </div>
                )}
                <div className="col-12 col-md-6">
                  <label className="form-label small">{hasPassword?"Nueva contraseña":"Crear contraseña"}</label>
                  <input type="password" className="form-control" value={newPass} onChange={e=>setNewPass(e.target.value)} />
                  <div className="form-text">Fortaleza: <strong>{["Muy débil","Débil","Aceptable","Buena","Fuerte","Muy fuerte"][strength]}</strong></div>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small">Repetir nueva contraseña</label>
                  <input type="password" className="form-control" value={newPass2} onChange={e=>setNewPass2(e.target.value)} />
                </div>
                <div className="col-12 d-flex gap-2">
                  <button className="btn btn-duo"><FaUnlockAlt className="me-1"/> {hasPassword?"Cambiar contraseña":"Establecer contraseña"}</button>
                  <button type="button" className="btn btn-outline-danger" onClick={()=>setConfirmDeleteOpen(true)}><FaTrash className="me-1"/> Eliminar cuenta</button>
                </div>
              </form>
            </div>

            {/* Correo y Usuario */}
            <div className="duo-card mt-3">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2"><FaAt/><h6 className="mb-0">Cambio de correo y usuario</h6></div>
                <button className="btn btn-sm btn-duo" onClick={openIdentityModal}>Editar</button>
              </div>
              <div className="small text-muted mt-1">Se requerirá verificación con un código (demo local).</div>
            </div>

            {/* 2FA */}
            <div className="duo-card mt-3">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <FaKey/> <h6 className="mb-0">Autenticación de dos pasos (2FA)</h6>
                </div>
                {twoFAEnabled ? (
                  <button className="btn btn-sm btn-outline-danger" onClick={disable2FA}>Deshabilitar</button>
                ) : (
                  <button className="btn btn-sm btn-duo" onClick={open2FA}>Configurar</button>
                )}
              </div>
              <div className="small text-muted mt-1">Solicita un código adicional al iniciar sesión. (Demo)</div>
            </div>

            {/* PIN Lock */}
            <div className="duo-card mt-3">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2"><FaUserTag/><h6 className="mb-0">Bloqueo rápido por PIN</h6></div>
                <button className="btn btn-sm btn-outline-secondary" onClick={lockNow}>Bloquear ahora</button>
              </div>
              <form onSubmit={handleSetOrChangePIN} className="row g-3 mt-1">
                {pinSet && (
                  <div className="col-12 col-md-4">
                    <label className="form-label small">PIN actual</label>
                    <input type="password" inputMode="numeric" className="form-control" value={pinCurrent} onChange={e=>setPinCurrent(e.target.value)} />
                  </div>
                )}
                <div className="col-12 col-md-4">
                  <label className="form-label small">{pinSet ? "Nuevo PIN" : "Crear PIN"}</label>
                  <input type="password" inputMode="numeric" className="form-control" value={pinNew} onChange={e=>setPinNew(e.target.value)} placeholder="4-8 dígitos" />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label small">Repetir PIN</label>
                  <input type="password" inputMode="numeric" className="form-control" value={pinNew2} onChange={e=>setPinNew2(e.target.value)} />
                </div>
                <div className="col-12">
                  <button className="btn btn-duo">{pinSet ? "Cambiar PIN" : "Configurar PIN"}</button>
                </div>
              </form>
              <div className="small text-muted mt-1">Consejo: usa un PIN que recuerdes, esta demo no cifra el valor.</div>
            </div>

            {/* Historial + CSV */}
            <div className="duo-card mt-3">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2"><FaHistory/> <h6 className="mb-0">Historial de actividad</h6></div>
                <button className="btn btn-sm btn-outline-secondary" onClick={exportActivityCSV}><FaDownload className="me-1" /> CSV</button>
              </div>
              <ActivityLog />
            </div>
          </div>

          {/* Sesiones detalladas */}
          <div className="col-12 col-lg-4">
            <div className="duo-card">
              <div className="d-flex align-items-center gap-2 mb-2"><FaHistory/> <h6 className="mb-0">Sesiones activas</h6></div>
              <div className="small text-muted mb-2">Última actividad y dispositivo.</div>
              <ul className="list-group">
                {sessions.map(s => (
                  <li key={s.id} className="list-group-item d-flex align-items-center justify-content-between">
                    <div className="me-2">
                      <div className="small">{deviceIcon(s.device)} {s.id === currentSessionId ? <strong>Actual</strong> : "Sesión"}</div>
                      <div className="text-muted small">Creada: {formatDate(s.createdAt)}</div>
                      <div className="text-muted small">Última: {formatDate(s.lastActive)}</div>
                    </div>
                    {s.id !== currentSessionId && (
                      <button className="btn btn-sm btn-outline-danger" onClick={()=>{
                        const list = ls.get(KEYS.SESSIONS, []).filter(x=>x.id!==s.id);
                        ls.set(KEYS.SESSIONS, list); setSessions(list); logActivity("logout_specific", { sessionId: s.id });
                      }}>
                        Cerrar
                      </button>
                    )}
                  </li>
                ))}
                {sessions.length===0 && <li className="list-group-item small text-muted">Sin sesiones activas.</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* -------- ACCOUNTS -------- */}
      {tab==="accounts" && (
        <div className="duo-card">
          <div className="d-flex align-items-center justify-content-between">
            <h5 className="mb-0">Administrador de cuentas</h5>
          </div>
          <div className="small text-muted mb-2">Para cambiar de cuenta debes ingresar su contraseña. Las cuentas se crean desde Login/Register.</div>
          <ul className="list-group">
            {sortedAccounts.map(a=>(
              <li key={a.id} className="list-group-item d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <div className="rounded-circle bg-light border overflow-hidden" style={{ width:36, height:36 }}>
                    {a.avatar ? <img src={a.avatar} alt={a.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                      : <FaUser className="text-muted" style={{ fontSize:18 }}/>}
                  </div>
                  <div>
                    <div className="fw-semibold">{a.name}{a.id===myId && <span className="text-muted"> • (actual)</span>}</div>
                    <div className="small text-muted">{a.email || "sin correo"}</div>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  {a.id !== myId ? (
                    <>
                      <button className="btn btn-sm btn-outline-secondary" onClick={()=>openSwitchModal(a)}><FaSignInAlt className="me-1"/> Cambiar</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={()=>removeAccount(a.id)}><FaTrash/></button>
                    </>
                  ) : <span className="badge bg-secondary">Actual</span>}
                </div>
              </li>
            ))}
            {sortedAccounts.length===0 && <li className="list-group-item small text-muted">No hay cuentas guardadas.</li>}
          </ul>

          {/* Zona de riesgo */}
          <div className="mt-3 p-3 border rounded" style={{ borderColor: "rgba(220,53,69,.35)" }}>
            <div className="d-flex align-items-center gap-2 mb-2"><FaExclamationTriangle className="text-danger"/> <strong>Zona de riesgo</strong></div>
            <div className="small text-muted mb-2">Acciones permanentes:</div>
            <button className="btn btn-outline-danger" onClick={()=>setConfirmDeleteOpen(true)}><FaTrash className="me-1" /> Eliminar cuenta actual</button>
          </div>
        </div>
      )}

      {/* -------- PRIVACY -------- */}
      {tab==="privacy" && (
        <div className="row g-3">
          <div className="col-12 col-lg-8">
            <div className="duo-card">
              <div className="d-flex align-items-center gap-2 mb-2"><FaInfoCircle/><h5 className="mb-0">Privacidad & Términos</h5></div>
              <p className="text-muted">
                Guardamos datos en tu navegador para ofrecerte progreso, racha, misiones y preferencias.
                Puedes descargar o borrar tus datos en cualquier momento desde esta pantalla.
              </p>
              <ul>
                <li>Datos locales (localStorage).</li>
                <li>No compartimos tu info sin tu consentimiento.</li>
                <li>Tu perfil puede ser: Público, Privado o Anónimo.</li>
                <li>Consultas legales: <a href="mailto:legal@tuequipo.com">legal@tuequipo.com</a>.</li>
              </ul>
              <div className="d-flex gap-2 flex-wrap">
                <button className="btn btn-outline-secondary" onClick={downloadAll}><FaDownload className="me-1"/> Descargar mis datos</button>
                <button className="btn btn-outline-danger" onClick={()=>setConfirmResetOpen(true)}><FaSyncAlt className="me-1"/> Reiniciar progreso</button>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-4">
            <div className="duo-card">
              <h6 className="mb-2">Estado de verificación</h6>
              <div className="small text-muted">
                {verified ? "Tu cuenta está verificada." : verifyPending ? "Solicitud enviada, en revisión." : "No verificada."}
              </div>
              {!verified && !verifyPending && <button className="btn btn-sm btn-duo mt-2" onClick={()=>setVerifyOpen(true)}>Solicitar verificación</button>}
            </div>
          </div>
        </div>
      )}

      {/* -------- HELP -------- */}
      {tab==="help" && (
        <div className="row g-3">
          <div className="col-12 col-lg-8">
            <div className="duo-card">
              <div className="d-flex align-items-center gap-2 mb-2"><FaQuestionCircle/><h5 className="mb-0">Ayuda & Soporte</h5></div>
              <h6>FAQ</h6>
              <ul className="small">
                <li><strong>¿Cómo recupero vidas?</strong> +1 vida cada 20 minutos hasta 5.</li>
                <li><strong>¿Por qué perdí mi racha?</strong> Juega al menos 1 nivel por día.</li>
                <li><strong>¿Cómo subo de división?</strong> Acumula XP semanal (reinicia los lunes).</li>
                <li><strong>¿Qué trae el cofre?</strong> XP, monedas, diamantes o boost x2 (15m).</li>
              </ul>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary" onClick={()=>setReportOpen(true)}><FaEnvelopeOpenText className="me-1"/> Reportar un problema</button>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className="duo-card">
              <h6 className="mb-2">Buenas prácticas</h6>
              <ul className="small">
                <li>Activa contraseña y no la compartas.</li>
                <li>Mantén tu app actualizada.</li>
                <li>Usa nombres e imágenes adecuados.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Modales ---------------- */}

      {/* Modal Reporte */}
      {reportOpen && (
        <div className="modal-backdrop-custom">
          <div className="modal-card-custom" style={{ maxWidth: 520 }}>
            <div className="d-flex align-items-center gap-2 mb-2"><FaExclamationTriangle className="text-warning" /> <h5 className="mb-0">Reportar un problema</h5></div>
            <textarea className="form-control" rows={6} value={reportText} onChange={(e)=>setReportText(e.target.value)} placeholder="Describe el problema…"/>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-outline-secondary" onClick={()=>setReportOpen(false)}>Cancelar</button>
              <button className="btn btn-duo" onClick={sendReport}>Enviar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm reset */}
      {confirmResetOpen && (
        <div className="modal-backdrop-custom">
          <div className="modal-card-custom" style={{ maxWidth: 460 }}>
            <div className="d-flex align-items-center gap-2 mb-2"><FaSyncAlt /> <h5 className="mb-0">Reiniciar progreso</h5></div>
            <div className="text-muted">Se restablecerán XP, monedas, diamantes, niveles, vidas y misiones. ¿Continuar?</div>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-outline-secondary" onClick={()=>setConfirmResetOpen(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={confirmReset}>Sí, reiniciar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm eliminar cuenta */}
      {confirmDeleteOpen && (
        <div className="modal-backdrop-custom">
          <div className="modal-card-custom" style={{ maxWidth: 460 }}>
            <div className="d-flex align-items-center gap-2 mb-2"><FaTrash className="text-danger" /> <h5 className="mb-0">Eliminar cuenta</h5></div>
            <div className="text-muted">Se eliminará tu cuenta y su snapshot asociado. Esta acción no se puede deshacer.</div>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-outline-secondary" onClick={()=>setConfirmDeleteOpen(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={deleteAccount}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Solicitud de verificación (badge) */}
      {verifyOpen && (
        <div className="modal-backdrop-custom">
          <div className="modal-card-custom" style={{ maxWidth: 520 }}>
            <div className="d-flex align-items-center gap-2 mb-2"><FaCheckCircle className="text-success"/> <h5 className="mb-0">Solicitar verificación</h5></div>
            <div className="small text-muted mb-2">Cuéntanos por qué tu cuenta debe ser verificada (actividad, identidad, relevancia).</div>
            <textarea className="form-control" rows={5} value={verifyMsg} onChange={e=>setVerifyMsg(e.target.value)} placeholder="Motivo de la verificación…" />
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-outline-secondary" onClick={()=>setVerifyOpen(false)}>Cancelar</button>
              <button className="btn btn-duo" onClick={requestVerification}>Enviar solicitud</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2FA */}
      {twoFAOpen && (
        <div className="modal-backdrop-custom">
          <div className="modal-card-custom" style={{ maxWidth: 420 }}>
            <div className="d-flex align-items-center gap-2 mb-2"><FaKey/> <h5 className="mb-0">Verificación en dos pasos</h5></div>
            <div className="small text-muted mb-2">Ingresa el código recibido. (Demo: <code>{twoFACodeSent}</code>)</div>
            <input type="text" inputMode="numeric" className={`form-control ${twoFAErr ? 'is-invalid' : ''}`} placeholder="Código de 6 dígitos"
              value={twoFACodeInput} onChange={(e)=>{ setTwoFACodeInput(e.target.value.trim()); setTwoFAErr(""); }} />
            {twoFAErr && <div className="invalid-feedback">{twoFAErr}</div>}
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-outline-secondary" onClick={()=>setTwoFAOpen(false)}>Cancelar</button>
              <button className="btn btn-duo" onClick={verify2FA}>Verificar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cambio correo/usuario */}
      {idOpen && (
        <div className="modal-backdrop-custom">
          <div className="modal-card-custom" style={{ maxWidth: 520 }}>
            <div className="d-flex align-items-center gap-2 mb-2"><FaAt/> <h5 className="mb-0">Cambiar correo y usuario</h5></div>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label small">Nuevo correo</label>
                <input className="form-control" value={newEmail} onChange={(e)=>{ setNewEmail(e.target.value); setIdErr(""); }} placeholder="tucorreo@dominio.com"/>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small">Nuevo usuario</label>
                <input className="form-control" value={newUsername} onChange={(e)=>{ setNewUsername(e.target.value); setIdErr(""); }} placeholder="Tu nombre público"/>
              </div>
              <div className="col-12 d-flex gap-2">
                <button className="btn btn-outline-secondary" onClick={sendIdentityCode}>Enviar código</button>
                <button className="btn btn-outline-dark" onClick={()=>setIdOpen(false)}>Cerrar</button>
              </div>
              <div className="col-12">
                <label className="form-label small">Código de verificación</label>
                <input className={`form-control ${idErr && !idErr.startsWith("Código enviado") ? 'is-invalid' : ''}`} value={idCodeInput}
                  onChange={(e)=>{ setIdCodeInput(e.target.value); setIdErr(""); }} placeholder="6 dígitos"/>
                {idErr && <div className={`small mt-1 ${idErr.startsWith("Código enviado") ? 'text-success' : 'text-danger'}`}>{idErr}</div>}
              </div>
              <div className="col-12 d-flex justify-content-end">
                <button className="btn btn-duo" onClick={verifyIdentityChange}><FaUserTag className="me-1"/> Aplicar cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal PIN Lock */}
      {pinOpen && (
        <PinLockModal
          onCancel={() => { /* bloqueado: no permitimos cerrar sin PIN */ }}
          onUnlock={(pin) => unlockByPIN(pin)}
          error={pinErr}
          setError={setPinErr}
        />
      )}

      {/* Modal cambio de cuenta con contraseña */}
      {switchOpen && (
        <div className="modal-backdrop-custom">
          <div className="modal-card-custom" style={{ maxWidth: 420 }}>
            <div className="d-flex align-items-center gap-2 mb-2"><FaSignInAlt /> <h5 className="mb-0">Cambiar a {switchTarget?.name}</h5></div>
            <div className="small text-muted mb-2">Ingresa la contraseña de esta cuenta para continuar.</div>
            <input type="password" className={`form-control ${switchErr ? 'is-invalid' : ''}`} placeholder="Contraseña"
              value={switchPass} onChange={(e)=>{ setSwitchPass(e.target.value); setSwitchErr(""); }}/>
            {switchErr && <div className="invalid-feedback">{switchErr}</div>}
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-outline-secondary" onClick={()=>setSwitchOpen(false)}>Cancelar</button>
              <button className="btn btn-duo" onClick={confirmSwitch}>Cambiar</button>
            </div>
            <div className="small text-muted mt-2">¿No tiene contraseña? Ese usuario debe iniciar sesión y crearla en <em>Ajustes &gt; Seguridad</em>.</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Subcomponentes ---------- */
function ActivityLog() {
  const [items, setItems] = useState(ls.get(KEYS.ACTIVITY_LOG, []));
  useEffect(() => {
    const id = setInterval(() => setItems(ls.get(KEYS.ACTIVITY_LOG, [])), 1500);
    return () => clearInterval(id);
  }, []);
  if (!items.length) return <div className="small text-muted">Sin actividad registrada.</div>;
  const mapLabel = (t) => ({
    profile_update: "Actualización de perfil",
    password_change: "Cambio de contraseña",
    progress_reset: "Reinicio de progreso",
    account_deleted: "Cuenta eliminada",
    account_removed: "Cuenta eliminada (otra)",
    account_switched: "Cambio de cuenta",
    report_sent: "Reporte enviado",
    verify_requested: "Solicitud de verificación enviada",
    logout_current: "Cierre de sesión (actual)",
    logout_others: "Cierre de otras sesiones",
    logout_specific: "Cierre de sesión específica",
    logout_all: "Cierre de todas las sesiones",
    "2fa_enabled": "2FA habilitado",
    "2fa_disabled": "2FA deshabilitado",
    identity_code_sent: "Código enviado (identidad)",
    identity_changed: "Correo/usuario cambiados",
    pin_set_or_changed: "PIN configurado/cambiado",
    pin_locked: "Bloqueo por PIN",
    pin_unlocked: "Desbloqueo por PIN",
  }[t] || t);
  return (
    <ul className="list-group">
      {items.map((it, idx) => (
        <li key={idx} className="list-group-item d-flex align-items-center justify-content-between">
          <div>
            <div className="fw-semibold small">{mapLabel(it.type)}</div>
            <div className="text-muted small">{formatDate(it.ts)}</div>
          </div>
          {it.meta?.sessionId && <span className="badge bg-secondary">ID: {it.meta.sessionId}</span>}
        </li>
      ))}
    </ul>
  );
}

function PinLockModal({ onCancel, onUnlock, error, setError }) {
  const [pin, setPin] = useState("");
  useEffect(() => {
    // Si está bloqueado, impedir scroll detrás si tu CSS no lo hace ya
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  return (
    <div className="modal-backdrop-custom">
      <div className="modal-card-custom" style={{ maxWidth: 360 }}>
        <div className="d-flex align-items-center gap-2 mb-2"><FaUserTag/> <h5 className="mb-0">App bloqueada</h5></div>
        <div className="small text-muted mb-2">Ingresa tu PIN para continuar.</div>
        <input
          type="password"
          inputMode="numeric"
          className={`form-control ${error ? 'is-invalid' : ''}`}
          placeholder="PIN"
          value={pin}
          onChange={(e)=>{ setPin(e.target.value); setError(""); }}
        />
        {error && <div className="invalid-feedback">{error}</div>}
        <div className="d-flex justify-content-end gap-2 mt-3">
          {/* No permitimos cancelar cuando está bloqueado */}
          <button className="btn btn-duo" onClick={()=>onUnlock(pin)}>Desbloquear</button>
        </div>
      </div>
    </div>
  );
}
