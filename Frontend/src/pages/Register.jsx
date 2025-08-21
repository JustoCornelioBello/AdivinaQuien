// src/pages/Register.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  registerUser,
  isUsernameTaken,
  isEmailTaken,
  loginUser,
} from "../services/auth.js";

const DEBOUNCE = 350;

function useDebounced(value, delay = DEBOUNCE) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function strengthLabel(pw) {
  if (!pw) return "";
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return "Débil";
  if (score === 3) return "Media";
  return "Fuerte";
}

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accept, setAccept] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  // Disponibilidad en vivo (debounced)
  const dUser = useDebounced(username);
  const dEmail = useDebounced(email);

  const [userBusy, setUserBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [userTaken, setUserTaken] = useState(false);
  const [mailTaken, setMailTaken] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!dUser) {
      setUserTaken(false);
      return;
    }
    setUserBusy(true);
    Promise.resolve(isUsernameTaken(dUser))
      .then((taken) => mounted && setUserTaken(taken))
      .finally(() => mounted && setUserBusy(false));
    return () => { mounted = false; };
  }, [dUser]);

  useEffect(() => {
    let mounted = true;
    if (!dEmail) {
      setMailTaken(false);
      return;
    }
    setEmailBusy(true);
    Promise.resolve(isEmailTaken(dEmail))
      .then((taken) => mounted && setMailTaken(taken))
      .finally(() => mounted && setEmailBusy(false));
    return () => { mounted = false; };
  }, [dEmail]);

  const pwStrength = useMemo(() => strengthLabel(password), [password]);

  const canSubmit = useMemo(() => {
    if (loading) return false;
    if (!name || name.trim().length < 2) return false;
    if (!username || username.trim().length < 3) return false;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return false;
    if (!password || password.length < 6) return false;
    if (password !== confirm) return false;
    if (userTaken || mailTaken) return false;
    if (!accept) return false;
    return true;
  }, [name, username, email, password, confirm, userTaken, mailTaken, accept, loading]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    if (!canSubmit) return;

    try {
      setLoading(true);
      // 1) Registramos
      const user = registerUser({ username, email, name, password });

      // 2) Sincronizamos login inmediato para entrar directo
      await loginUser({ identifier: user.username, password });

      // 3) Limpia/normaliza el "perfil global" para que este usuario arranque desde cero
      //    (si ya tienes inicialización en otro sitio, esto es opcional)
      const gw = JSON.parse(localStorage.getItem("gw_user") || "{}");
      localStorage.setItem("gw_user", JSON.stringify({
        ...gw,
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatar: "",
        bio: "¡Hola! Soy nuevo por aquí.",
        badges: [],
        equippedBadge: null,
      }));
      // Limpia progresos y monedas/diamantes si quieres que empiece en 0:
      localStorage.removeItem("gw_xp");
      localStorage.removeItem("gw_weeklyXpMap");
      localStorage.removeItem("gw_coins");
      localStorage.removeItem("gw_diamonds");
      localStorage.removeItem("gw_xpBoostUntil");
      localStorage.removeItem("social_users");          // si prefieres resembrar en tu initSocialData
      localStorage.removeItem("social_followers_" + user.id);
      localStorage.removeItem("social_following_" + user.id);
      localStorage.removeItem("shop_owned_items");
      localStorage.removeItem("shop_premium_badges");
      localStorage.removeItem("gw_streak_shields");

      setOk("¡Cuenta creada! Entrando…");
      // Redirige y recarga para que todos los contextos tomen el nuevo user
      navigate("/");
      window.location.reload();
    } catch (e2) {
      setErr(e2?.message || "No se pudo crear la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <div className="duo-card" style={{ padding: 24 }}>
        <h4 className="mb-2">Crear cuenta</h4>
        <div className="text-muted mb-3">Regístrate para guardar tu progreso, logros y perfil.</div>

        <form onSubmit={onSubmit}>
          <div className="mb-3">
            <label className="form-label">Nombre</label>
            <input
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
            />
            <div className="form-text">Visible públicamente.</div>
          </div>

          <div className="mb-3">
            <label className="form-label">Usuario</label>
            <div className="input-group">
              <span className="input-group-text">@</span>
              <input
                className={`form-control ${userTaken ? "is-invalid" : ""}`}
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))}
                placeholder="tu_usuario"
              />
            </div>
            {userBusy ? (
              <div className="form-text">Comprobando disponibilidad…</div>
            ) : userTaken ? (
              <div className="invalid-feedback d-block">Ese usuario ya existe.</div>
            ) : username ? (
              <div className="form-text text-success">Disponible ✅</div>
            ) : null}
          </div>

          <div className="mb-3">
            <label className="form-label">Correo</label>
            <input
              type="email"
              className={`form-control ${mailTaken ? "is-invalid" : ""}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@dominio.com"
            />
            {emailBusy ? (
              <div className="form-text">Comprobando correo…</div>
            ) : mailTaken ? (
              <div className="invalid-feedback d-block">Ese correo ya está registrado.</div>
            ) : email ? (
              /^\S+@\S+\.\S+$/.test(email) ? (
                <div className="form-text text-success">Válido ✅</div>
              ) : (
                <div className="form-text text-danger">Formato inválido</div>
              )
            ) : null}
          </div>

          <div className="mb-3">
            <label className="form-label">Contraseña</label>
            <div className="input-group">
              <input
                type={showPwd ? "text" : "password"}
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPwd((s) => !s)}>
                {showPwd ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {password ? (
              <div className={`form-text ${pwStrength === "Fuerte" ? "text-success" : pwStrength === "Media" ? "text-warning" : "text-danger"}`}>
                Fortaleza: {pwStrength}
              </div>
            ) : (
              <div className="form-text">Usa mayúsculas, números y símbolos para mayor seguridad.</div>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label">Confirmar contraseña</label>
            <input
              type="password"
              className={`form-control ${confirm && confirm !== password ? "is-invalid" : ""}`}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
            />
            {confirm && confirm !== password ? (
              <div className="invalid-feedback d-block">No coincide con la contraseña.</div>
            ) : null}
          </div>

          <div className="form-check mb-3">
            <input
              id="accept"
              className="form-check-input"
              type="checkbox"
              checked={accept}
              onChange={() => setAccept((s) => !s)}
            />
            <label htmlFor="accept" className="form-check-label">
              Acepto los <Link to="/terminos">Términos</Link> y la <Link to="/privacidad">Política de Privacidad</Link>.
            </label>
          </div>

          {err ? <div className="alert alert-danger py-2">{err}</div> : null}
          {ok ? <div className="alert alert-success py-2">{ok}</div> : null}

          <button type="submit" className="btn btn-duo w-100" disabled={!canSubmit}>
            {loading ? "Creando…" : "Crear cuenta"}
          </button>

          <div className="text-center mt-3 small">
            ¿Ya tienes cuenta?{" "}
            <Link to="/iniciar-sesion" className="text-decoration-none">Inicia sesión</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
