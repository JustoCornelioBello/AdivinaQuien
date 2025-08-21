import React from 'react'
import { useGame } from '../context/GameContext.jsx'


export default function HeartLives(){
const { lives, MAX_LIVES } = useGame()
return (
<div>
{Array.from({length:MAX_LIVES}).map((_,i)=> (
<span key={i} className={`heart ${i < lives ? '' : 'empty'}`}></span>
))}
</div>
)
}