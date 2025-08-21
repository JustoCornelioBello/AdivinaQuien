// src/services/store.js

// ==== Storage helpers ====
const ls = {
  get: (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: (k) => localStorage.removeItem(k),
};

const OWNED_KEY = "shop_owned_items";         // string[] ids
const BADGES_KEY = "shop_premium_badges";     // string[] ids (propiedad histórica)
const SHIELDS_KEY = "gw_streak_shields";      // número de protectores de racha
const GW_USER_KEY = "gw_user";                // { ... , badges?: string[], equippedBadge?: string }

// ==== Catálogo ====
// type: "boost" | "streak" | "currency" | "bundle" | "premium" | "consumable" | "exchange" | "cosmetic"
// - premium: muestran badge en perfil
// - real: requiere dinero real (simulado)
// - costCoins / costDiamonds o priceUSD / priceUSDcents (simulación)
const CATALOG = (() => {
  const items = [
    // Boosts y utilidades (moneda/diamante)
    { id:"boost15",  name:"Multiplicador XP (15m)",  desc:"x2 XP por 15 minutos.", type:"boost", costCoins:200, minutes:15 },
    { id:"boost30",  name:"Multiplicador XP (30m)",  desc:"x2 XP por 30 minutos.", type:"boost", costCoins:350, minutes:30 },
    { id:"boost60",  name:"Multiplicador XP (60m)",  desc:"x2 XP por 60 minutos.", type:"boost", costCoins:600, minutes:60 },
    { id:"streak1",  name:"Protector de racha",      desc:"Evita perder racha por 1 día.", type:"streak", costCoins:400, shields:1 },
    { id:"coins100", name:"Paquete 100 🪙",          desc:"Suma 100 monedas.", type:"currency", costDiamonds:1, grantCoins:100 },
    { id:"coins500", name:"Paquete 500 🪙",          desc:"Suma 500 monedas.", type:"currency", costDiamonds:4, grantCoins:500 },
    { id:"diam1",    name:"Paquete 1 💎",            desc:"Convierte 150 🪙 en 1 💎.", type:"currency", costCoins:150, grantDiamonds:1 },
    { id:"diam5",    name:"Paquete 5 💎",            desc:"Convierte 700 🪙 en 5 💎.", type:"currency", costCoins:700, grantDiamonds:5 },

    // Trueques (exchange “rápidos” con regla fija)
    { id:"ex_coins2diam", name:"Trueque: 300 🪙 → 2 💎", desc:"Intercambia 300 monedas por 2 diamantes.", type:"exchange", costCoins:300, grantDiamonds:2 },
    { id:"ex_diam2coins", name:"Trueque: 2 💎 → 350 🪙", desc:"Intercambia 2 diamantes por 350 monedas.", type:"exchange", costDiamonds:2, grantCoins:350 },

    // Consumibles/varios
    { id:"ticket",  name:"Ticket comodín", desc:"Salta un nivel una vez.", type:"consumable", costCoins:250 },
    { id:"hint3",   name:"Paquete de 3 pistas", desc:"Obtén 3 pistas extra.", type:"consumable", costCoins:180 },

    // Premium (15+) — muestran insignia/placa en perfil
    { id:"p_crown",   name:"Insignia Corona",     desc:"Perfil con corona real.", type:"premium", premiumBadge:"👑", priceUSD:2.99 },
    { id:"p_flame",   name:"Insignia Llama",      desc:"Demuestra tu racha 🔥.", type:"premium", premiumBadge:"🔥", priceUSD:1.99 },
    { id:"p_star",    name:"Insignia Estrella",   desc:"Brilla entre todos.", type:"premium", premiumBadge:"⭐", priceUSD:1.99 },
    { id:"p_rocket",  name:"Insignia Cohete",     desc:"Despega a lo alto.", type:"premium", premiumBadge:"🚀", priceUSD:2.49 },
    { id:"p_dragon",  name:"Insignia Dragón",     desc:"Leyenda del juego.", type:"premium", premiumBadge:"🐉", priceUSD:3.99 },
    { id:"p_wave",    name:"Insignia Ola",        desc:"Flow imparable.", type:"premium", premiumBadge:"🌊", priceUSD:1.49 },
    { id:"p_light",   name:"Insignia Relámpago",  desc:"Velocidad mental.", type:"premium", premiumBadge:"⚡", priceUSD:2.49 },
    { id:"p_diamond", name:"Insignia Diamante",   desc:"Brilla como 💎.", type:"premium", premiumBadge:"💎", priceUSD:3.49 },
    { id:"p_panda",   name:"Insignia Panda",      desc:"Cute pero pro.", type:"premium", premiumBadge:"🐼", priceUSD:1.49 },
    { id:"p_phoenix", name:"Insignia Fénix",      desc:"Renace más fuerte.", type:"premium", premiumBadge:"🦅", priceUSD:3.49 },
    { id:"p_ufo",     name:"Insignia OVNI",       desc:"De otro planeta.", type:"premium", premiumBadge:"🛸", priceUSD:2.99 },
    { id:"p_medal",   name:"Insignia Medalla",    desc:"Honor y gloria.", type:"premium", premiumBadge:"🥇", priceUSD:2.49 },
    { id:"p_ghost",   name:"Insignia Fantasma",   desc:"Juega en sigilo.", type:"premium", premiumBadge:"👻", priceUSD:1.99 },
    { id:"p_owl",     name:"Insignia Búho",       desc:"Sabiduría nocturna.", type:"premium", premiumBadge:"🦉", priceUSD:2.49 },
    { id:"p_heart",   name:"Insignia Corazón",    desc:"Good vibes.", type:"premium", premiumBadge:"❤️", priceUSD:1.49 },

    // “Dinero real” (10) — simulado con confirm()
    { id:"r_coins1k",   name:"1000 Monedas",  desc:"Compra directa de monedas.", type:"currency", real:true, priceUSD:1.99, grantCoins:1000 },
    { id:"r_coins5k",   name:"5000 Monedas",  desc:"Compra directa de monedas.", type:"currency", real:true, priceUSD:7.99, grantCoins:5000 },
    { id:"r_diam10",    name:"10 Diamantes",  desc:"Compra directa de diamantes.", type:"currency", real:true, priceUSD:3.99, grantDiamonds:10 },
    { id:"r_diam30",    name:"30 Diamantes",  desc:"Compra directa de diamantes.", type:"currency", real:true, priceUSD:9.99, grantDiamonds:30 },
    { id:"r_boost90",   name:"Boost 90m",     desc:"x2 XP por 90 minutos.", type:"boost", real:true, priceUSD:2.99, minutes:90 },
    { id:"r_bundle1",   name:"Pack Héroe",    desc:"2000🪙 + 10💎 + Insignia ⭐", type:"bundle", real:true, priceUSD:6.99, grantCoins:2000, grantDiamonds:10, premiumBadge:"⭐" },
    { id:"r_bundle2",   name:"Pack Leyenda",  desc:"6000🪙 + 30💎 + Insignia 👑", type:"bundle", real:true, priceUSD:14.99, grantCoins:6000, grantDiamonds:30, premiumBadge:"👑" },
    { id:"r_ticket5",   name:"5 Tickets",     desc:"Salta 5 niveles.", type:"consumable", real:true, priceUSD:1.99 },
    { id:"r_hints10",   name:"10 Pistas",     desc:"Pistas extra x10.", type:"consumable", real:true, priceUSD:1.49 },
    { id:"r_protector3",name:"3 Protectores", desc:"3x protector de racha.", type:"streak", real:true, priceUSD:2.49, shields:3 },
  ];
  return items;
})();

export function getCatalog() {
  return CATALOG;
}

export function getOwned() {
  return ls.get(OWNED_KEY, []);
}
export function isOwned(id) {
  return getOwned().includes(id);
}
export function addOwned(id) {
  const cur = new Set(getOwned());
  cur.add(id);
  ls.set(OWNED_KEY, Array.from(cur));
}

export function getShields() {
  return ls.get(SHIELDS_KEY, 0);
}
export function addShields(n=1) {
  ls.set(SHIELDS_KEY, Math.max(0, getShields() + n));
}

// === Badges premium en perfil (GW_USER) ===
function readGWUser()  { return ls.get(GW_USER_KEY, null); }
function saveGWUser(u) { if (u) ls.set(GW_USER_KEY, u); }

export function addBadgeToProfile(emoji) {
  if (!emoji) return;
  const u = readGWUser() || {};
  const badges = Array.isArray(u.badges) ? u.badges : [];
  if (!badges.includes(emoji)) badges.push(emoji);
  u.badges = badges;
  if (!u.equippedBadge) u.equippedBadge = emoji;
  saveGWUser(u);
}
export function equipBadge(emoji) {
  const u = readGWUser() || {};
  if (Array.isArray(u.badges) && u.badges.includes(emoji)) {
    u.equippedBadge = emoji;
    saveGWUser(u);
  }
}
export function getProfileBadges() {
  const u = readGWUser() || {};
  return { badges: Array.isArray(u.badges) ? u.badges : [], equipped: u.equippedBadge || null };
}

// === Compras ===
/**
 * Compra con monedas/diamantes o “real”. Recibe funciones del UserContext:
 * { addCoins, addDiamonds, grantBoost } y el saldo actual { coins, diamonds }.
 */
export async function buyItem(item, api) {
  const { addCoins, addDiamonds, grantBoost, coins, diamonds } = api;

  // Simulación de pago real
  if (item.real || item.priceUSD) {
    const ok = confirm(`Comprar "${item.name}" por US$ ${item.priceUSD.toFixed(2)} ? (simulado)`);
    if (!ok) return { ok:false, reason:"cancelled" };
    // Aplicar recompensas del real money
    if (item.grantCoins)    addCoins(item.grantCoins);
    if (item.grantDiamonds) addDiamonds(item.grantDiamonds);
    if (item.minutes)       grantBoost(item.minutes);
    if (item.shields)       addShields(item.shields);
    if (item.premiumBadge)  addBadgeToProfile(item.premiumBadge);
    addOwned(item.id);
    return { ok:true, real:true };
  }

  // Compra con monedas/diamantes
  const needCoins = item.costCoins || 0;
  const needDiam  = item.costDiamonds || 0;

  if (needCoins > coins)    return { ok:false, reason:"coins" };
  if (needDiam  > diamonds) return { ok:false, reason:"diamonds" };

  // Deducciones
  if (needCoins)    addCoins(-needCoins);
  if (needDiam)     addDiamonds(-needDiam);

  // Efectos
  if (item.minutes)       grantBoost(item.minutes);
  if (item.shields)       addShields(item.shields);
  if (item.grantCoins)    addCoins(item.grantCoins);
  if (item.grantDiamonds) addDiamonds(item.grantDiamonds);
  if (item.premiumBadge)  addBadgeToProfile(item.premiumBadge);

  addOwned(item.id);
  return { ok:true };
}
