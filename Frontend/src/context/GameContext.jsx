import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { ls } from '../utils/storage.js'
import { minutes, now } from '../utils/time.js'


const GameContext = createContext(null)
export const useGame = () => useContext(GameContext)


const MAX_LIVES = 5
const LIFE_REGEN_MINUTES = 20


export function GameProvider({ children }){
const [lives, setLives] = useState(ls.get('gw_lives', MAX_LIVES))
const [nextLifeAt, setNextLifeAt] = useState(ls.get('gw_nextLifeAt', 0))
const [currentLevel, setCurrentLevel] = useState(ls.get('gw_currentLevel', 1))
const [category, setCategory] = useState(ls.get('gw_category', 'persona'))


useEffect(() => ls.set('gw_lives', lives), [lives])
useEffect(() => ls.set('gw_nextLifeAt', nextLifeAt), [nextLifeAt])
useEffect(() => ls.set('gw_currentLevel', currentLevel), [currentLevel])
useEffect(() => ls.set('gw_category', category), [category])


// Regen interval
useEffect(() => {
const id = setInterval(() => {
if(lives >= MAX_LIVES) return
if(now() >= nextLifeAt && nextLifeAt > 0){
setLives(l => Math.min(MAX_LIVES, l + 1))
setNextLifeAt(t => (lives + 1 >= MAX_LIVES ? 0 : t + minutes(LIFE_REGEN_MINUTES)))
}
}, 1000)
return () => clearInterval(id)
}, [lives, nextLifeAt])


function loseLife(){
if(lives <= 0) return
const newLives = lives - 1
setLives(newLives)
if(newLives === MAX_LIVES - 1){
// starting a chain of regen
setNextLifeAt(now() + minutes(LIFE_REGEN_MINUTES))
}
}


function refillLives(){ setLives(MAX_LIVES); setNextLifeAt(0) }


function completeLevel(){ setCurrentLevel(l => l + 1) }
function resetProgress(){ setCurrentLevel(1); refillLives() }


const value = { lives, loseLife, refillLives, nextLifeAt, LIFE_REGEN_MINUTES, MAX_LIVES,
currentLevel, completeLevel, resetProgress, category, setCategory }
return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}