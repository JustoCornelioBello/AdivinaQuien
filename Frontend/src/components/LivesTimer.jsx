// src/components/LivesTimer.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { minutes, now, formatCountdown } from "../utils/time.js";

const MAX_LIVES = 5;
const LIFE_MS = minutes(20);

// storage keys por juego
const kLives = (gameId) => `lives_${gameId}`;
const kNext  = (gameId) => `nextlife_${gameId}`;

export default function LivesTimer({ gameId, onChange, size = 22 }) {
  const [lives, setLives] = useState(() =>
    Math.max(0, Math.min(MAX_LIVES, parseInt(localStorage.getItem(kLives(gameId)) || "5", 10) || 5))
  );
  const [nextAt, setNextAt] = useState(() => parseInt(localStorage.getItem(kNext(gameId)) || "0", 10) || 0);
  const [tick, setTick] = useState(0);

  // para animaciones contextuales
  const [animGain, setAnimGain] = useState(null); // índice del corazón que “late”
  const [animLose, setAnimLose] = useState(null); // índice del corazón que “shakea”
  const prevLivesRef = useRef(lives);

  // reloj 1s
  useEffect(() => {
    const int = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(int);
  }, []);

  // regen
  useEffect(() => {
    if (lives >= MAX_LIVES || !nextAt) return;
    const remain = nextAt - now();
    if (remain <= 0) {
      const newLives = Math.min(MAX_LIVES, lives + 1);
      const stillNeed = newLives < MAX_LIVES;
      const newNext = stillNeed ? now() + LIFE_MS : 0;
      setLives(newLives);
      setNextAt(newNext);
      localStorage.setItem(kLives(gameId), String(newLives));
      localStorage.setItem(kNext(gameId), String(newNext));
      if (onChange) onChange(newLives);

      // anima el corazón recargado
      setAnimGain(newLives - 1);
      setTimeout(() => setAnimGain(null), 900);
    }
  }, [tick, lives, nextAt, gameId, onChange]);

  // detectar pérdida/ganancia manual para animar
  useEffect(() => {
    const prev = prevLivesRef.current;
    if (lives < prev) {
      // perdió una vida -> sacude el primer vacío (prev-1)
      setAnimLose(lives);
      setTimeout(() => setAnimLose(null), 600);
    } else if (lives > prev) {
      // ganó una -> late el recién llenado
      setAnimGain(lives - 1);
      setTimeout(() => setAnimGain(null), 900);
    }
    prevLivesRef.current = lives;
  }, [lives]);

  const nextLabel = useMemo(() => formatCountdown(Math.max(0, nextAt - now())), [nextAt, tick]);

  // API para padres (opcional)
  function loseLife() {
    if (lives <= 0) return;
    const newLives = lives - 1;
    setLives(newLives);
    localStorage.setItem(kLives(gameId), String(newLives));

    if (newLives < MAX_LIVES && nextAt === 0) {
      const newNext = now() + LIFE_MS;
      setNextAt(newNext);
      localStorage.setItem(kNext(gameId), String(newNext));
    }
    if (onChange) onChange(newLives);

    // animar pérdida
    setAnimLose(newLives);
    setTimeout(() => setAnimLose(null), 600);
  }

  function refillDemo() {
    setLives(MAX_LIVES);
    setNextAt(0);
    localStorage.setItem(kLives(gameId), String(MAX_LIVES));
    localStorage.setItem(kNext(gameId), "0");
    if (onChange) onChange(MAX_LIVES);
  }

  return (
    <div className="lives-wrap d-flex align-items-center gap-2">
      <div className="lives-row d-flex align-items-center gap-1">
        {Array.from({ length: MAX_LIVES }).map((_, i) => {
          const full = i < lives;
          const cls = [
            "life",
            full ? "full" : "empty",
            animGain === i ? "gain" : "",
            animLose === i ? "lose" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <span key={i} className={cls} style={{ fontSize: size }}>
              {/* ping suave solo en el recién regenerado */}
              {animGain === i && <span className="life-ping" aria-hidden />}
              {full ? <FaHeart /> : <FaRegHeart />}
            </span>
          );
        })}
      </div>

      {lives < MAX_LIVES && (
        <span className="small text-muted ms-1">+1 en <strong>{nextLabel}</strong></span>
      )}

      {/* botones demo opcionales (puedes ocultarlos en producción) */}
      <div className="d-none d-sm-flex ms-2 gap-1">
        <button className="btn btn-sm btn-outline-secondary" onClick={loseLife}>Perder</button>
      </div>
    </div>
  );
}

/* Utilidad para perder vida desde fuera si lo prefieres */
export function loseLifeFor(gameId) {
  const n = parseInt(localStorage.getItem(kLives(gameId)) || "5", 10) || 5;
  const remaining = Math.max(0, n - 1);
  localStorage.setItem(kLives(gameId), String(remaining));
  if (remaining < MAX_LIVES) {
    const nextKey = kNext(gameId);
    const nextAt = parseInt(localStorage.getItem(nextKey) || "0", 10) || 0;
    if (!nextAt) localStorage.setItem(nextKey, String(now() + LIFE_MS));
  }
  return remaining;
}
