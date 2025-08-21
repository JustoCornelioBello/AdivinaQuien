export function rollChestReward(){
const pool = [
{ type:'xpBoost', label:'Multiplicador de XP (15 min)', chance: 0.35, payload:{ minutes:15, multiplier:2 } },
{ type:'diamonds', label:'Diamantes', chance: 0.30, payload:{ amount: 10 + Math.floor(Math.random()*21) } },
{ type:'coins', label:'Monedas', chance: 0.35, payload:{ amount: 100 + Math.floor(Math.random()*401) } },
]
const r = Math.random()
let acc = 0
for(const item of pool){
acc += item.chance
if(r <= acc) return item
}
return pool[pool.length-1]
}