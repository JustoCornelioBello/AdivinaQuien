// src/pages/Home.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaPlay, FaBolt, FaClock, FaBrain, FaTrophy, FaFire,
  FaPaw, FaPuzzlePiece, FaCoins, FaGem
} from "react-icons/fa";
import { useUser } from "../context/UserContext.jsx";
import { useGame } from "../context/GameContext.jsx";
import { getStreakState, markPlayToday } from "../services/social.js";
import { now, formatCountdown } from "../utils/time.js";

/** ===== Helpers de fecha/keys diarias ===== */
const todayISO = () => new Date().toISOString().substring(0, 10);
const todayKey = () => `daily_${todayISO()}`;
const timeKey = () => `playtime_${todayISO()}`;

/** ===== Sonidos sutiles (Web Audio API) ===== */
function useSoftSounds() {
  const ctxRef = useRef(null);
  const ensureCtx = () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };

  const playTone = (freq = 880, dur = 0.08, type = "sine", volume = 0.05) => {
    const ctx = ensureCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = volume;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  };

  const click = () => playTone(600, 0.06, "square", 0.04);
  const success = () => {
    playTone(740, 0.06, "triangle", 0.05);
    setTimeout(() => playTone(980, 0.08, "triangle", 0.05), 70);
  };
  const reward = () => {
    playTone(660, 0.06, "sine", 0.05);
    setTimeout(() => playTone(880, 0.06, "sine", 0.05), 60);
    setTimeout(() => playTone(1100, 0.08, "sine", 0.05), 120);
  };

  return { click, success, reward };
}

/** ===== Misiones diarias con progreso =====
 * Progresos esperados por el juego (localStorage):
 *   - stat_levels_completed_today
 *   - stat_correct_today
 * Tiempo de juego lo medimos aquí en Home.
 */
const BASE_QUESTS = [
  { id: "q1", title: "Completa 1 nivel", icon: <FaPlay />,  target: 1,  reward: { xp: 30, coins: 50 },  metric: "levels" },
  { id: "q2", title: "3 respuestas correctas", icon: <FaBolt />, target: 3,  reward: { xp: 50, coins: 80 },  metric: "correct" },
  { id: "q3", title: "Juega 10 minutos hoy", icon: <FaClock />, target: 10, reward: { xp: 70, coins: 120 }, metric: "minutes" },
];

