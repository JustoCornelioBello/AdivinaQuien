// src/context/UserContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ls } from '../utils/storage.js'
import { now, minutes, startOfWeekKey } from '../utils/time.js'

const UserContext = createContext(null)
export const useUser = () => useContext(UserContext)

const defaultUser = null // { id, name, avatar? }

export function UserProvider({ children }){
  const [user, setUser] = useState(ls.get('gw_user', defaultUser))
  const [xp, setXp] = useState(ls.get('gw_xp', 0))
  const [coins, setCoins] = useState(ls.get('gw_coins', 0))
  const [diamonds, setDiamonds] = useState(ls.get('gw_diamonds', 0))
  const [xpBoostUntil, setXpBoostUntil] = useState(ls.get('gw_xpBoostUntil', 0))

  const weeklyKey = startOfWeekKey()
  const [weeklyXpMap, setWeeklyXpMap] = useState(ls.get('gw_weeklyXpMap', {}))

  // Persistencia
  useEffect(() => ls.set('gw_user', user), [user])
  useEffect(() => ls.set('gw_xp', xp), [xp])
  useEffect(() => ls.set('gw_coins', coins), [coins])
  useEffect(() => ls.set('gw_diamonds', diamonds), [diamonds])
  useEffect(() => ls.set('gw_xpBoostUntil', xpBoostUntil), [xpBoostUntil])
  useEffect(() => ls.set('gw_weeklyXpMap', weeklyXpMap), [weeklyXpMap])

  // Derivados
  const xpLevel = useMemo(() => Math.floor(xp / 300) + 1, [xp]) // 300 xp por nivel
  const hasBoost = now() < xpBoostUntil
  const xpMultiplier = hasBoost ? 2 : 1
  const boostRemainingMs = Math.max(0, xpBoostUntil - now())

  // XP
  function addXp(base){
    const gained = base * xpMultiplier
    setXp(prev => prev + gained)
    // semanal
    setWeeklyXpMap(prev => ({ ...prev, [weeklyKey]: (prev?.[weeklyKey]||0) + gained }))
  }

  // Boost
  function grantBoost(mins=15){ setXpBoostUntil(now() + minutes(mins)) }
  const startBoost = grantBoost // alias para compatibilidad

  // Monedas / Diamantes
  function addCoins(n){ setCoins(c => c + n) }
  function addDiamonds(n){ setDiamonds(d => d + n) }

  // Auth mínima
  function login(name, avatar=''){
    const u = { id: crypto.randomUUID(), name, avatar }
    setUser(u)
  }
  function logout(){ setUser(null) }

  // Avatar (soporta también photoURL de proveedores)
  function updateAvatar(url){
    setUser(prev => {
      if (!prev) {
        const u = { id: crypto.randomUUID(), name: 'Jugador', avatar: url }
        return u
      }
      // si venía con photoURL, lo normalizamos a avatar también
      return { ...prev, avatar: url, photoURL: url }
    })
  }

  // Getter conveniente para Sidebar: usa avatar || photoURL si existe
  const avatarUrl = user?.avatar || user?.photoURL || ''

  const value = {
    user, login, logout, updateAvatar, avatarUrl,
    xp, xpLevel, addXp, xpMultiplier, hasBoost, boostRemainingMs, grantBoost, startBoost,
    coins, addCoins,
    diamonds, addDiamonds,
    weeklyXp: weeklyXpMap[weeklyKey] || 0,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
