import React, { useEffect, useMemo, useState } from "react";
import { useGame } from "../context/GameContext.jsx";
import { useUser } from "../context/UserContext.jsx";
import HeartLives from "../components/HeartLives.jsx";
import RewardChest from "../components/RewardChest.jsx";

/** Banco de preguntas por categoría (demo) */
const BANK = {
  persona: [
    { answer: "Albert Einstein", hints: ["Científico famoso", "Teoría de la relatividad", "Cabello alborotado"] },
    { answer: "Frida Kahlo", hints: ["Pintora mexicana", "Ceja característica", "Autorretratos"] },
    { answer: "Lionel Messi", hints: ["Futbolista", "Argentina", "Goles increíbles"] },
    { answer: "Marie Curie", hints: ["Dos premios Nobel", "Radioactividad", "Pionera científica"] },
    { answer: "Cleopatra", hints: ["Antiguo Egipto", "Reina", "Río Nilo"] },
  ],
  animal: [
    { answer: "Jaguar", hints: ["Felino", "América", "Manchas"] },
    { answer: "Colibrí", hints: ["Ave", "Vuelo en el mismo lugar", "Pico largo"] },
    { answer: "Panda", hints: ["Blanco y negro", "Bambú", "China"] },
    { answer: "Pulpo", hints: ["8 brazos", "Inteligente", "Océano"] },
    { answer: "Camello", hints: ["Desierto", "Jorobas", "Resistente"] },
  ],
  cosa: [
    { answer: "Telescopio", hints: ["Observación", "Espacio", "Lentes"] },
    { answer: "Guitarra", hints: ["Cuerdas", "Música", "Madera"] },
    { answer: "Semáforo", hints: ["Ciudad", "Colores", "Tránsito"] },
    { answer: "Computadora", hints: ["Trabajo y juegos", "Pantalla", "Teclado"] },
    { answer: "Reloj de arena", hints: ["Tiempo", "Granos", "Voltear"] },
  ],
};

export default function GuessWho() {
  const {
    category,
    setCategory,
    lives,
    loseLife,
    refillLives,
    nextLifeAt,
    LIFE_REGEN_MINUTES,
    currentLevel,
    completeLevel,
  } = useGame();
  const { addXp } = useUser();

  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("idle"); // idle | correct | wrong
  const [showChest, setShowChest] = useState(false);
  const [usedHints, setUsedHints] = useState(0);

  const pool = BANK[category];
  const stage = useMemo(() => pool[(currentLevel - 1) % pool.length], [pool, currentLevel]);

  useEffect(() => {
    setAnswer("");
    setStatus("idle");
    setUsedHints(0);
  }, [category, currentLevel]);

  function onSubmit(e) {
    e.preventDefault();
    if (!answer.trim() || lives <= 0) return;
    const correct = stage.answer.toLowerCase().trim() === answer.toLowerCase().trim();
    if (correct) {
      setStatus("correct");
      // XP base según pistas usadas y nivel actual
      const base = Math.max(5, 20 - usedHints * 5) + Math.floor(currentLevel / 3) * 2;
      addXp(base);

      setTimeout(() => {
        const nextLevel = currentLevel + 1;
        const shouldChest = nextLevel % 5 === 0;
        completeLevel();
        setStatus("idle");
        setAnswer("");
        setUsedHints(0);
        if (shouldChest) setShowChest(true);
      }, 700);
    } else {
      setStatus("wrong");
      loseLife();
      setTimeout(() => setStatus("idle"), 700);
    }
  }

  function useHint() {
    setUsedHints((h) => Math.min(3, h + 1));
  }

  const nextLifeIn = useMemo(() => {
    if (lives === 5 || nextLifeAt === 0) return 0;
    return Math.max(0, Math.ceil((nextLifeAt - Date.now()) / 1000));
  }, [lives, nextLifeAt]);




  // Cuando el jugador pasa un nivel:
const k1 = "stat_levels_completed_today";
localStorage.setItem(k1, String((parseInt(localStorage.getItem(k1) || "0", 10) || 0) + 1));

// Cuando el jugador responde correcto:
const k2 = "stat_correct_today";
localStorage.setItem(k2, String((parseInt(localStorage.getItem(k2) || "0", 10) || 0) + 1));



  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="btn-group">
          <button
            className={`btn btn-ghost ${category === "persona" ? "border-success" : ""}`}
            onClick={() => setCategory("persona")}
          >
            Persona
          </button>
          <button
            className={`btn btn-ghost ${category === "animal" ? "border-success" : ""}`}
            onClick={() => setCategory("animal")}
          >
            Animal
          </button>
          <button
            className={`btn btn-ghost ${category === "cosa" ? "border-success" : ""}`}
            onClick={() => setCategory("cosa")}
          >
            Cosa
          </button>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="small text-muted">
            Nivel <strong>{currentLevel}</strong>
          </div>
          <HeartLives />
        </div>
      </div>

      <hr />

      <div className="row g-3 align-items-stretch">
        <div className="col-12 col-lg-7">
          <div className={`duo-card ${status === "correct" ? "pulse" : ""}`}>
            <div className="text-muted mb-2">3 pistas disponibles</div>
            <div className="d-flex flex-wrap gap-2">
              {stage.hints.slice(0, usedHints || 1).map((h, idx) => (
                <span key={idx} className="hint-chip">
                  💡 {h}
                </span>
              ))}
            </div>

            <form className="mt-3" onSubmit={onSubmit}>
              <input
                className="form-control answer-input"
                placeholder="Escribe tu respuesta…"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={lives <= 0}
              />
              <div className="d-flex gap-2 mt-3">
                <button type="submit" className="btn btn-duo" disabled={lives <= 0}>
                  Confirmar
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={useHint}
                  disabled={usedHints >= 3}
                >
                  Pedir pista ({3 - usedHints})
                </button>
                {/* Demo: quitar/comprar en Tienda luego */}
                <button type="button" className="btn btn-outline-secondary" onClick={() => refillLives()}>
                  Rellenar vidas (demo)
                </button>
              </div>
            </form>

            {status === "wrong" && (
              <div className="alert alert-danger mt-3 mb-0">Incorrecto. ¡Intenta de nuevo!</div>
            )}
            {status === "correct" && (
              <div className="alert alert-success mt-3 mb-0">¡Correcto! Avanzando…</div>
            )}
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="duo-card h-100">
            <div className="fw-bold mb-2">Estado</div>
            <div className="small text-muted">Vidas</div>
            <div className="mb-3">
              <HeartLives />
            </div>
            {lives < 5 && nextLifeIn > 0 && (
              <div className="small text-muted">
                Siguiente vida en{" "}
                <strong>
                  {Math.floor(nextLifeIn / 60)}:{String(nextLifeIn % 60).padStart(2, "0")}
                </strong>{" "}
                min
              </div>
            )}
            <div className="small text-muted mt-3">Dificultad</div>
            <div className="progress" role="progressbar" aria-label="Dificultad">
              <div
                className="progress-bar bg-success"
                style={{ width: `${Math.min(100, 20 + ((currentLevel % 5) * 20))}%` }}
              ></div>
            </div>
            <div className="text-muted small mt-3">
              Cada 5 niveles aparece un cofre con recompensas aleatorias.
            </div>
          </div>
        </div>
      </div>

      {showChest && (
        <div className="mt-3">
          <RewardChest onClose={() => setShowChest(false)} />
        </div>
      )}
    </div>
  );
}
