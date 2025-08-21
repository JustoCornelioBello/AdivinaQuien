// src/components/GameCard.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function GameCard({ game, level, onSelect, onReset }) {
  return (
    <div className="duo-card h-100 hover-rise">
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <h5 className="mb-1">{game.title}</h5>
          <div className="text-muted small">{game.description}</div>
        </div>
        <span className="badge bg-success-subtle text-success">Nivel {level}/25</span>
      </div>
      <div className="progress my-2" style={{ height: 6 }}>
        <div className="progress-bar" style={{ width: `${Math.min(100, Math.floor((level-1)/24*100))}%` }}/>
      </div>
      <div className="d-flex gap-2">
        <button className="btn btn-duo" onClick={() => onSelect(game.id)}>Jugar</button>
        <button className="btn btn-outline-secondary" onClick={() => onReset(game.id)}>Reiniciar</button>
        <Link to="/clasificacion" className="btn btn-ghost">Ranking</Link>
      </div>
    </div>
  );
}
