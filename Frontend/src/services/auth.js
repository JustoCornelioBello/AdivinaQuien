// src/services/auth.js

// ===== Storage helpers =====
const ls = {
  get: (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: (k) => localStorage.removeItem(k),
};

const AUTH_USERS = "auth_users";             // [{id, username, email, name, passHash, createdAt, avatar?, bio?}]
const AUTH_CURRENT = "auth_current_user_id"; // string
const GW_USER = "gw_user";                   // tu objeto global de perfil que lee el resto de la app

// ===== Utilidades =====
const norm = s => (s || "").trim();
const slug = s => norm(s).toLowerCase();

function weakHash(str) {
  // DEMO: hashing rápido NO SEGURO (mejorar con backend real)
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    return btoa(str);
  }
}

function users() { return ls.get(AUTH_USERS, []); }
function saveUsers(list) { ls.set(AUTH_USERS, list); }

export function isUsernameTaken(username) {
  const u = users();
  const target = slug(username);
  return u.some(x => slug(x.username) === target);
}
export function isEmailTaken(email) {
  const u = users();
  const target = slug(email);
  return u.some(x => slug(x.email) === target);
}

export function registerUser({ username, email, name, password }) {
  username = norm(username);
  email = norm(email);
  name = norm(name);

  if (!username || username.length < 3) throw new Error("El usuario debe tener al menos 3 caracteres.");
  if (!/^[a-zA-Z0-9_\.]+$/.test(username)) throw new Error("Usuario inválido. Usa letras, números, _ o .");
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("Email inválido.");
  if (!name || name.length < 2) throw new Error("Nombre demasiado corto.");
  if (!password || password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
  if (isUsernameTaken(username)) throw new Error("Ese usuario ya existe.");
  if (isEmailTaken(email)) throw new Error("Ese email ya está registrado.");

  const list = users();
  const id = crypto.randomUUID();
  const passHash = weakHash(password);
  const user = { id, username, email, name, passHash, createdAt: Date.now(), avatar: "", bio: "" };
  list.push(user);
  saveUsers(list);
  return user;
}

export function findUserByUsernameOrEmail(identifier) {
  const idf = slug(identifier);
  return users().find(u => slug(u.username) === idf || slug(u.email) === idf) || null;
}

export function loginUser({ identifier, password }) {
  const user = findUserByUsernameOrEmail(identifier);
  if (!user) throw new Error("Usuario no encontrado.");
  const ok = user.passHash === weakHash(password);
  if (!ok) throw new Error("Contraseña incorrecta.");
  ls.set(AUTH_CURRENT, user.id);

  // Sincroniza con el "perfil global" de tu app
  const gw = ls.get(GW_USER, null) || {};
  const merged = {
    ...gw,
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    avatar: gw.avatar || user.avatar || "",
    bio: gw.bio ?? user.bio ?? "¡Hola! Soy nuevo por aquí.",
  };
  ls.set(GW_USER, merged);

  return user;
}

export function getCurrentAuthUser() {
  const id = ls.get(AUTH_CURRENT, null);
  if (!id) return null;
  return users().find(u => u.id === id) || null;
}

export function logoutAuth() {
  ls.del(AUTH_CURRENT);
}

export function updateAuthUser(partial) {
  const cur = getCurrentAuthUser();
  if (!cur) throw new Error("Sin sesión.");
  const list = users();
  const idx = list.findIndex(u => u.id === cur.id);
  list[idx] = { ...list[idx], ...partial };
  saveUsers(list);

  // Sincroniza gw_user
  const gw = ls.get(GW_USER, null) || {};
  if (partial.name || partial.username || partial.email || partial.avatar || partial.bio) {
    ls.set(GW_USER, { ...gw, ...partial });
  }
  return list[idx];
}
