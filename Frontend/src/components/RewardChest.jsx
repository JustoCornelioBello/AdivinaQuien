// src/components/RewardChest.jsx
import React, { useEffect, useMemo, useState } from "react";
import { FaBoxOpen, FaBolt, FaCoins, FaGem } from "react-icons/fa";
import { burstConfetti } from "../utils/confetti.js";
import { useUser } from "../context/UserContext.jsx";
import { minutes, now } from "../utils/time.js";

/**
 * Recompensas posibles:
 * - Coins: 50-150
 * - Diamonds: 1-3
 * - XP Boost 15m
 */
function randomReward() {
  const roll = Math.random();
  if (roll < 0.34) return { type: "coins", amount: 50 + Math.floor(Math.random() * 101) };
  if (roll < 0.67) return { type: "diamonds", amount: 1 + Math.floor(Math.random() * 3) };
  return { type: "boost", minutes: 15 };
}

export default function RewardChest({ onClose }) {
  const { addCoins, addDiamonds, startBoost } = useUser?.() || {};
  const [result, setResult] = useState(null);

  useEffect(() => {
    const r = randomReward();
    setResult(r);
    // aplicar
    if (r.type === "coins") {
      if (addCoins) addCoins(r.amount);
      else {
        const k = "gw_coins";
        const cur = parseInt(localStorage.getItem(k) || "0", 10) || 0;
        localStorage.setItem(k, String(cur + r.amount));
      }
    } else if (r.type === "diamonds") {
      if (addDiamonds) addDiamonds(r.amount);
      else {
        const k = "gw_diamonds";
        const cur = parseInt(localStorage.getItem(k) || "0", 10) || 0;
        localStorage.setItem(k, String(cur + r.amount));
      }
    } else if (r.type === "boost") {
      if (startBoost) startBoost(r.minutes);
      else {
        const k = "gw_boost_until";
        const until = now() + minutes(r.minutes);
        localStorage.setItem(k, String(until));
      }
    }
    burstConfetti(document.body, 28);
  }, []);

  const label = useMemo(() => {
    if (!result) return "Abriendo…";
    switch (result.type) {
      case "coins": return `+${result.amount} monedas`;
      case "diamonds": return `+${result.amount} diamante(s)`;
      case "boost": return `XP x2 por ${result.minutes} min`;
      default: return "¡Sorpresa!";
    }
  }, [result]);

  const icon = result?.type === "coins" ? <FaCoins/> : result?.type === "diamonds" ? <FaGem/> : <FaBolt/>;

  return (
    <div className="modal-backdrop-custom">
      <div className="modal-card-custom" style={{ maxWidth: 420, textAlign:"center" }}>
        <div className="display-5 mb-2"><FaBoxOpen/></div>
        <h5 className="mb-1">¡Cofre abierto!</h5>
        <div className="text-muted mb-3">{label}</div>
        <div className="display-6 mb-3">{icon}</div>
        <button className="btn btn-duo" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
