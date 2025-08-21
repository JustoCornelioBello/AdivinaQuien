// src/pages/Login.jsx
import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Modal from "../components/Modal.jsx";
import { findUserByUsernameOrEmail, loginUser } from "../services/auth.js";

export default function Login() {
  const navigate = useNavigate();

  // Paso 1: identificador (usuario o email)
  const [identifier, setIdentifier] = useState("");
  const [idError, setIdError] = useState("");
  const [candidate, setCandidate] = useState(null);

  // Paso 2 (modal): contraseña
  const [openPwd, setOpenPwd] = useState(false);
  const [password, setPassword] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const canContinue = useMemo(() => {
    const v = identifier.trim();
    return v.length >= 3;
  }, [identifier]);

  function validateIdentifier() {
    setIdError("");
    const v = identifier.trim();
    if (!v) return setIdError("Ingresa tu usuario o correo.");
    if (v.length < 3) return setIdError("Debe tener al menos 3 caracteres.");
    const user = findUserByUsernameOrEmail(v);
    if (!user) return setIdError("No encontramos ese usuario.");
    setCandidate(user);
    setOpenPwd(true); // abre modal para contraseña (seguridad extra)
  }

  async function submitLogin(e) {
    e?.preventDefault();
    setPwdError("");
    if (!candidate) return setPwdError("Primero valida tu usuario/correo.");
    if (!password || password.length < 6) return setPwdError("La contraseña debe tener 6+ caracteres.");

    try {
      setLoading(true);
      await loginUser({ identifier: candidate.username, password });
      // Sincronizamos y recargamos para que UserContext y el resto lean gw_user
      setOpenPwd(false);
      setPassword("");
      // Redirige al inicio y fuerza refresco suave
      navigate("/");
      window.location.reload();
    } catch (err) {
      setPwdError(err?.message || "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <div className="duo-card" style={{ padding: 24 }}>
        <h4 className="mb-2">Iniciar sesión</h4>
        <div className="text-muted mb-3">Accede con tu usuario o correo. Luego te pediremos la contraseña en un paso seguro.</div>

        {/* Paso 1 */}
        <div className="mb-3">
          <label className="form-label">Usuario o correo</label>
          <input
            className={`form-control ${idError ? "is-invalid" : ""}`}
            placeholder="tu_usuario o correo@dominio.com"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            onKeyDown={e => (e.key === "Enter" ? validateIdentifier() : null)}
          />
          {idError ? <div className="invalid-feedback">{idError}</div> : null}
        </div>

        <button className="btn btn-duo w-100" disabled={!canContinue} onClick={validateIdentifier}>
          Continuar
        </button>

        <div className="text-center mt-3 small">
          ¿No tienes cuenta?{" "}
          <Link to="/register" className="text-decoration-none">Crear una nueva</Link>
        </div>
      </div>

      {/* Modal contraseña (Paso 2) */}
      <Modal open={openPwd} title={`Hola ${candidate?.name || ""} 👋`} onClose={() => setOpenPwd(false)}>
        <form onSubmit={submitLogin}>
          <div className="mb-2 text-muted small">
            Por seguridad, ingresa tu <strong>contraseña</strong> para completar el acceso.
          </div>

          <div className="mb-3">
            <label className="form-label">Contraseña</label>
            <div className="input-group">
              <input
                type={showPwd ? "text" : "password"}
                className={`form-control ${pwdError ? "is-invalid" : ""}`}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPwd(s => !s)}>
                {showPwd ? "Ocultar" : "Mostrar"}
              </button>
              {pwdError ? <div className="invalid-feedback d-block">{pwdError}</div> : null}
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setOpenPwd(false)} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-duo" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