export default function Home() {
  const { xp, xpLevel, weeklyXp, xpMultiplier, boostRemainingMs, addXp, addCoins } = useUser();
  const { currentLevel } = useGame();
  const { click, success, reward } = useSoftSounds();

  /** ===== Racha (lee estado, incrementa al jugar) ===== */
  const [streak, setStreak] = useState(() => getStreakState());
  useEffect(() => {
    // Refresca estado de racha al montar (si se rompió por inactividad,
    // el servicio ya lo dejará en 0 al leer).
    setStreak(getStreakState());
  }, []);

  function playTodayDemo() {
    const s = markPlayToday(); // aumenta racha según reglas (solo una vez al día)
    setStreak(s);
    success();
  }

  /** ===== Tiempo de juego (minutos hoy) ===== */
  const [minutesPlayed, setMinutesPlayed] = useState(() => {
    const raw = localStorage.getItem(timeKey());
    return raw ? parseInt(raw, 10) || 0 : 0;
  });
  useEffect(() => {
    const start = now();
    const tick = setInterval(() => {
      const elapsedMs = now() - start;
      const mins = Math.floor(elapsedMs / 60000);
      if (mins > 0) {
        const total = Math.min(1440, (parseInt(localStorage.getItem(timeKey()) || "0", 10) || 0) + 1);
        localStorage.setItem(timeKey(), String(total));
        setMinutesPlayed(total);
      }
    }, 60000);
    return () => clearInterval(tick);
  }, []);

  /** ===== Estado de misiones (reclamadas por día) ===== */
  const [claimed, setClaimed] = useState(() => {
    const raw = localStorage.getItem(todayKey());
    return raw ? JSON.parse(raw) : {};
  });
  useEffect(() => {
    localStorage.setItem(todayKey(), JSON.stringify(claimed));
  }, [claimed]);

  /** ===== Progresos externos del juego (localStorage) ===== */
  const levelsDone = parseInt(localStorage.getItem("stat_levels_completed_today") || "0", 10) || 0;
  const correctDone = parseInt(localStorage.getItem("stat_correct_today") || "0", 10) || 0;

  /** ===== Construcción de misiones con progreso actual ===== */
  const quests = useMemo(() => {
    return BASE_QUESTS.map((q) => {
      const progress =
        q.metric === "levels" ? levelsDone : q.metric === "correct" ? correctDone : minutesPlayed;
      const pct = Math.min(100, Math.floor((progress / q.target) * 100));
      const done = progress >= q.target;
      const isClaimed = !!claimed[q.id];
      return { ...q, progress, pct, done, isClaimed };
    });
  }, [levelsDone, correctDone, minutesPlayed, claimed]);

  function claimQuest(q) {
    if (q.isClaimed || !q.done) return;
    addXp(q.reward.xp);
    addCoins(q.reward.coins);
    setClaimed((c) => ({ ...c, [q.id]: true }));
    reward();
  }

  /** ===== Cálculos visuales ===== */
  const boostLeft = useMemo(() => formatCountdown(boostRemainingMs), [boostRemainingMs]);
  const toNextChest = useMemo(() => {
    const step = currentLevel % 5;
    return step === 0 ? 5 : 5 - step;
  }, [currentLevel]);

  const levelProgressPct = useMemo(() => {
    const intoLevel = xp % 300; // 300 xp/level
    return Math.min(100, Math.floor((intoLevel / 300) * 100));
  }, [xp]);

  return (
    <div className="container-fluid">
      <div className="row g-3">
        {/* ===== HERO ===== */}
        <div className="col-12">
          <div className="duo-card neo-hero move-bg">
            <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between gap-3">
              <div className="d-flex align-items-center gap-3">
                <div className="hero-icon"><FaBrain /></div>
                <div>
                  <div className="display-6 mb-0 fw-800">¡Vamos por más, crack!</div>
                  <div className="text-muted">
                    Mantén tu racha y sube de división. Cofre en <strong>{toNextChest}</strong> nivel(es).
                  </div>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2">
                <Link to="/juegos" className="btn btn-duo btn-lg wobble text-black" onClick={click}>
                  <FaPlay className="me-2" /> Continuar (Nivel {currentLevel})
                </Link>
                <Link to="/clasificacion" className="btn btn-ghost btn-lg" onClick={click}>
                  <FaTrophy className="me-2" /> Clasificación
                </Link>
              </div>
            </div>

            {/* KPIs */}
            <div className="row g-3 mt-2 m-2">
              <div className="col-12 col-md-4">
                <div className="kpi neon">
                  <div className="small text-muted">XP total</div>
                  <div className="kpi-value">{xp}</div>
                  <div className="small text-muted">Nivel {xpLevel}</div>
                  <div className="progress mt-2">
                    <div className="progress-bar bg-success" style={{ width: `${levelProgressPct}%` }} />
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div className="kpi">
                  <div className="small text-muted">XP semanal</div>
                  <div className="kpi-value">{weeklyXp}</div>
                  <div className="small text-muted">Objetivo: 1500</div>
                  <div className="progress mt-2">
                    <div className="progress-bar" style={{ width: `${Math.min(100, Math.floor((weeklyXp / 1500) * 100))}%` }} />
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div className="duo-card d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <FaFire className="text-danger" />
                    <div><strong>Racha:</strong> {streak.current} día(s)</div>
                  </div>
                  <button className="btn btn-duo" onClick={playTodayDemo}>
                    Registrar juego de hoy (demo)
                  </button>
                </div>
              </div>
            </div>

            {xpMultiplier > 1 && (
              <div className="alert alert-success mt-3 mb-0 d-flex align-items-center gap-2">
                <span className="badge bg-success">
                  <FaBolt className="me-1" /> x{xpMultiplier} XP
                </span>
                <span>Multiplicador activo • {boostLeft} restantes</span>
              </div>
            )}
          </div>
        </div>

        {/* ===== Entrenamiento Rápido ===== */}
        <div className="col-12 col-lg-7">
          <div className="duo-card h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">Entrenamiento rápido</h5>
              <Link to="/juegos" className="small text-decoration-none" onClick={click}>
                Ver todo →
              </Link>
            </div>

            <div className="row g-2">
              <div className="col-12 col-md-6">
                <Link to="/juegos" className="tile hover-rise text-decoration-none" onClick={click}>
                  <div className="tile-icon gradient-green">
                    <FaBrain />
                  </div>
                  <div>
                    <div className="tile-title">Adivina Persona</div>
                    <div className="tile-sub">Pistas inteligentes, dificultad ascendente</div>
                  </div>
                </Link>
              </div>
              <div className="col-12 col-md-6">
                <Link to="/juegos" className="tile hover-rise text-decoration-none" onClick={click}>
                  <div className="tile-icon gradient-sky">
                    <FaPaw />
                  </div>
                  <div>
                    <div className="tile-title">Adivina Animal</div>
                    <div className="tile-sub">Observa detalles, piensa rápido</div>
                  </div>
                </Link>
              </div>
              <div className="col-12 col-md-6">
                <Link to="/juegos" className="tile hover-rise text-decoration-none" onClick={click}>
                  <div className="tile-icon gradient-purple">
                    <FaPuzzlePiece />
                  </div>
                  <div>
                    <div className="tile-title">Adivina Cosa</div>
                    <div className="tile-sub">Asocia conceptos y pistas</div>
                  </div>
                </Link>
              </div>
              <div className="col-12 col-md-6">
                <Link to="/juegos" className="tile hover-rise text-decoration-none" onClick={click}>
                  <div className="tile-icon gradient-gold">
                    <FaTrophy />
                  </div>
                  <div>
                    <div className="tile-title">Reto del día</div>
                    <div className="tile-sub">+XP extra si lo completas hoy</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Misiones diarias ===== */}
        <div className="col-12 col-lg-5">
          <div className="duo-card h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">Misiones diarias</h5>
              <span className="badge bg-primary-subtle text-primary">Nuevo</span>
            </div>

            <ul className="list-unstyled m-0 d-flex flex-column gap-2">
              {quests.map((q) => (
                <li key={q.id} className={`quest ${q.isClaimed ? "done" : ""}`}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                      <div className={`quest-icon ${q.done ? "ok" : ""}`}>{q.icon}</div>
                      <div>
                        <div className="fw-semibold">{q.title}</div>
                        <div className="small text-muted">
                          Progreso: {q.progress}/{q.target} • Recompensa: <strong>+{q.reward.xp} XP</strong> ·{" "}
                          <strong>+{q.reward.coins} <FaCoins /></strong>
                        </div>
                        <div className="progress mt-1" style={{ height: 6 }}>
                          <div
                            className={`progress-bar ${q.done ? "bg-success" : ""}`}
                            style={{ width: `${q.pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      className={`btn btn-sm ${q.isClaimed ? "btn-outline-secondary" : q.done ? "btn-duo" : "btn-outline-secondary"}`}
                      disabled={q.isClaimed || !q.done}
                      onClick={() => claimQuest(q)}
                    >
                      {q.isClaimed ? "Reclamado" : q.done ? "Reclamar" : "Pendiente"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="small text-muted mt-2">
              Tiempo jugado hoy: <strong>{minutesPlayed} min</strong> • Reinicio diario a las 00:00.
            </div>
          </div>
        </div>

        {/* ===== Destacados / Novedades ===== */}
        <div className="col-12">
          <div className="duo-card">
            <div className="row g-3">
              <div className="col-12 col-md-8">
                <div className="tip shimmer">
                  <div className="d-flex align-items-center gap-3">
                    <div className="tip-icon text-info">
                      <FaGem />
                    </div>
                    <div>
                      <div className="h5 mb-1">Consejo Pro</div>
                      <div className="text-muted">
                        Usa menos pistas para ganar <strong>más XP</strong> por nivel. ¡Eficiencia es poder!
                      </div>
                    </div>
                  </div>
                </div>
                <div className="tip mt-2">
                  <div className="d-flex align-items-center gap-3">
                    <div className="tip-icon text-warning">
                      <FaTrophy />
                    </div>
                    <div>
                      <div className="h5 mb-1">Sube de división</div>
                      <div className="text-muted">
                        Gana XP semanal y asciende a <strong>Diamond</strong> o <strong>Champions</strong>.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Changelog mini */}
              <div className="col-12 col-md-4">
                <div className="duo-card soft-shadow h-100">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0">Novedades</h6>
                    <span className="badge bg-info text-dark">v1.2</span>
                  </div>
                  <ul className="small m-0 ps-3">
                    <li>🔥 Racha de días</li>
                    <li>🔊 Sonidos sutiles</li>
                    <li>🎯 Misiones con progreso real</li>
                    <li>⏱️ Tiempo de juego por día</li>
                  </ul>
                  <Link to="/juegos" className="btn btn-sm btn-ghost mt-3" onClick={success}>
                    Probar ahora →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>{/* row */}
    </div>   /* container */
  );
}
