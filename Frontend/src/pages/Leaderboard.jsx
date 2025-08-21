// src/pages/Leaderboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  initSocialData,
  getAllUsers,
  getMe,
} from "../services/social.js";
import {
  FaTrophy,
  FaCrown,
  FaMedal,
  FaGem,
  FaStar,
  FaClock,
} from "react-icons/fa";
import "./leaderboard.css";

/* ---------------- Divisiones (todos comienzan en Bronze) ---------------- */
export const DIVISIONS = [
  { name: "Bronze", min: 0 },
  { name: "Silver", min: 800 },
  { name: "Gold", min: 1600 },
  { name: "Platinum", min: 2800 },
  { name: "Diamond", min: 4200 },
  { name: "Champions", min: 6000 },
];

const DIV_ICONS = {
  Bronze: <FaMedal className="trophy bronze" />,
  Silver: <FaMedal className="trophy silver" />,
  Gold: <FaTrophy className="trophy gold" />,
  Platinum: <FaGem className="trophy platinum" />,
  Diamond: <FaGem className="trophy diamond" />,
  Champions: <FaCrown className="trophy champions" />,
};

function divisionFor(weeklyXp) {
  let cur = DIVISIONS[0];
  for (const d of DIVISIONS) if (weeklyXp >= d.min) cur = d;
  return cur.name;
}

function inDivision(weeklyXp, divName) {
  const idx = DIVISIONS.findIndex((d) => d.name === divName);
  if (idx < 0) return false;
  const min = DIVISIONS[idx].min;
  const next = DIVISIONS[idx + 1];
  const max = next ? next.min - 1 : Infinity;
  return weeklyXp >= min && weeklyXp <= max;
}

function msUntilNextSunday() {
  const now = new Date();
  const day = now.getDay(); // 0 = domingo
  const daysToSun = (7 - day) % 7; // si hoy es domingo => 0
  const next = new Date(now);
  next.setDate(now.getDate() + (daysToSun === 0 ? 7 : daysToSun));
  next.setHours(0, 0, 0, 0);
  return next.getTime() - now.getTime();
}

function formatCountdown(ms) {
  if (ms <= 0) return "0d 00:00:00";
  let s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
}

