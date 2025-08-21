import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    FaAt, FaIdBadge, FaUsers, FaUserFriends, FaGift, FaMedal, FaBolt, FaGem, FaCoins
} from "react-icons/fa";
import UserAvatar from "../components/UserAvatar.jsx";
import FollowModal from "../components/FollowModal.jsx";
import RightPanelSuggestions from "../components/RightPanelSuggestions.jsx";
import {
    initSocialData, getMe, updateMeAvatar,
    getFollowers, getFollowing, getSuggestions, follow, unfollow,
    ensureUserById, dismissSuggestion,
    divisions as DIVISIONS, // <- usamos este alias
} from "../services/social.js";
import AchievementModal from "../components/AchievementModal.jsx";


// 20 logros con íconos
import {
    FaCrown, FaFire, FaStar, FaChessKnight, FaShieldAlt, FaAward,
    FaBrain, FaPaw, FaPuzzlePiece, FaMagic, FaHeart, FaChessQueen
} from "react-icons/fa";

import { getProfileBadges } from "../services/store.js";


const { badges, equipped } = getProfileBadges();


const ACHIEVEMENTS = [
    { id: "a1", title: "Primer XP", icon: <FaCrown />, rule: (m) => m.stats.xp >= 10 },
    { id: "a2", title: "Nivel 3", icon: <FaStar />, rule: (m) => m.stats.level >= 3 },
    { id: "a3", title: "Nivel 5", icon: <FaChessKnight />, rule: (m) => m.stats.level >= 5 },
    { id: "a4", title: "Racha 3d", icon: <FaFire />, rule: (m) => m.stats.streak >= 3 },
    { id: "a5", title: "Racha 7d", icon: <FaFire />, rule: (m) => m.stats.streak >= 7 },
    { id: "a6", title: "200 XP", icon: <FaAward />, rule: (m) => m.stats.xp >= 200 },
    { id: "a7", title: "500 XP", icon: <FaAward />, rule: (m) => m.stats.xp >= 500 },
    { id: "a8", title: "1k XP", icon: <FaAward />, rule: (m) => m.stats.xp >= 1000 },
    { id: "a9", title: "Silver", icon: <FaShieldAlt />, rule: (m) => m.stats.division === "Silver" || m.stats.weeklyXp >= 300 },
    { id: "a10", title: "Gold", icon: <FaShieldAlt />, rule: (m) => m.stats.division === "Gold" || m.stats.weeklyXp >= 800 },
    { id: "a11", title: "Diamond", icon: <FaShieldAlt />, rule: (m) => m.stats.division === "Diamond" || m.stats.weeklyXp >= 1400 },
    { id: "a12", title: "Champions", icon: <FaShieldAlt />, rule: (m) => m.stats.division === "Champions" || m.stats.weeklyXp >= 2200 },
    { id: "a13", title: "Seguidores 3", icon: <FaUsers />, rule: (_, f) => f.length >= 3 },
    { id: "a14", title: "Siguiendo 5", icon: <FaUserFriends />, rule: (_, __, g) => g.length >= 5 },
    { id: "a15", title: "Bestia", icon: <FaPaw />, rule: (m) => m.stats.xp >= 300 && m.stats.streak >= 3 },
    { id: "a16", title: "Genio", icon: <FaBrain />, rule: (m) => m.stats.level >= 7 },
    { id: "a17", title: "Puzle", icon: <FaPuzzlePiece />, rule: (m) => m.stats.xp >= 450 },
    { id: "a18", title: "Magia", icon: <FaMagic />, rule: (m) => m.stats.weeklyXp >= 1000 },
    { id: "a19", title: "Corazón", icon: <FaHeart />, rule: () => true },
    { id: "a20", title: "Élite", icon: <FaChessQueen />, rule: (m) => m.stats.level >= 10 || m.stats.weeklyXp >= 1800 },
];

function fileToDataUrl(file) {
    return new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = rej;
        fr.readAsDataURL(file);
    });
}

