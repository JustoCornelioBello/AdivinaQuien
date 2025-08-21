import React from "react";

export default function AchievementModal({ open, icon, title, description, current=0, goal=1, onClose }) {
  if (!open) return null;
  const pct = Math.max(0, Math.min(100, Math.round((current/goal) * 100)));
  return (
    <div className="modal-backdrop-custom">
      <div className="modal-card-custom">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center gap-2">
            <div style={{ fontSize: 22 }}>{icon}</div>
            <h6 className="mb-0">{title}</h6>
          </div>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Cerrar</button>
        </div>

        <div className="text-muted mb-2">{description}</div>

        <div className="progress" style={{ height: 10 }}>
          <div className="progress-bar bg-success" style={{ width: `${pct}%` }} />
        </div>
        <div className="small text-muted mt-1">
          <strong>{current}</strong>/<strong>{goal}</strong> ({pct}%)
        </div>
      </div>
    </div>
  );
}
