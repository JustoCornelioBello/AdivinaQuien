export const ls = {
get(key, fallback){
try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback }catch{ return fallback }
},
set(key, val){ localStorage.setItem(key, JSON.stringify(val)) },
remove(key){ localStorage.removeItem(key) }
}


// ===============================
// src/utils/time.js
// ===============================
export const now = () => Date.now()
export const minutes = (m) => m * 60 * 1000
export const startOfWeekKey = () => {
const d = new Date()
const day = d.getDay() // 0 Sun
const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday as start
const monday = new Date(d.setDate(diff))
monday.setHours(0,0,0,0)
return `week_${monday.toISOString().substring(0,10)}`
}