export default function Profile() {
    useEffect(() => { initSocialData(); }, []);
    const [me, setMe] = useState(() => getMe());
    const [followers, setFollowers] = useState(() => getFollowers());
    const [following, setFollowing] = useState(() => getFollowing());
    const [suggestions, setSuggestions] = useState(() => getSuggestions(5));

    const [openFollowers, setOpenFollowers] = useState(false);
    const [openFollowing, setOpenFollowing] = useState(false);

    function refresh() {
        setMe(getMe());
        setFollowers(getFollowers());
        setFollowing(getFollowing());
    }

    async function onPickAvatar(file) {
        const dataUrl = await fileToDataUrl(file);
        updateMeAvatar(dataUrl);
        refresh();
    }

    function doFollow(id) { follow(id); refresh(); setSuggestions(getSuggestions(5)); }
    function doUnfollow(id) { unfollow(id); refresh(); setSuggestions(getSuggestions(5)); }
    function doRefreshSug() { setSuggestions(getSuggestions(5)); }
    function doDismissSug(id) { dismissSuggestion(id); setSuggestions(getSuggestions(5)); }

    const myFollowers = useMemo(() => followers.map(ensureUserById).filter(Boolean), [followers]);
    const myFollowing = useMemo(() => following.map(ensureUserById).filter(Boolean), [following]);

    if (!me) return null;

    // Recompensas demo
    const rewards = [
        { id: "r1", label: "+80 XP (cofre)", icon: <FaBolt /> },
        { id: "r2", label: "+30 🪙", icon: <FaCoins /> },
        { id: "r3", label: "+1 💎", icon: <FaGem /> },
    ];

    const unlockedAch = ACHIEVEMENTS.map(a => ({ ...a, ok: a.rule(me, myFollowers, myFollowing) }));




    function achievementProgress(a, me, followers, following) {
        // Define metas por id (puedes personalizar)
        switch (a.id) {
            case "a4": // Racha 3d
                return { current: me.stats.streak, goal: 3, description: "Mantén una racha de 3 días jugando al menos una vez por día." };
            case "a5": // Racha 7d
                return { current: me.stats.streak, goal: 7, description: "Racha de 7 días consecutivos sin faltar." };
            case "a2": // Nivel 3
                return { current: me.stats.level, goal: 3, description: "Alcanza el nivel 3 acumulando experiencia." };
            case "a3": // Nivel 5
                return { current: me.stats.level, goal: 5, description: "Sé constante y sube hasta el nivel 5." };
            case "a6": // 200 XP
                return { current: me.stats.xp, goal: 200, description: "Suma 200 XP en total." };
            case "a7": // 500 XP
                return { current: me.stats.xp, goal: 500, description: "Suma 500 XP en total." };
            case "a8": // 1000 XP
                return { current: me.stats.xp, goal: 1000, description: "Suma 1000 XP en total." };
            case "a13": // Seguidores 3
                return { current: followers.length, goal: 3, description: "Consigue al menos 3 seguidores." };
            case "a14": // Siguiendo 5
                return { current: following.length, goal: 5, description: "Sigue a 5 jugadores para descubrir nuevos retos." };
            case "a9": // Silver
                return { current: me.stats.weeklyXp, goal: 300, description: "Llega a 300 XP semanales para entrar en Silver." };
            case "a10": // Gold
                return { current: me.stats.weeklyXp, goal: 800, description: "Acumula 800 XP semanales para alcanzar Gold." };
            case "a11": // Diamond
                return { current: me.stats.weeklyXp, goal: 1400, description: "1400 XP semanales para Diamond." };
            case "a12": // Champions
                return { current: me.stats.weeklyXp, goal: 2200, description: "2200 XP semanales para Champions." };
            default:
                // genérico si no definiste un objetivo específico
                return { current: a.ok ? 1 : 0, goal: 1, description: "Completa el requisito de este logro." };
        }
    }






    const [achOpen, setAchOpen] = useState(false);
    const [achData, setAchData] = useState({ icon: null, title: "", description: "", current: 0, goal: 1 });

    function openAchievement(a) {
        const { current, goal, description } = achievementProgress(a, me, myFollowers, myFollowing);
        setAchData({ icon: a.icon, title: a.title, description, current, goal });
        setAchOpen(true);
    }





    // Progreso de nivel (300 xp por nivel)
    const pctLevel = Math.min(100, Math.floor((me.stats.xp % 300) / 3));

    // ✅ División actual y progreso hacia la siguiente usando DIVISIONS
    const currentDivisionName = me.stats?.division;
    const sortedDivs = [...DIVISIONS].sort((a, b) => a.min - b.min);
    const curIdx = sortedDivs.findIndex((d) => d.name === currentDivisionName);
    const currentMin = curIdx >= 0 ? sortedDivs[curIdx].min : 0;
    const nextDiv = curIdx >= 0 && sortedDivs[curIdx + 1] ? sortedDivs[curIdx + 1] : null;

    const divPct = nextDiv
        ? Math.max(
            0,
            Math.min(
                100,
                Math.round(((me.stats.weeklyXp - currentMin) / (nextDiv.min - currentMin)) * 100)
            )
        )
        : 100;

    return (
        <div className="container">
            <div className="row g-3">
                {/* MAIN */}
                <div className="col-12 col-lg-8">
                    <div className="duo-card">
                        <div className="d-flex align-items-center gap-3 flex-wrap">
                            <UserAvatar
                                src={me.avatar}
                                emoji={me.emoji}
                                name={me.name}
                                size={110}
                                onPickImage={onPickAvatar}
                                editable={true}
                            />
                            <div className="flex-grow-1">
                                <div className="h4 mb-0">{me.name}</div>
                                <div className="text-muted d-flex align-items-center gap-3 flex-wrap">
                                    <div><FaAt /> @{me.username}</div>
                                    <div><FaIdBadge /> ID: {me.id.slice(0, 8)}</div>
                                    <div>🔥 Racha <strong>{me.stats.streak}</strong> días</div>
                                </div>
                                {me.bio && <div className="text-muted mt-2">{me.bio}</div>}
                            </div>
                        </div>




                         
                        <div className="h4 mb-0 d-flex align-items-center gap-2">
                            {me.name}
                            {equipped ? <span className="equip-badge" title="Insignia equipada">{equipped}</span> : null}
                        </div>


                        <div className="duo-card mt-3">
                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                <h6 className="mb-0">Insignias premium</h6>
                                <div className="small text-muted">Equipa o compra más en la Tienda</div>
                            </div>
                            {badges.length === 0 ? (
                                <div className="text-muted mt-2">No tienes insignias premium todavía.</div>
                            ) : (
                                <div className="d-flex flex-wrap gap-2 mt-2">
                                    {badges.map(b => (
                                        <span key={b} className="equip-badge" title="Insignia obtenida">{b}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* KPIs */}
                        <div className="row g-2 mt-3 text-white">
                            <div className="col-12 col-sm-6">
                                <div className="stat-card">
                                    <div className="small">Nivel</div>
                                    <div className="stat-val">{me.stats.level}</div>
                                    <div className="progress mt-2" style={{ height: 8 }}>
                                        <div className="progress-bar bg-success" style={{ width: `${pctLevel}%` }} />
                                    </div>
                                </div>
                            </div>
                            <div className="col-12 col-sm-6 text-white">
                                <div className="stat-card">
                                    <div className="small text-white">División</div>
                                    <div className="stat-val">{me.stats.division}</div>
                                    <div className="progress mt-2" style={{ height: 8 }}>
                                        <div className="progress-bar" style={{ width: `${divPct}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Followers / Following */}
                        <div className="d-flex align-items-center gap-4 mt-3">
                            <button className="btn btn-ghost d-flex align-items-center gap-2" onClick={() => setOpenFollowers(true)}>
                                <FaUsers /> <strong>{myFollowers.length}</strong> Seguidores
                            </button>
                            <button className="btn btn-ghost d-flex align-items-center gap-2" onClick={() => setOpenFollowing(true)}>
                                <FaUserFriends /> <strong>{myFollowing.length}</strong> Siguiendo
                            </button>
                        </div>
                    </div>

                    {/* Recompensas */}
                    <div className="duo-card mt-3">
                        <div className="d-flex align-items-center gap-2 mb-2"><FaGift /> <h6 className="mb-0">Recompensas recientes</h6></div>
                        <div className="d-flex flex-wrap gap-2">
                            {rewards.map(r => (
                                <span key={r.id} className="badge bg-light border text-dark">{r.icon} {r.label}</span>
                            ))}
                        </div>
                    </div>

                    {/* Logros (20) */}
                    <div className="duo-card mt-3">
                        <div className="d-flex align-items-center gap-2 mb-2"><FaMedal /> <h6 className="mb-0">Logros</h6></div>
                        <div className="ach-grid">
                            {unlockedAch.map(a => (
                                <button
                                    key={a.id}
                                    className={`ach-item ${a.ok ? 'ok' : ''}`}
                                    title={a.title}
                                    onClick={() => openAchievement(a)}
                                    style={{ cursor: "pointer" }}
                                >
                                    <div className="ach-icon">{a.icon}</div>
                                    <div className="ach-title">{a.title}</div>
                                </button>
                            ))}
                        </div>

                    </div>
                </div>

                {/* RIGHT PANEL */}
                <div className="col-12 col-lg-4">
                    <RightPanelSuggestions
                        suggestions={suggestions}
                        onRefresh={doRefreshSug}
                        onFollow={doFollow}
                        onDismiss={doDismissSug}
                    />
                </div>
            </div>

            {/* Modales */}
            <FollowModal
                open={openFollowers}
                title="Seguidores"
                users={myFollowers}
                onClose={() => setOpenFollowers(false)}
                onFollow={doFollow}
                onUnfollow={doUnfollow}
            />
            <FollowModal
                open={openFollowing}
                title="Siguiendo"
                users={myFollowing}
                onClose={() => setOpenFollowing(false)}
                onFollow={doFollow}
                onUnfollow={doUnfollow}
            />

            <AchievementModal
                open={achOpen}
                icon={achData.icon}
                title={achData.title}
                description={achData.description}
                current={achData.current}
                goal={achData.goal}
                onClose={() => setAchOpen(false)}
            />

        </div>
    );
}
