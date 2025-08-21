// src/pages/Games.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import GameCard from "../components/GameCard.jsx";
import LivesTimer, { loseLifeFor } from "../components/LivesTimer.jsx";
import RewardChest from "../components/RewardChest.jsx";
import { GAMES, buildLevels } from "../games/data.js";
import { useUser } from "../context/UserContext.jsx";
import { burstConfetti } from "../utils/confetti.js";

// storage keys
const kLevel = (id) => `game_level_${id}`; // 1..25
const kStats = (id) => `game_stats_${id}`; // {wins, fails}
const kHints = (id) => `game_hints_${id}`; // used hints for current level today

export default function Games(){
  const { addXp, addCoins } = useUser();
  const [selected, setSelected] = useState(GAMES[0].id);
  const [showChest, setShowChest] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);

  // Progreso por juego
  const levelsByGame = useMemo(() => {
    const o = {};
    for (const g of GAMES) {
      const lv = parseInt(localStorage.getItem(kLevel(g.id)) || "1", 10) || 1;
      o[g.id] = Math.max(1, Math.min(25, lv));
    }
    return o;
  }, [fadeKey]);

  function resetGame(id){
    localStorage.setItem(kLevel(id), "1");
    localStorage.setItem(kHints(id), "0");
    localStorage.setItem(kStats(id), JSON.stringify({wins:0,fails:0}));
    setFadeKey(f => f+1);
  }

  const curLevel = levelsByGame[selected] || 1;
  const levels = useMemo(() => buildLevels(selected), [selected]);
  const stage = levels[curLevel-1];

  return (
    <div className="container-fluid">
      <div className="row g-3">
        {/* LISTA DE JUEGOS */}
        <div className="col-12 col-lg-4">
          <div className="row g-2" style={{height:'700px', overflow:'auto', padding:'4px', borderRadius:'3px'}}>
            {GAMES.map(g => (
              <div className="col-12" key={g.id}>
                <GameCard
                  game={g}
                  level={levelsByGame[g.id] || 1}
                  onSelect={setSelected}
                  onReset={resetGame}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ÁREA DE JUEGO */}
        <div className="col-12 col-lg-5">
          <div className={`duo-card game-stage fade-in`} key={`${selected}-${curLevel}`}>
            <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
              <div className="d-flex align-items-center gap-3">
                <div className="h5 mb-0">{GAMES.find(x=>x.id===selected)?.title}</div>
                <span className="badge bg-success-subtle text-success">Nivel {curLevel}/25</span>
              </div>
              <LivesTimer gameId={selected} onChange={()=>{}} />
            </div>

            <GameRuntime
              gameId={selected}
              level={curLevel}
              stage={stage}
              onWin={()=>{
                // XP base + monedas base
                if (addXp) addXp(20);
                if (addCoins) addCoins(10);
                const next = Math.min(25, curLevel+1);
                localStorage.setItem(kLevel(selected), String(next));
                localStorage.setItem(kHints(selected), "0");
                const stats = JSON.parse(localStorage.getItem(kStats(selected)) || '{"wins":0,"fails":0}');
                stats.wins = (stats.wins||0)+1;
                localStorage.setItem(kStats(selected), JSON.stringify(stats));
                burstConfetti();
                setFadeKey(f => f+1);

                if (next % 5 === 1) {
                  // completó un múltiplo de 5
                  setShowChest(true);
                }
              }}
              onLose={()=>{
                const remain = loseLifeFor(selected);
                const stats = JSON.parse(localStorage.getItem(kStats(selected)) || '{"wins":0,"fails":0}');
                stats.fails = (stats.fails||0)+1;
                localStorage.setItem(kStats(selected), JSON.stringify(stats));
                if (remain <= 0) {
                  // sin vidas
                }
              }}
            />
          </div>

          {showChest && <RewardChest onClose={()=>setShowChest(false)} />}
        </div>

        {/* PANEL DERECHO: Progresos y Recomendaciones */}
        <div className="col-12 col-lg-3">
          <div className="duo-card">
            <h6 className="mb-2">Progreso por juego</h6>
            <ul className="list-unstyled m-0">
              {GAMES.map(g=>(
                <li key={g.id} className="d-flex align-items-center justify-content-between py-1">
                  <span className={`small ${g.id===selected?"fw-bold":""}`}>{g.title}</span>
                  <span className="small text-muted">Nivel {levelsByGame[g.id]}/25</span>
                </li>
              ))}
            </ul>
            <div className="progress mt-2" style={{ height: 8 }}>
              <div className="progress-bar"
                   style={{ width: `${Math.floor(
                     (Object.values(levelsByGame).reduce((a,b)=>a+b,0)-7) / (25*7-7) * 100
                   )}%`}}/>
            </div>
          </div>

          <div className="duo-card mt-3">
            <h6 className="mb-2">Recomendado</h6>
            <div className="small text-muted">Sigue tu mejor racha en: <strong>
              {GAMES.reduce((best, g)=>{
                const lv = levelsByGame[g.id];
                return !best || lv > levelsByGame[best.id] ? g : best;
              }, null)?.title}
            </strong></div>
            <div className="small text-muted mt-1">Tip: Usa menos pistas para más XP.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ========= Motor de juego por tipo ========= */
function GameRuntime({ gameId, level, stage, onWin, onLose }) {
  const game = GAMES.find(g=>g.id===gameId);
  if (!game) return null;

  if (game.type === "memory") return <MemoryGame gameId={gameId} level={level} pairs={stage.pairs} onWin={onWin} onLose={onLose}/>;
  if (game.type === "hangman") return <HangmanGame gameId={gameId} level={level} word={stage.word} hints={stage.hints} onWin={onWin} onLose={onLose}/>;
  // default QA
  return <QAGame gameId={gameId} level={level} answer={stage.answer} hints={stage.hints} onWin={onWin} onLose={onLose}/>;
}

/** ===== QA (Adivina, Quiz, etc.) ===== */
function QAGame({ gameId, level, answer, hints = [], onWin, onLose }) {
  const [usedHints, setUsedHints] = useState(() => parseInt(localStorage.getItem(`hints_${gameId}`) || "0", 10) || 0);
  const [val, setVal] = useState("");
  const [status, setStatus] = useState("idle"); // idle | wrong | correct

  function useHint(){
    if (usedHints >= 3) return;
    const n = usedHints + 1;
    setUsedHints(n);
    localStorage.setItem(`hints_${gameId}`, String(n));
  }

  function submit(e){
    e.preventDefault();
    const norm = (s) => s.trim().toLowerCase();
    if (norm(val) === norm(answer)) {
      setStatus("correct");
      setTimeout(()=> onWin && onWin(), 500);
    } else {
      setStatus("wrong");
      onLose && onLose();
    }
  }

  return (
    <>
      <div className="text-muted mb-2">Pistas disponibles: {3 - usedHints}</div>
      <div className="d-flex flex-wrap gap-2">
        {hints.slice(0, usedHints || 1).map((h, i)=>(
          <span key={i} className="hint-chip">💡 {h}</span>
        ))}
      </div>

      <form className="mt-3" onSubmit={submit}>
        <input
          className="form-control answer-input"
          placeholder="Escribe tu respuesta…"
          value={val}
          onChange={e=>setVal(e.target.value)}
        />
        <div className="d-flex gap-2 mt-3">
          <button type="submit" className="btn btn-duo">Confirmar</button>
          <button type="button" className="btn btn-ghost" disabled={usedHints>=3} onClick={useHint}>
            Pedir pista ({3-usedHints})
          </button>
        </div>
      </form>

      {status==="wrong" && <div className="alert alert-danger mt-3 mb-0">Incorrecto. ¡Intenta de nuevo!</div>}
      {status==="correct" && <div className="alert alert-success mt-3 mb-0">¡Correcto! Avanzando…</div>}
    </>
  );
}

/** ===== Ahorcado ===== */
function HangmanGame({ gameId, level, word, hints = [], onWin, onLose }) {
  const [usedHints, setUsedHints] = useState(0);
  const [guessed, setGuessed] = useState(new Set());
  const [status, setStatus] = useState("idle"); // idle wrong correct
  const [display, setDisplay] = useState(mask(word, guessed));

  function mask(w, gset){
    return w.split("").map(ch => (ch===" "||gset.has(ch))? ch : "_").join(" ");
  }

  function guess(ch){
    ch = ch.toLowerCase();
    if (guessed.has(ch) || !/[a-záéíóúñ]/i.test(ch)) return;
    const g2 = new Set(guessed); g2.add(ch);
    setGuessed(g2);
    const m = mask(word, g2);
    setDisplay(m);
    if (!word.toLowerCase().includes(ch)) {
      setStatus("wrong");
      onLose && onLose();
      setTimeout(()=>setStatus("idle"), 600);
    } else {
      if (m.replace(/ /g,"") === word.replace(/ /g,"")) {
        setStatus("correct");
        setTimeout(()=> onWin && onWin(), 500);
      }
    }
  }

  function useHint(){
    if (usedHints >= 3) return;
    setUsedHints(usedHints+1);
  }

  return (
    <>
      <div className="text-muted mb-2">Pistas disponibles: {3-usedHints}</div>
      <div className="d-flex flex-wrap gap-2">
        {hints.slice(0, usedHints || 1).map((h, i)=>(
          <span key={i} className="hint-chip">💡 {h}</span>
        ))}
      </div>

      <div className="display-6 my-3 monospace">{display}</div>

      <div className="d-flex flex-wrap gap-2">
        {"abcdefghijklmnñopqrstuvwxyz".split("").map(c=>(
          <button key={c} className="btn btn-outline-secondary btn-sm" disabled={guessed.has(c)} onClick={()=>guess(c)}>{c}</button>
        ))}
      </div>

      <div className="d-flex gap-2 mt-3">
        <button className="btn btn-ghost" disabled={usedHints>=3} onClick={useHint}>Pedir pista ({3-usedHints})</button>
      </div>

      {status==="wrong" && <div className="alert alert-danger mt-3 mb-0">Fallaste esa letra.</div>}
      {status==="correct" && <div className="alert alert-success mt-3 mb-0">¡Palabra completa!</div>}
    </>
  );
}

/** ===== Memoria ===== */
function MemoryGame({ gameId, level, pairs = 4, onWin, onLose }) {
  const [cards, setCards] = useState(() => {
    const ids = [];
    for (let i=0;i<pairs;i++){ ids.push(i,i); }
    // shuffle
    for(let i=ids.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [ids[i],ids[j]]=[ids[j],ids[i]]; }
    return ids.map((id, idx)=>({ id, key: idx+"-"+Math.random().toString(36).slice(2), open:false, done:false }));
  });
  const [sel, setSel] = useState([]);
  const [matched, setMatched] = useState(0);

  useEffect(()=>{
    if (matched === pairs) {
      setTimeout(()=> onWin && onWin(), 400);
    }
  }, [matched, pairs, onWin]);

  function clickCard(i){
    const c = cards[i];
    if (c.open || c.done) return;
    const next = cards.slice();
    next[i] = { ...c, open:true };
    setCards(next);
    const picks = [...sel, i];
    setSel(picks);
    if (picks.length === 2) {
      const [a,b] = picks;
      if (next[a].id === next[b].id) {
        setTimeout(()=>{
          const n2 = next.slice();
          n2[a] = { ...n2[a], done:true };
          n2[b] = { ...n2[b], done:true };
          setCards(n2);
          setMatched(m=>m+1);
          burstConfetti();
        }, 200);
        setSel([]);
      } else {
        // penaliza vida
        onLose && onLose();
        setTimeout(()=>{
          const n2 = next.slice();
          n2[a] = { ...n2[a], open:false };
          n2[b] = { ...n2[b], open:false };
          setCards(n2);
        }, 600);
        setSel([]);
      }
    }
  }

  const cols = pairs <= 6 ? 4 : pairs <= 8 ? 5 : 6;

  return (
    <>
      <div className="text-muted">Encuentra {pairs} parejas.</div>
      <div className="grid" style={{ display:"grid", gridTemplateColumns:`repeat(${cols}, 1fr)`, gap: "10px", marginTop:10 }}>
        {cards.map((c, i)=>(
          <button key={c.key} className={`card memory ${c.done? "done": c.open? "open": ""}`} onClick={()=>clickCard(i)}>
            <span className="front">?</span>
            <span className="back">{["🍏","🍌","🍓","🍇","🍊","🥝","🍒","🍍","🥑","🍉","🍑","🥥"][c.id % 12]}</span>
          </button>
        ))}
      </div>
    </>
  );
}
