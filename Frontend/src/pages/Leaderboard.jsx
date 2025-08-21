// src/pages/Leaderboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  initSocialData,
  getAllUsers,
  getMe,
  divisions as DIVISIONS,
} from "../services/social.js";
import {
  FaTrophy,
  FaCrown,
  FaMedal,
  FaGem,
  FaStar,
  FaArrowDown,
  FaClock,
} from "react-icons/fa";
import "./leaderboard.css";

// Mapeo de íconos por división (solo trofeos)
const DIV_ICONS = {
  Bronze: <FaMedal className="trophy bronze" title="Bronze" />,
  Silver: <FaMedal className="trophy silver" title="Silver" />,
  Gold: <FaTrophy className="trophy gold" title="Gold" />,
  Diamond: <FaGem className="trophy diamond" title="Diamond" />,
  Champions: <FaCrown className="trophy champions" title="Champions" />,
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

// Estrellas para el panel derecho según ranking global semanal
function starCountForRank(rankIndex) {
  // rankIndex es base 0
  if (rankIndex <= 2) return 4; // Top 3 → 4 estrellas
  if (rankIndex <= 9) return 3; // 4–10 → 3 estrellas
  if (rankIndex <= 24) return 2; // 11–25 → 2 estrellas
  return 1; // resto top listado
}

function Stars({ count }) {
  const total = 4;
  return (
    <div className="stars">
      {Array.from({ length: total }).map((_, i) => (
        <FaStar key={i} className={`star ${i < count ? "on" : ""}`} />
      ))}
    </div>
  );
}

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [divTab, setDivTab] = useState("Bronze");
  const [countdown, setCountdown] = useState(msUntilNextSunday());

  useEffect(() => {
    initSocialData();
    const all = getAllUsers();
    const cur = getMe();
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

  const inThisDivision = useMemo(() => {
    const list = users.filter((u) => inDivision(u.stats.weeklyXp, divTab));
    return list.sort((a, b) => b.stats.weeklyXp - a.stats.weeklyXp);
  }, [users, divTab]);

  // Últimos 3 de la división → descenso
  const relegations = useMemo(() => {
    if (inThisDivision.length <= 3) return inThisDivision;
    return inThisDivision.slice(-3);
  }, [inThisDivision]);

  // Top global semanal (para panel derecho)
  const topGlobal = useMemo(() => {
    const list = [...users].sort((a, b) => b.stats.weeklyXp - a.stats.weeklyXp);
    return list.slice(0, 15); // mostramos 15
  }, [users]);

  // Posición del usuario dentro de la división activa
  const myPos = useMemo(() => {
    if (!me) return null;
    const idx = inThisDivision.findIndex((u) => u.id === me.id);
    return idx >= 0 ? idx + 1 : null;
  }, [me, inThisDivision]);

  return (
    <div className="container-xxl lb2-wrap">
      <div className="row g-3">
        {/* MAIN */}
        <div className="col-12 col-xl-8">
          {/* Header + Tabs */}
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <h4 className="mb-0 text-black">Clasificación</h4>
              <span className="lb2-countdown">
                <FaClock className="me-1" />
                Reinicio: <strong className="ms-1">{formatCountdown(countdown)}</strong> (dom)
              </span>
            </div>
            <div className="lb2-tabs">
              {divList.map((name) => (
                <button
                  key={name}
                  className={`lb2-tab ${divTab === name ? "active" : ""}`}
                  onClick={() => setDivTab(name)}
                  title={name}
                >
                  {DIV_ICONS[name] || <FaStar className="trophy" />}
                </button>
              ))}
            </div>
          </div>

          {/* Header de división */}
          <div className="duo-card lb2-header mt-2">
            <div className="d-flex align-items-center gap-3">
              <div className="lb2-plate">
                {DIV_ICONS[divTab] || <FaStar className="trophy" />}
              </div>
              <div>
                <div className="lb2-title text-black">División seleccionada</div>
                <div className="lb2-muted small">
                  {inThisDivision.length} jugador(es) esta semana
                </div>
              </div>
            </div>
            {myPos && (
              <div className="lb2-mypos text-black">
                Tu posición: <strong>{myPos}</strong>
              </div>
            )}
          </div>

          {/* Tabla de la división */}
          <div className="duo-card mt-3 ">
            {inThisDivision.length === 0 ? (
              <div className="lb2-muted">Aún no hay jugadores en esta división.</div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle lb2-table">
                  <thead>
                    <tr>
                      <th style={{ width: 64 }}>#</th>
                      <th>Usuario</th>
                      <th className="text-end">XP semanal</th>
                      <th className="text-end" style={{ width: 160 }}>
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inThisDivision.map((u, i) => {
                      const isMe = me && u.id === me.id;
                      const isRelegation = relegations.some((r) => r.id === u.id);
                      return (
                        <tr key={u.id} className={`${isMe ? "is-me" : ""}`}>
                          <td className="pos">{i + 1}</td>
                          <td>
                            <Link to={`/u/${u.username}`} className="lb2-user">
                              <span className="avatar">
                                {u.avatar ? (
                                  <img src={u.avatar} alt={u.name} />
                                ) : (
                                  <span className="emo">{u.emoji || "👤"}</span>
                                )}
                              </span>
                              <span className="name text-truncate text-black">{u.name}</span>
                            </Link>
                          </td>
                          <td className="text-end fw-semibold">{u.stats.weeklyXp}</td>
                          <td className="text-end">
                            {isRelegation ? (
                              <span className="desc-badge">
                                <FaArrowDown className="me-1" /> posible descenso
                              </span>
                            ) : (
                              <span className="ok-badge">activo</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Zona de descenso (lista clara) */}
            {relegations.length > 0 && (
              <div className="lb2-descenso mt-2">
                <div className="title">
                  <FaArrowDown className="me-2" /> Zona de descenso
                </div>
                <div className="list">
                  {relegations.map((u) => (
                    <Link key={u.id} to={`/u/${u.username}`} className="chip-red">
                      <span className="mini-avatar">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} />
                        ) : (
                          <span className="emo-mini">{u.emoji || "👤"}</span>
                        )}
                      </span>
                      <span className="nm text-truncate">{u.name}</span>
                      <span className="xp">{u.stats.weeklyXp} XP</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="lb2-foot small">* Ranking y divisiones se reinician los domingos.</div>
          </div>
        </div>

        {/* SIDEBAR: Mejores de la app (global semanal) */}
        <div className="col-12 col-xl-4">
          <div className="lb2-side card-stick">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h6 className="mb-0">Mejores de la app</h6>
              <span className="lb2-muted small">Top semanal</span>
            </div>

            <div className="top-list" style={{ maxHeight: "600px", overflowY: "auto" }}>
              {topGlobal.map((u, i) => (
                <Link key={u.id} to={`/u/${u.username}`} className="top-item">
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
                    <Stars count={starCountForRank(i)} />
                    <div className="xp">{u.stats.weeklyXp} XP</div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="small lb2-muted mt-2">
              * 4★: Top 3 • 3★: Top 10 • 2★: Top 25
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
