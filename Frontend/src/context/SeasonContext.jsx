import React, { createContext, useContext } from 'react'


const SeasonContext = createContext(null)
export const useSeason = () => useContext(SeasonContext)


export function SeasonProvider({ children }){
// Simple static divisions; could be dynamic from backend
const divisions = [
{ name:'Bronze', min:0 },
{ name:'Silver', min:500 },
{ name:'Gold', min:1200 },
{ name:'Diamond', min:2500 },
{ name:'Champions', min:5000 },
]
const value = { divisions }
return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>
}