// src/utils/time.js

// Marca de tiempo actual en ms
export const now = () => Date.now();

// Minutos -> milisegundos
export const minutes = (m) => m * 60 * 1000;

/**
 * Clave semanal que se reinicia cada lunes (para leaderboard/temporadas).
 * Ejemplo: "week_2025-08-18"
 */
export const startOfWeekKey = () => {
  const d = new Date();
  const day = d.getDay(); // 0 = Domingo
  // Hacemos que el inicio de semana sea lunes
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return `week_${monday.toISOString().substring(0, 10)}`;
};

/**
 * Formatea un conteo regresivo en mm:ss
 * @param {number} ms milisegundos restantes
 * @returns {string} "m:ss"
 */
export const formatCountdown = (ms) => {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};
