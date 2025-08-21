import React from "react";
import { NavLink } from "react-router-dom";
import { useUser } from "../context/UserContext.jsx";
import {
  FaBrain,
  FaUser,
  FaGamepad,
  FaTrophy,
  FaShoppingCart,
  FaCog,
  FaSignInAlt,
  FaCoins,
  FaGem,
  FaHome
} from "react-icons/fa";
import { BiRocket } from "react-icons/bi";

export default function Sidebar() {
  const { user, xpLevel, coins, diamonds, hasBoost, avatarUrl } = useUser();

  return (
    <aside className="sidebar d-none d-md-flex flex-column p-3">
      <div className="d-flex align-items-center mb-4">
        <div className="me-2 display-6">
          <FaBrain />
        </div>
        <div>
          <div className="brand h4 mb-0">GuessWho</div>
          <small className="text-muted">by justo bello</small>
        </div>
      </div>

      {user ? (
        <div className="duo-card mb-3">
          <div className="d-flex align-items-center">
            <div className="rounded-circle bg-light d-flex align-items-center justify-content-center border me-3 overflow-hidden" style={{ width: 48, height: 48 }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={user?.name || 'avatar'} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <FaUser className="text-muted" size={24} />
              )}
            </div>
            <div className="flex-grow-1">
              <div className="fw-bold">{user.name}</div>
              <div className="small text-muted">
                Nivel {xpLevel}{" "}
                {hasBoost && (
                  <span className="ms-2 badge bg-success">
                    <BiRocket className="me-1" />
                    x2 XP
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="d-flex gap-2 mt-3">
            <span className="badge bg-warning text-dark">
              <FaCoins className="me-1" /> {coins}
            </span>
            <span className="badge bg-info text-dark">
              <FaGem className="me-1" /> {diamonds}
            </span>
          </div>
        </div>
      ) : (
        <div className="duo-card mb-3">
          <div className="fw-bold mb-1">Bienvenido</div>
          <div className="small text-muted">Inicia sesión para guardar tu progreso.</div>
        </div>
      )}



      <nav className="nav flex-column gap-1">
        <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/">
          <FaHome className="me-2" /> Inicio
        </NavLink>
        <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/perfil">
          <FaUser className="me-2" /> Perfil
        </NavLink>
        <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/juegos/">
          <FaGamepad className="me-2" /> Juegos
        </NavLink>
        <NavLink
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          to="/clasificacion"
        >
          <FaTrophy className="me-2" /> Clasificación
        </NavLink>
        <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/tienda">
          <FaShoppingCart className="me-2" /> Tienda
        </NavLink>
        <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/ajustes">
          <FaCog className="me-2" /> Ajustes
        </NavLink>
        <NavLink
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          to="/iniciar-sesion"
        >
          <FaSignInAlt className="me-2" /> Iniciar sesión
        </NavLink>
      </nav>

      <div className="mt-auto small text-muted">v1.0 •</div>
    </aside>
  );
}
