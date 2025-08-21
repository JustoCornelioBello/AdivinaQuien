import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import Home from './pages/Home.jsx'
import Profile from "./pages/Profile.jsx";
import UserPublic from "./pages/UserPublic.jsx";
import Games from "./pages/Games.jsx";
import Leaderboard from './pages/Leaderboard.jsx'
import Shop from './pages/Shop.jsx'
import Login from './pages/Login.jsx'
import Settings from './pages/Settings.jsx'
import { useUser } from './context/UserContext.jsx'
import Register from "./pages/Register.jsx";


export default function App() {
const { user } = useUser()


return (
<div className="app-container d-flex">
<Sidebar />
<main className="flex-grow-1 main-content p-3 p-md-4">
<Routes>
<Route path="/" element={<Home />} />
<Route path="/perfil" element={user ? <Profile /> : <Navigate to="/iniciar-sesion" />} />
<Route path="/u/:username" element={<UserPublic />} />
<Route path="/juegos" element={<Games />} />
<Route path="/clasificacion" element={<Leaderboard />} />
<Route path="/tienda" element={<Shop />} />
<Route path="/ajustes" element={<Settings />} />
<Route path="/register" element={<Register />} />
<Route path="/iniciar-sesion" element={<Login />} />
<Route path="*" element={<Navigate to="/" />} />
</Routes>
</main>
</div>
)
}