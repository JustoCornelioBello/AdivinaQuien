// src/pages/Settings.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useUser } from "../context/UserContext.jsx";
import {
  FaUserEdit, FaLock, FaUnlockAlt, FaTrash, FaDownload, FaSignInAlt, FaUserPlus,
  FaShieldAlt, FaUserSecret, FaUser, FaExclamationTriangle, FaSyncAlt,
  FaEnvelopeOpenText, FaInfoCircle, FaQuestionCircle, FaCheckCircle
} from "react-icons/fa";
import {
  readGlobalStateSnapshot, writeGlobalStateFromSnapshot, saveSnapshotFor,
  loadSnapshotFor, initEmptySnapshotFor, deleteSnapshotFor, resetGlobalStateOnly
} from "../utils/accountState.js";

// arriba del archivo:
//import { sendVerificationEmail, sendReportEmail } from "../services/mailer.js";




// storage helpers mínimos
const ls = {
  get: (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: (k) => localStorage.removeItem(k),
};

const KEYS = {
  USER: "gw_user",
  PASSWORD: "gw_password",
  PRIVACY: "gw_privacy",
  SOCIAL_ME: "social_currentUserId",
  SOCIAL_USERS: "social_users",
  ACCOUNTS: "accounts_list",
  VERIFIED: "gw_verified",
  VERIFY_PENDING: "gw_verify_pending",
};

function downloadJSON(obj, filename = "datos.json") {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}

export default function Settings() {
  const {
    user, login, logout, avatarUrl, updateAvatar,
    xp, coins, diamonds, weeklyXp
  } = useUser();

  // UI: pestañas
  const [tab, setTab] = useState("profile"); // profile | security | accounts | privacy | help

  // Perfil básico
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [privacy, setPrivacy] = useState(user?.privacy || ls.get(KEYS.PRIVACY, "public"));

  // Verificación
  const [verified, setVerified] = useState(!!ls.get(KEYS.VERIFIED, false));
  const [verifyPending, setVerifyPending] = useState(!!ls.get(KEYS.VERIFY_PENDING, false));
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");

  // Password (demo local)
  const savedPass = ls.get(KEYS.PASSWORD, "");
  const [hasPassword, setHasPassword] = useState(!!savedPass);
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");

  // Reporte
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");

  // Confirmaciones
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Cuentas
  const [accounts, setAccounts] = useState(ls.get(KEYS.ACCOUNTS, []));
  const myId = user?.id;

  const sortedAccounts = useMemo(() => {
    const list = [...accounts];
    if (myId) {
      const idx = list.findIndex(a => a.id === myId);
      if (idx >= 0) { const [me] = list.splice(idx, 1); list.unshift(me); }
      else if (user) list.unshift({ id: myId, name: user.name, avatar: user.avatar, bio: user.bio, privacy: user.privacy || privacy });
    }
    return list;
  }, [accounts, myId, user, privacy]);

  useEffect(() => { setHasPassword(!!ls.get(KEYS.PASSWORD, "")); }, []);
  useEffect(() => { setName(user?.name || ""); setBio(user?.bio || ""); setPrivacy(user?.privacy || ls.get(KEYS.PRIVACY, "public")); }, [user]);

  /** --- Guardar perfil --- */
  function saveProfile(e) {
    e.preventDefault();
    if (!user) return;
    const cur = ls.get(KEYS.USER, {}) || {};
    const updated = { ...cur, id: user.id, name, bio, privacy, avatar: avatarUrl || cur.avatar || "" };
    ls.set(KEYS.USER, updated);
    // actualiza cuentas
    const list = [...ls.get(KEYS.ACCOUNTS, [])];
    const idx = list.findIndex(a => a.id === user.id);
    if (idx >= 0) list[idx] = { ...list[idx], name, bio, privacy, avatar: updated.avatar };
    else list.unshift({ id: user.id, name, bio, privacy, avatar: updated.avatar });
    ls.set(KEYS.ACCOUNTS, list);
    setAccounts(list);
    // refresca contexto
    login(name, updated.avatar || "");
    ls.set(KEYS.PRIVACY, privacy);
    alert("Perfil actualizado ✅");
  }

  /** --- Password --- */
  function savePassword(e) {
    e.preventDefault();
    if (hasPassword) {
      if (!curPass) return alert("Ingresa tu contraseña actual.");
      if (String(savedPass) !== String(curPass)) return alert("Contraseña actual incorrecta.");
    }
    if (!newPass || newPass.length < 6) return alert("La nueva contraseña debe tener al menos 6 caracteres.");
    if (newPass !== newPass2) return alert("Las contraseñas no coinciden.");
    ls.set(KEYS.PASSWORD, newPass);
    setHasPassword(true); setCurPass(""); setNewPass(""); setNewPass2("");
    alert("Contraseña actualizada ✅");
  }

  /** --- Reiniciar progreso (solo estado global, mantiene cuenta) --- */
  function confirmReset() {
    resetGlobalStateOnly(); // deja todo 0 para ESTA cuenta
    setConfirmResetOpen(false);
    alert("Progreso reiniciado ✅");
    window.location.reload();
  }

  /** --- Eliminar cuenta actual (borra snapshot + entrada en cuentas) --- */
  function deleteAccount() {
    if (!user) return;
    // borra snapshot de esta cuenta
    deleteSnapshotFor(user.id);
    // borra de listado
    const rest = accounts.filter(a => a.id !== user.id);
    ls.set(KEYS.ACCOUNTS, rest);
    setAccounts(rest);
    // suelta usuario actual
    ls.del(KEYS.USER);
    ls.del(KEYS.PASSWORD);
    ls.del(KEYS.PRIVACY);
    localStorage.setItem(KEYS.SOCIAL_ME, "");
    logout();
    setConfirmDeleteOpen(false);
    alert("Cuenta eliminada ✅");
  }

  /** --- Crear nueva cuenta (snapshot vacío) --- */
  function createAccount() {
    const n = prompt("Nombre para la nueva cuenta:");
    if (!n) return;
    const id = crypto.randomUUID();
    const entry = { id, name: n, avatar: "", bio: "", privacy: "public" };
    const list = [entry, ...ls.get(KEYS.ACCOUNTS, [])];
    ls.set(KEYS.ACCOUNTS, list);
    setAccounts(list);
    initEmptySnapshotFor(id); // 👈 progreso 0
    alert("Cuenta creada ✅");
  }

  /** --- Cambiar a otra cuenta (cambio LIMPIO con snapshot por cuenta) --- */
  function switchTo(id) {
    if (!id) return;
    // 1) guarda snapshot de la cuenta actual
    if (user?.id) saveSnapshotFor(user.id);
    // 2) carga snapshot de la cuenta destino (o vacío)
    const snap = loadSnapshotFor(id);
    writeGlobalStateFromSnapshot(snap); // si no existe, deja todo 0
    // 3) actualiza gw_user y social_currentUserId
    const accountsList = ls.get(KEYS.ACCOUNTS, []);
    const found = accountsList.find(a => a.id === id);
    const updated = { id, name: found?.name || "Usuario", avatar: found?.avatar || "", bio: found?.bio || "", privacy: found?.privacy || "public" };
    ls.set(KEYS.USER, updated);
    localStorage.setItem(KEYS.SOCIAL_ME, id);
    // 4) inicia sesión en contexto
    login(updated.name, updated.avatar || "");
    alert(`Has cambiado a ${updated.name}`);
    window.location.reload(); // asegura que todo quede sincronizado
  }

  /** --- Eliminar otra cuenta (si no es la actual) --- */
  function removeAccount(id) {
    if (user?.id === id) return alert("Usa 'Eliminar cuenta' para borrar la actual.");
    if (!confirm("¿Eliminar esta cuenta?")) return;
    const rest = accounts.filter(a => a.id !== id);
    ls.set(KEYS.ACCOUNTS, rest);
    setAccounts(rest);
    deleteSnapshotFor(id);
    alert("Cuenta eliminada ✅");
  }

  /** --- Descargar todos los datos --- */
  function downloadAll() {
    const dump = {};
    for (const k of Object.keys(localStorage)) {
      try { dump[k] = JSON.parse(localStorage.getItem(k)); }
      catch { dump[k] = localStorage.getItem(k); }
    }
    downloadJSON(dump, "guesswho-datos.json");
  }

  // Verificación
async function requestVerification() {
  if (verified) return alert("Tu cuenta ya está verificada ✅");
  try {
    await sendVerificationEmail({
      fromName: user?.name,
      fromId: user?.id,
      fromEmail: user?.email || "",   // si tienes email del usuario
      message: verifyMsg || "Solicitud de verificación",
    });
    setVerifyPending(true);
    localStorage.setItem("gw_verify_pending", JSON.stringify(true));
    setVerifyOpen(false);
    alert("Solicitud enviada ✅. Te contactaremos por correo.");
  } catch (err) {
    alert("No se pudo enviar la solicitud. Revisa EmailJS / .env (consola para detalles).");
  }
} 

// Reporte
async function sendReport() {
  try {
    await sendReportEmail({
      fromName: user?.name,
      fromId: user?.id,
      fromEmail: user?.email || "",
      message: reportText || "(sin mensaje)",
    });
    setReportOpen(false);
    setReportText("");
    alert("Reporte enviado ✅. ¡Gracias!");
  } catch (err) {
    alert("No se pudo enviar el reporte. Revisa EmailJS / .env (consola para detalles).");
  }
}



  return (
    <div className="container">
      {/* HEADER */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
        <h4 className="mb-0">Ajustes</h4>
        <div className="small text-muted">
          Estado: {verified ? <span className="text-success"><FaCheckCircle className="me-1"/>Verificada</span>
            : verifyPending ? <span className="text-warning">Pendiente de verificación</span>
            : <span className="text-secondary">No verificada</span>}
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

      {tab==="profile" && (
        <div className="row g-3">
          <div className="col-12 col-lg-8">
            <div className="duo-card">
              <div className="d-flex align-items-center gap-2 mb-2">
                <FaUserEdit/> <h5 className="mb-0">Perfil</h5>
              </div>
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
                Requisitos sugeridos: nombre real, actividad constante (7+ días de racha), email confirmado, comportamiento responsable.
              </div>
            </div>
          </div>

          {/* Resumen */}
          <div className="col-12 col-lg-4">
            <div className="duo-card">
              <h6 className="mb-2">Resumen</h6>
              <div className="small text-muted">XP total: <strong>{xp}</strong></div>
              <div className="small text-muted">XP semanal: <strong>{weeklyXp}</strong></div>
              <div className="small text-muted">Monedas: <strong>{coins}</strong> · Diamantes: <strong>{diamonds}</strong></div>
            </div>
          </div>
        </div>
      )}

      {tab==="security" && (
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
      )}

      {tab==="accounts" && (
        <div className="duo-card">
          <div className="d-flex align-items-center justify-content-between">
            <h5 className="mb-0">Administrador de cuentas</h5>
            <button className="btn btn-sm btn-duo" onClick={createAccount}><FaUserPlus className="me-1"/> Nueva</button>
          </div>
          <div className="small text-muted mb-2">
            Al cambiar de cuenta, tu progreso y estadísticas se cargan desde su propio snapshot (o quedan en 0 si es nueva).
          </div>
          <ul className="list-group">
            {sortedAccounts.map(a=>(
              <li key={a.id} className="list-group-item d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <div className="rounded-circle bg-light border overflow-hidden" style={{ width:36, height:36 }}>
                    {a.avatar ? <img src={a.avatar} alt={a.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                      : <FaUser className="text-muted" style={{ fontSize:18 }}/>}
                  </div>
                  <div>
                    <div className="fw-semibold">{a.name}{a.id===myId && " • (actual)"}</div>
                    <div className="small text-muted">{a.privacy || "public"}</div>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  {a.id !== myId && (
                    <>
                      <button className="btn btn-sm btn-outline-secondary" onClick={()=>switchTo(a.id)}><FaSignInAlt className="me-1"/> Usar</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={()=>removeAccount(a.id)}><FaTrash/></button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab==="privacy" && (
        <div className="row g-3">
          <div className="col-12 col-lg-8">
            <div className="duo-card">
              <div className="d-flex align-items-center gap-2 mb-2"><FaInfoCircle/><h5 className="mb-0">Privacidad & Términos</h5></div>
              <p className="text-muted">
                Al usar GuessWho aceptas nuestros términos. Recopilamos datos locales (en tu navegador) para brindar experiencia de juego:
                progreso, racha, misiones y preferencias. Puedes descargar o borrar tus datos en cualquier momento desde esta pantalla.
              </p>
              <ul>
                <li>Datos almacenados localmente (localStorage).</li>
                <li>No compartimos tu información sin tu consentimiento.</li>
                <li>Puedes poner tu cuenta como Pública, Privada o Anónima.</li>
                <li>Para consultas legales: <a href="mailto:legal@tuequipo.com">legal@tuequipo.com</a>.</li>
              </ul>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary" onClick={downloadAll}><FaDownload className="me-1"/> Descargar mis datos</button>
                <button className="btn btn-outline-danger" onClick={()=>setConfirmResetOpen(true)}><FaSyncAlt className="me-1"/> Reiniciar progreso</button>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-4">
            <div className="duo-card">
              <h6>Estado de verificación</h6>
              <div className="small text-muted">
                {verified ? "Tu cuenta está verificada." : verifyPending ? "Solicitud enviada, en revisión." : "No verificada."}
              </div>
              {!verified && !verifyPending && <button className="btn btn-sm btn-duo mt-2" onClick={()=>setVerifyOpen(true)}>Solicitar verificación</button>}
            </div>
          </div>
        </div>
      )}

      {tab==="help" && (
        <div className="row g-3">
          <div className="col-12 col-lg-8">
            <div className="duo-card">
              <div className="d-flex align-items-center gap-2 mb-2"><FaQuestionCircle/><h5 className="mb-0">Ayuda & Soporte</h5></div>
              <h6>FAQ</h6>
              <ul className="small">
                <li><strong>¿Cómo recupero vidas?</strong> +1 vida cada 20 minutos hasta 5.</li>
                <li><strong>¿Por qué perdí mi racha?</strong> Debes jugar al menos 1 nivel por día.</li>
                <li><strong>¿Cómo subo de división?</strong> Acumula XP semanal (reinicia los lunes).</li>
                <li><strong>¿Qué trae el cofre?</strong> XP, monedas, diamantes o boost x2 (15m).</li>
              </ul>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary" onClick={()=>setReportOpen(true)}>
                  <FaEnvelopeOpenText className="me-1"/> Reportar un problema
                </button>
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

      {/* Modal Reporte */}
      {reportOpen && (
        <div className="modal-backdrop-custom">
          <div className="modal-card-custom" style={{ maxWidth: 520 }}>
            <div className="d-flex align-items-center gap-2 mb-2">
              <FaExclamationTriangle className="text-warning" /> <h5 className="mb-0">Reportar un problema</h5>
            </div>
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
            <div className="d-flex align-items-center gap-2 mb-2">
              <FaSyncAlt /> <h5 className="mb-0">Reiniciar progreso</h5>
            </div>
            <div className="text-muted">
              Restablecerá XP, monedas, diamantes, niveles, vidas, misiones. ¿Continuar?
            </div>
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
            <div className="d-flex align-items-center gap-2 mb-2">
              <FaTrash className="text-danger" /> <h5 className="mb-0">Eliminar cuenta</h5>
            </div>
            <div className="text-muted">
              Se eliminará tu cuenta y su snapshot asociado. Esta acción no se puede deshacer.
            </div>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-outline-secondary" onClick={()=>setConfirmDeleteOpen(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={deleteAccount}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Solicitud de verificación */}
      {verifyOpen && (
        <div className="modal-backdrop-custom">
          <div className="modal-card-custom" style={{ maxWidth: 520 }}>
            <div className="d-flex align-items-center gap-2 mb-2">
              <FaCheckCircle className="text-success"/> <h5 className="mb-0">Solicitar verificación</h5>
            </div>
            <div className="small text-muted mb-2">
              Cuéntanos por qué tu cuenta debe ser verificada (actividad, identidad, relevancia).
            </div>
            <textarea className="form-control" rows={5} value={verifyMsg} onChange={e=>setVerifyMsg(e.target.value)} placeholder="Motivo de la verificación…" />
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-outline-secondary" onClick={()=>setVerifyOpen(false)}>Cancelar</button>
              <button className="btn btn-duo" onClick={requestVerification}>Enviar solicitud</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
