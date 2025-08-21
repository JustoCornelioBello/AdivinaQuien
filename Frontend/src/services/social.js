// src/services/social.js

// === Claves de storage ===
const USERS_KEY = "social_users";
const ME_KEY = "social_currentUserId";
const FOLLOWING_KEY = (uid) => `social_following_${uid}`;
const FOLLOWERS_KEY = (uid) => `social_followers_${uid}`;
const SUGG_DISMISSED_KEY = (uid) => `social_sugg_dismissed_${uid}`;
const GW_USER = "gw_user"; // {id, name, username, avatar, bio}
const STREAK_KEY = "streak_state"; // {current, last}
const XP_KEY = "gw_xp";
const WEEKLY_MAP_KEY = "gw_weeklyXpMap"; // {week_YYYY-MM-DD: xp}

// === Utils ===
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const slugify = (s) =>
  (s || "jugador")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 14);

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

// === Divisiones ===
export const divisions = [
  { name: "Bronze", min: 0 },
  { name: "Silver", min: 300 },
  { name: "Gold", min: 800 },
  { name: "Diamond", min: 1400 },
  { name: "Champions", min: 2200 },
];

export function divisionFor(weeklyXp) {
  let cur = divisions[0].name;
  for (const d of divisions) if (weeklyXp >= d.min) cur = d.name;
  return cur;
}

// Semana actual (Lunes)
export const startOfWeekKey = () => {
  const d = new Date();
  const day = d.getDay(); // 0 dom
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return `week_${monday.toISOString().substring(0, 10)}`;
};

// Usuarios de ejemplo
const samplePool = [
  { name: "Ana Torres", bio: "Amo los retos lógicos.", emoji: "🧩" },
  { name: "Bruno Díaz", bio: "Café + adivinanzas.", emoji: "☕" },
  { name: "Carla M.", bio: "Team animales", emoji: "🐾" },
  { name: "Diego Dev", bio: "JS, React y juegos.", emoji: "💻" },
  { name: "Estefanía", bio: "Arte y curiosidad.", emoji: "🎨" },
  { name: "Fabio", bio: "Min-max all the things.", emoji: "📈" },
  { name: "Giselle", bio: "Velocidad mental.", emoji: "⚡" },
  { name: "Hugo", bio: "Trivia nocturna.", emoji: "🌙" },
];

// === Core social data ===
function ensureMeId() {
  const gw = read(GW_USER, null);
  let me = localStorage.getItem(ME_KEY);
  if (!me) {
    if (gw?.id) {
      me = gw.id;
    } else {
      me = crypto.randomUUID();
      const name = gw?.name || "Jugador";
      const username = gw?.username || `${slugify(name)}${rand(10, 99)}`;
      if (!gw) {
        write(GW_USER, { id: me, name, username, avatar: "", bio: "¡Hola! Soy nuevo por aquí." });
      } else {
        if (!gw.username) {
          gw.username = username;
          write(GW_USER, gw);
        }
      }
    }
    localStorage.setItem(ME_KEY, me);
  }
  return me;
}

function currentWeekXp() {
  const m = read(WEEKLY_MAP_KEY, {});
  return m[startOfWeekKey()] || 0;
}

export function initSocialData() {
  const meId = ensureMeId();
  const gw = read(GW_USER, {});
  let users = read(USERS_KEY, null);

  const streak = read(STREAK_KEY, { current: 1, last: new Date().toISOString().substring(0, 10) }).current || 1;
  const xp = read(XP_KEY, 0);
  const weeklyXp = currentWeekXp();
  const level = Math.floor(xp / 300) + 1;

  const meUser = {
    id: meId,
    name: gw.name || "Jugador",
    username: gw.username || `${slugify(gw.name || "jugador")}${rand(10, 99)}`,
    bio: gw.bio || "¡Adivinar es vivir!",
    avatar: gw.avatar || "",
    emoji: "🧠",
    stats: { xp, weeklyXp, level, streak, division: divisionFor(weeklyXp) },
  };

  if (!users) {
    users = [
      meUser,
      ...samplePool.map((p) => ({
        id: crypto.randomUUID(),
        name: p.name,
        username: `${slugify(p.name)}${rand(10, 99)}`,
        bio: p.bio,
        avatar: "",
        emoji: p.emoji,
        stats: {
          xp: rand(100, 4000),
          weeklyXp: rand(20, 2000),
          level: rand(1, 20),
          streak: rand(0, 15),
          division: "Bronze",
        },
      })),
    ].map((u) => ({ ...u, stats: { ...u.stats, division: divisionFor(u.stats.weeklyXp) } }));
    write(USERS_KEY, users);
  } else {
    const i = users.findIndex((u) => u.id === meId);
    if (i >= 0) users[i] = { ...users[i], ...meUser };
    else users.unshift(meUser);
    write(USERS_KEY, users);
  }

  if (!read(FOLLOWING_KEY(meId), null)) write(FOLLOWING_KEY(meId), []);
  users.forEach((u) => {
    if (!read(FOLLOWERS_KEY(u.id), null)) write(FOLLOWERS_KEY(u.id), []);
  });
  if (!read(SUGG_DISMISSED_KEY(meId), null)) write(SUGG_DISMISSED_KEY(meId), []);
  return { meId };
}

