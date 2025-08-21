import React from "react";
import { Link } from "react-router-dom";
import { FaUserPlus, FaSyncAlt, FaTimes } from "react-icons/fa";
import { isFollowing } from "../services/social.js";

export default function RightPanelSuggestions({ suggestions, onRefresh, onFollow, onDismiss }) {
  return (
    <aside className="right-panel">
      <div className="duo-card">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h6 className="mb-0">A quién seguir</h6>
          <button className="btn btn-sm btn-ghost" onClick={onRefresh} title="Refrescar"><FaSyncAlt/></button>
        </div>
        <div className="d-flex flex-column gap-2">
          {suggestions.length === 0 && <div className="small text-muted">Sin sugerencias por ahora.</div>}
          {suggestions.map((u) => {
            const followed = isFollowing(u.id);
            return (
              <div key={u.id} className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <div className="rounded-circle border bg-white" style={{width:34,height:34,display:"grid",placeItems:"center"}}>
                    {u.avatar ? <img src={u.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/> : <span style={{fontSize:16}}>{u.emoji || "👤"}</span>}
                  </div>
                  <div>
                    <Link to={`/u/${u.username}`} className="small fw-semibold text-decoration-none">{u.name}</Link>
                    <div className="small text-muted">@{u.username}</div>
                    <div className="mini-meta text-muted small">{u.stats?.division} • racha {u.stats?.streak}d</div>
                  </div>
                </div>
                <div className="d-flex gap-1">
                  {!followed && <button className="btn btn-sm btn-duo" onClick={()=>onFollow?.(u.id)}><FaUserPlus className="me-1"/>Seguir</button>}
                  <button className="btn btn-sm btn-outline-secondary" title="Quitar" onClick={()=>onDismiss?.(u.id)}><FaTimes/></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
