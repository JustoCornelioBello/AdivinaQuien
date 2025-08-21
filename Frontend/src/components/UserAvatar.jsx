import React from "react";
import { FaCamera } from "react-icons/fa";

export default function UserAvatar({ src, emoji="🧠", name="", size=96, onPickImage, editable=true }) {
  const initials = (name||"").split(" ").map(p=>p[0]).filter(Boolean).slice(0,2).join("").toUpperCase();
  return (
    <div className="user-avatar position-relative" style={{
      width:size, height:size, borderRadius:20, overflow:"hidden", border:"1px solid #e8eef6",
      display:"grid", placeItems:"center", background:"#fff", boxShadow:"0 10px 26px rgba(0,0,0,.06)"
    }}>
      {src ? (
        <img src={src} alt="avatar" style={{width:"100%",height:"100%",objectFit:"cover"}} />
      ) : (
        <div style={{fontSize:size*0.35, color:"#556270"}} title={name}>{emoji || initials || "👤"}</div>
      )}
      {editable && (
        <label className="btn btn-sm btn-dark position-absolute" style={{bottom:6,right:6,borderRadius:10,opacity:.9}}>
          <FaCamera />
          <input type="file" accept="image/*" className="d-none" onChange={(e)=>e.target.files?.[0] && onPickImage?.(e.target.files[0])}/>
        </label>
      )}
    </div>
  );
}