// === API pública ===
export function getAllUsers() { return read(USERS_KEY, []); }

export function getMe() {
  const meId = ensureMeId();
  return getAllUsers().find((u) => u.id === meId);
}

export function ensureUserById(id) { return getAllUsers().find((u) => u.id === id); }
export function ensureUserByUsername(username) { return getAllUsers().find((u) => u.username === username); }

export function updateMeAvatar(dataUrl) {
  const me = getMe();
  const users = getAllUsers();
  const idx = users.findIndex((u) => u.id === me.id);
  if (idx >= 0) {
    users[idx] = { ...users[idx], avatar: dataUrl };
    write(USERS_KEY, users);
  }
  const gw = read(GW_USER, {});
  gw.avatar = dataUrl;
  write(GW_USER, gw);
  return users[idx];
}

export function getFollowing(uid) { return read(FOLLOWING_KEY(uid || ensureMeId()), []); }
export function getFollowers(uid) { return read(FOLLOWERS_KEY(uid || ensureMeId()), []); }
export function isFollowing(userId) { return getFollowing().includes(userId); }

export function follow(userId) {
  const meId = ensureMeId();
  if (userId === meId) return;
  const following = Array.from(new Set([...getFollowing(meId), userId]));
  write(FOLLOWING_KEY(meId), following);
  const followers = Array.from(new Set([...getFollowers(userId), meId]));
  write(FOLLOWERS_KEY(userId), followers);
}

export function unfollow(userId) {
  const meId = ensureMeId();
  write(FOLLOWING_KEY(meId), getFollowing(meId).filter((x) => x !== userId));
  write(FOLLOWERS_KEY(userId), getFollowers(userId).filter((x) => x !== meId));
}

export function getSuggestions(limit = 5) {
  const meId = ensureMeId();
  const dismissed = new Set(read(SUGG_DISMISSED_KEY(meId), []));
  const users = getAllUsers().filter((u) => u.id !== meId);
  const following = new Set(getFollowing(meId));
  const pool = users.filter((u) => !following.has(u.id) && !dismissed.has(u.id));
  // shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, limit);
}

export function dismissSuggestion(userId) {
  const meId = ensureMeId();
  const dismissed = new Set(read(SUGG_DISMISSED_KEY(meId), []));
  dismissed.add(userId);
  write(SUGG_DISMISSED_KEY(meId), Array.from(dismissed));
}






// 👇 Pega esto en src/services/social.js (debajo de los helpers read/write o donde tengas otras exports)

/** ======= FECHAS & RACHA ======= **/
const STREAK = "streak_state"; // { current, last: 'YYYY-MM-DD' }
const PLAY_LOG_KEY = (dStr) => `played_${dStr}`; // marca si jugaste ese día (por si quieres auditar)

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateStrAddDays(iso, days) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayDiff(a, b) {
  // diferencia en días entre dos YYYY-MM-DD
  const A = new Date(a + "T00:00:00Z");
  const B = new Date(b + "T00:00:00Z");
  return Math.round((B - A) / (1000 * 60 * 60 * 24));
}

export function getStreakState() {
  const s = read(STREAK, null);
  if (!s) {
    const init = { current: 0, last: null };
    write(STREAK_KEY, init);
    return init;
  }
  // auto-reset si hubo salto de más de 1 día y no se registró juego
  const t = todayStr();
  if (s.last) {
    const diff = dayDiff(s.last, t);
    if (diff > 1) {
      // pasaron ≥2 días sin jugar: reset
      const reset = { current: 0, last: s.last };
      write(STREAK_KEY, reset);
      return reset;
    }
  }
  return s;
}

/**
 * Llamar esto cuando el usuario "juega" o completa un nivel.
 * Reglas:
 * - Si nunca ha jugado => racha = 1
 * - Si ya jugó hoy => no cambia
 * - Si jugó ayer => racha +1
 * - Si la diferencia de días >=2 => racha = 1 (reinicia por nuevo comienzo)
 * (Más adelante aquí puedes aplicar "protector de racha" si el usuario compró uno)
 */
export function markPlayToday() {
  const t = todayStr();
  const s = getStreakState(); // ya gestiona reset por huecos largos
  if (!s.last) {
    const next = { current: 1, last: t };
    write(STREAK_KEY, next);
    write(PLAY_LOG_KEY(t), true);
    return next;
  }
  const diff = dayDiff(s.last, t);
  if (diff === 0) {
    // ya jugó hoy, no cambia
    write(PLAY_LOG_KEY(t), true);
    return s;
  }
  if (diff === 1) {
    const next = { current: (s.current || 0) + 1, last: t };
    write(STREAK_KEY, next);
    write(PLAY_LOG_KEY(t), true);
    return next;
  }
  // diff >= 2  -> día(s) saltado(s): reset a 1 por nuevo comienzo
  const next = { current: 1, last: t };
  write(STREAK_KEY, next);
  write(PLAY_LOG_KEY(t), true);
  return next;
}



