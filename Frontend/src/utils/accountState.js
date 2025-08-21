// src/utils/accountState.js
// Guarda/restaura TODO el estado de juego por cuenta (userId).

const KEYS_SIMPLE = [
  "gw_xp", "gw_coins", "gw_diamonds",
  "gw_xpBoostUntil", "gw_weeklyXpMap"
];

// Prefijos de claves que generan N entradas (niveles, vidas, misiones...)
const PREFIXES = [
  "game_level_", "game_stats_", "lives_", "nextlife_", "hints_",
  "playtime_", "daily_", "stat_levels_completed_today", "stat_correct_today"
];

// Social (si quieres aislar conexiones por cuenta, opcional)
const SOCIAL_PREFIXES = [
  "social_followers_", "social_following_", "social_sugg_dismissed_"
];

export function readGlobalStateSnapshot() {
  const snapshot = { SIMPLE:{}, PREFIXED:{}, SOCIAL:{} };

  // simples
  for (const k of KEYS_SIMPLE) {
    const raw = localStorage.getItem(k);
    snapshot.SIMPLE[k] = raw ? JSON.parse(raw) : null;
  }

  // por prefijo
  for (const key of Object.keys(localStorage)) {
    if (PREFIXES.some(p => key.startsWith(p))) {
      snapshot.PREFIXED[key] = localStorage.getItem(key);
    }
    if (SOCIAL_PREFIXES.some(p => key.startsWith(p))) {
      snapshot.SOCIAL[key] = localStorage.getItem(key);
    }
  }
  return snapshot;
}

export function writeGlobalStateFromSnapshot(snapshot) {
  // limpia todo lo relacionado primero
  resetGlobalStateOnly();

  if (!snapshot) return; // deja todo en 0

  // simples
  for (const [k, v] of Object.entries(snapshot.SIMPLE || {})) {
    if (v === null || typeof v === "undefined") continue;
    localStorage.setItem(k, JSON.stringify(v));
  }
  // prefijadas
  for (const [k, v] of Object.entries(snapshot.PREFIXED || {})) {
    localStorage.setItem(k, v);
  }
  // social (opcional)
  for (const [k, v] of Object.entries(snapshot.SOCIAL || {})) {
    localStorage.setItem(k, v);
  }
}

export function resetGlobalStateOnly() {
  // borra simples
  KEYS_SIMPLE.forEach(k => localStorage.removeItem(k));
  // borra prefijos
  for (const k of Object.keys(localStorage)) {
    if (PREFIXES.some(p => k.startsWith(p))) localStorage.removeItem(k);
    if (SOCIAL_PREFIXES.some(p => k.startsWith(p))) localStorage.removeItem(k);
  }
}

// Persistencia de snapshot por userId
const SNAP_KEY = (userId) => `account_snapshot_${userId}`;

export function saveSnapshotFor(userId) {
  if (!userId) return;
  const snap = readGlobalStateSnapshot();
  localStorage.setItem(SNAP_KEY(userId), JSON.stringify(snap));
}

export function loadSnapshotFor(userId) {
  if (!userId) return null;
  const raw = localStorage.getItem(SNAP_KEY(userId));
  return raw ? JSON.parse(raw) : null;
}

export function initEmptySnapshotFor(userId) {
  // snapshot vacío = progreso 0
  localStorage.setItem(SNAP_KEY(userId), JSON.stringify({ SIMPLE:{}, PREFIXED:{}, SOCIAL:{} }));
}

export function deleteSnapshotFor(userId) {
  if (!userId) return;
  localStorage.removeItem(SNAP_KEY(userId));
}