/* ------- Snapshot de orden previo por división (para “asc/desc”) ------ */
const SNAP_KEY = (divName) => `lb_last_order_${divName}`;
function getLastOrder(divName) {
  try {
    const raw = localStorage.getItem(SNAP_KEY(divName));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function setLastOrder(divName, ids) {
  try {
    localStorage.setItem(SNAP_KEY(divName), JSON.stringify(ids));
  } catch {}
}

/* -------------------- Componente -------------------- */
export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [divTab, setDivTab] = useState("Bronze");
  const [countdown, setCountdown] = useState(msUntilNextSunday());

  useEffect(() => {
    initSocialData();
    const all = getAllUsers() || [];
    const cur = getMe() || null;
    setUsers(all);
    setMe(cur);

    const myDiv = cur ? divisionFor(cur.stats.weeklyXp) : "Bronze";
    setDivTab(myDiv);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCountdown(msUntilNextSunday()), 1000);
    return () => clearInterval(t);
  }, []);

  const divList = useMemo(() => DIVISIONS.map((d) => d.name), []);
  const myDivision = useMemo(
    () => (me ? divisionFor(me.stats.weeklyXp) : "Bronze"),
    [me]
  );
  const myDivIndex = useMemo(
    () => DIVISIONS.findIndex((d) => d.name === myDivision),
    [myDivision]
  );

  // Usuarios dentro de la división activa (orden por XP desc)
  const inThisDivision = useMemo(() => {
    return users
      .filter((u) => inDivision(u.stats.weeklyXp, divTab))
      .sort((a, b) => b.stats.weeklyXp - a.stats.weeklyXp);
  }, [users, divTab]);

  // Snapshot anterior y mapa de movimiento (up/down/same)
  const lastOrder = useMemo(() => getLastOrder(divTab), [divTab]);

  const movementMap = useMemo(() => {
    if (!lastOrder || !lastOrder.length) return {};
    const map = {};
    inThisDivision.forEach((u, idx) => {
      const prevIdx = lastOrder.indexOf(u.id);
      if (prevIdx === -1) return; // sin dato previo
      if (idx < prevIdx) map[u.id] = "up";
      else if (idx > prevIdx) map[u.id] = "down";
      else map[u.id] = "same";
    });
    return map;
  }, [inThisDivision, lastOrder]);

  // Guardar snapshot de orden actual
  useEffect(() => {
    const ids = inThisDivision.map((u) => u.id);
    if (ids.length) setLastOrder(divTab, ids);
  }, [divTab, inThisDivision]);

  // Mi posición en la división activa
  const myPos = useMemo(() => {
    if (!me) return null;
    const idx = inThisDivision.findIndex((u) => u.id === me.id);
    return idx >= 0 ? idx + 1 : null;
  }, [me, inThisDivision]);

  // Formato XP: "111 EXP"
  const fmtXP = (n) => `${Number(n || 0)} EXP`;

  // Estado: ascendiendo/descendiendo/—
  function renderState(u) {
    const mv = movementMap[u.id];
    if (mv === "up") return <span className="state-badge up">ascendiendo</span>;
    if (mv === "down")
      return <span className="state-badge down">descendiendo</span>;
    return <span className="state-badge dash">—</span>;
  }

  return (
    <div className="container-xxl lb2-wrap">
      <div className="row g-3">
        {/* MAIN */}
        <div className="col-12 col-xl-8">
          {/* Header + Tabs */}
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 fade-in">
            <div className="d-flex align-items-center justify-content-between gap-2">
              <h4 className="mb-0" style={{color:'black'}}>Clasificación</h4>
              <span className="lb2-countdown">
                <FaClock className="me-1" />
                Reinicio:{" "}
                <strong className="ms-1">{formatCountdown(countdown)}</strong>{" "}
                (dom)
              </span>
            </div>

            {/* Tabs de divisiones (solo ícono; superiores transparentes y deshabilitadas) */}
            <div className="lb2-tabs">
              {divList.map((name, idx) => {
                const isLocked = idx > myDivIndex; // superiores a la mía
                const isActive = divTab === name;
                return (
                  <button
                    key={name}
                    className={`lb2-tab ${isActive ? "active" : ""} ${
                      isLocked ? "locked" : ""
                    }`}
                    onClick={() => !isLocked && setDivTab(name)}
                    title={name}
                    disabled={isLocked}
                  >
                    {DIV_ICONS[name] || <FaStar className="trophy" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Header de división */}
          <div className="duo-card lb2-header mt-2 soft-appear">
            <div className="d-flex align-items-center gap-3">
              <div className="lb2-plate">
                {DIV_ICONS[divTab] || <FaStar className="trophy" />}
              </div>
              <div>
                <div className="lb2-title">{divTab}</div>
                <div className="lb2-muted small">
                  {inThisDivision.length} jugador(es) esta semana
                </div>
              </div>
            </div>
            {myPos && (
              <div className="lb2-mypos">
                Tu posición: <strong>{myPos}</strong>
              </div>
            )}
          </div>

          {/* Tabla de la división */}
          <div className="duo-card mt-3">
            {inThisDivision.length === 0 ? (
              <div className="lb2-muted">
                Aún no hay jugadores en esta división.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle lb2-table lb2-table-enhanced">
                  <thead className="sticky-top">
                    <tr>
                      <th style={{ width: 64 }}>#</th>
                      <th>Usuario</th>
                      <th className="text-end" style={{ width: 160 }}>
                        XP semanal
                      </th>
                      <th className="text-end" style={{ width: 180 }}>
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody >
                    {inThisDivision.map((u, i) => {
                      const isMe = me && u.id === me.id;
                      const posClass =
                        i === 0
                          ? "gold"
                          : i === 1
                          ? "silver"
                          : i === 2
                          ? "bronze"
                          : "";
                      return (
                        <tr 
                          key={u.id}
                          className={[
                            "row-appear",
                            isMe ? "is-me" : "",
                          ].join(" ").trim()}
                        >
                          <td className="pos" >
                            <span className={`pos-badge ${posClass}`} >
                              <span className="pos-num" >{i + 1}</span>
                            </span>
                          </td>

                          <td >
                            <Link to={`/u/${u.username}`} className="lb2-user" >
                              <span className="avatar" >
                                {u.avatar ? (
                                  <img src={u.avatar} alt={u.name} />
                                ) : (
                                  <span className="emo">
                                    {u.emoji || "👤"}
                                  </span>
                                )}
                              </span>
                              <span className="name text-truncate" style={{color:'black'}}>
                                {u.name}
                                {isMe && (
                                  <span className="me-badge ms-2">tú</span>
                                )}
                              </span>
                              <span className="username d-block small">
                                @{u.username}
                              </span>
                            </Link>
                          </td>

                          <td className="text-end fw-semibold">
                            {fmtXP(u.stats.weeklyXp)}
                          </td>

                          <td className="text-end">{renderState(u)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="lb2-foot small">
              * Ranking y divisiones se reinician los domingos. Los primeros 10
              ascienden.
            </div>
          </div>
        </div>

        {/* SIDEBAR: Mejores de la app (global semanal) */}
        <div className="col-12 col-xl-4">
          <div className="lb2-side card-stick fade-in">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h6 className="mb-0">Mejores de la app</h6>
              <span className="lb2-muted small">Top semanal</span>
            </div>

            <div className="top-list">
              {users
                .slice()
                .sort((a, b) => b.stats.weeklyXp - a.stats.weeklyXp)
                .slice(0, 15)
                .map((u, i) => (
                  <Link
                    key={u.id}
                    to={`/u/${u.username}`}
                    className={`top-item ${i < 3 ? `podium-${i + 1}` : ""}`}
                  >
                    <div className="left">
                      <div className="rank">{i + 1}</div>
                      <div className="avatar">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} />
                        ) : (
                          <span className="emo">{u.emoji || "👤"}</span>
                        )}
                      </div>
                      <div className="meta">
                        <div className="name text-truncate">{u.name}</div>
                        <div className="muted small">@{u.username}</div>
                      </div>
                    </div>
                    <div className="right">
                      <div className="xp">{fmtXP(u.stats.weeklyXp)}</div>
                    </div>
                  </Link>
                ))}
            </div>

            <div className="small lb2-muted mt-2">
              * 1.º Oro • 2.º Plata • 3.º Bronce
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
