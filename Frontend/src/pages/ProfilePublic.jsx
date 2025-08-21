// src/pages/ProfilePublic.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FaFlag, FaAt, FaMedal } from "react-icons/fa";
import {
  ensureUserByUsername, getFollowers, getFollowing, ensureUserById,
  divisions as DIVISIONS
} from "../services/social.js";
import Modal from "../components/Modal.jsx";

function divisionFor(xp) {
  let cur = DIVISIONS[0];
  for (const d of DIVISIONS) if (xp >= d.min) cur = d;
  return cur.name;
}

export default function ProfilePublic() {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [openReport, setOpenReport] = useState(false);
  const [reportMsg, setReportMsg] = useState("");

  useEffect(() => {
    const u = ensureUserByUsername(username);
    setUser(u || null);
    if (u) {
      setFollowers(getFollowers(u.id).map(ensureUserById).filter(Boolean));
      setFollowing(getFollowing(u.id).map(ensureUserById).filter(Boolean));
    }
  }, [username]);

  const division = useMemo(() => user ? divisionFor(user.stats.weeklyXp) : "", [user]);

  if (!user) {
    return (
      <div className="container">
        <div className="duo-card">Usuario no encontrado.</div>
      </div>
    );
  }

  function submitReport(e) {
    e.preventDefault();
    // Demo: guardar local. (Integra EmailJS/Formspree si quieres envío real)
    const key = "reports";
    const all = JSON.parse(localStorage.getItem(key) || "[]");
    all.push({ at: Date.now(), userId: user.id, username: user.username, msg: reportMsg });
    localStorage.setItem(key, JSON.stringify(all));
    setOpenReport(false);
    setReportMsg("");
    alert("Reporte enviado (demo).");
  }

  return (
    <div className="container">
      <div className="duo-card">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Perfil de {user.name}</h5>
          <button className="btn btn-outline-danger btn-sm" onClick={() => setOpenReport(true)}>
            <FaFlag className="me-1" /> Reportar
          </button>
        </div>

        <div className="d-flex align-items-center gap-3 mt-3">
          <div className="rounded-circle bg-light border" style={{ width: 72, height: 72, display: "grid", placeItems: "center" }}>
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            ) : (
              <span style={{ fontSize: 36 }}>{user.emoji || "👤"}</span>
            )}
          </div>
          <div>
            <div className="h4 mb-0">{user.name}</div>
            <div className="text-muted"><FaAt className="me-1" />{user.username}</div>
          </div>
        </div>

        <div className="row g-2 mt-3">
          <div className="col-12 col-sm-4">
            <div className="stat-card">
              <div className="small text-muted">Nivel</div>
              <div className="stat-val">{user.stats.level}</div>
            </div>
          </div>
          <div className="col-12 col-sm-4">
            <div className="stat-card">
              <div className="small text-muted">XP semanal</div>
              <div className="stat-val">{user.stats.weeklyXp}</div>
            </div>
          </div>
          <div className="col-12 col-sm-4">
            <div className="stat-card">
              <div className="small text-muted">División</div>
              <div className="stat-val d-flex align-items-center gap-2">
                <span className={`badge-division badge-${division.toLowerCase()}`}>{division}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex gap-3 mt-3">
          <div className="small text-muted">
            Seguidores: <strong>{followers.length}</strong>
          </div>
          <div className="small text-muted">
            Siguiendo: <strong>{following.length}</strong>
          </div>
        </div>

        {user.bio && (
          <div className="mt-3">
            <div className="small text-muted">Bio</div>
            <div>{user.bio}</div>
          </div>
        )}

        {/* Logro rápido (demo): medalla si supera 1000 semanal */}
        {user.stats.weeklyXp >= 1000 && (
          <div className="mt-3">
            <span className="badge bg-warning text-dark">
              <FaMedal className="me-1" /> Top semanales 1000+ XP
            </span>
          </div>
        )}
      </div>

      <Modal open={openReport} title={`Reportar a ${user.name}`} onClose={() => setOpenReport(false)}>
        <form onSubmit={submitReport}>
          <div className="mb-2 small text-muted">
            Describe brevemente el problema.
          </div>
          <textarea className="form-control" rows={4} value={reportMsg} onChange={(e) => setReportMsg(e.target.value)} required />
          <div className="d-flex justify-content-end gap-2 mt-3">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setOpenReport(false)}>Cancelar</button>
            <button type="submit" className="btn btn-danger">Enviar reporte</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
