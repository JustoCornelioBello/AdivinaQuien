import React from "react";
import { Link } from "react-router-dom";
import { FaTimes, FaUserPlus, FaUserMinus } from "react-icons/fa";
import { isFollowing } from "../services/social.js";

export default function FollowModal({ open, title, users, onClose, onFollow, onUnfollow }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop-custom">
      <div className="modal-card-custom">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h5 className="mb-0">{title}</h5>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="list-group">
          {users.length === 0 && <div className="text-muted small">No hay usuarios aún.</div>}
          {users.map((u) => {
            const followed = isFollowing(u.id);
            return (
              <div key={u.id} className="list-group-item d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <div className="rounded-circle border bg-white" style={{width:38,height:38,display:"grid",placeItems:"center"}}>
                    {u.avatar ? <img src={u.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/> : <span style={{fontSize:18}}>{u.emoji || "👤"}</span>}
                  </div>
                  <div>
                    <Link to={`/u/${u.username}`} className="fw-semibold text-decoration-none">{u.name}</Link>
                    <div className="small text-muted">@{u.username}</div>
                  </div>
                </div>
                {followed ? (
                  <button className="btn btn-sm btn-outline-danger" onClick={()=>onUnfollow?.(u.id)}><FaUserMinus className="me-1"/>Dejar de seguir</button>
                ) : (
                  <button className="btn btn-sm btn-duo" onClick={()=>onFollow?.(u.id)}><FaUserPlus className="me-1"/>Seguir</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
