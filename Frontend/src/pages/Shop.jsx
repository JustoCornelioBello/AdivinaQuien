// src/pages/Shop.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  FaSearch, FaBolt, FaShieldAlt, FaGem, FaCoins, FaCrown, FaTrophy, FaMedal, FaStar,
} from "react-icons/fa";
import { useUser } from "../context/UserContext.jsx";
import {
  getCatalog, buyItem, getOwned, isOwned,
  getShields, getProfileBadges, equipBadge
} from "../services/store.js";
import "./shop.css";

// Icono por tipo
function KindIcon({ type }) {
  if (type === "boost") return <FaBolt />;
  if (type === "streak") return <FaShieldAlt />;
  if (type === "currency" || type === "exchange") return <FaCoins />;
  if (type === "premium") return <FaCrown />;
  if (type === "bundle") return <FaTrophy />;
  if (type === "consumable") return <FaMedal />;
  return <FaStar />;
}

function PriceTag({ item }) {
  if (item.priceUSD) {
    return <span className="chip price dollar">US$ {item.priceUSD.toFixed(2)}</span>;
  }
  return (
    <div className="price-row">
      {item.costCoins ? <span className="chip price coins"><FaCoins />{item.costCoins}</span> : null}
      {item.costDiamonds ? <span className="chip price gems"><FaGem />{item.costDiamonds}</span> : null}
    </div>
  );
}

function ItemCard({ item, owned, onBuy }) {
  return (
    <div className={`shop-card hover-rise ${owned ? "owned" : ""}`}>
      <div className="card-top">
        <div className="kind-badge">
          <KindIcon type={item.type} />
        </div>
        <PriceTag item={item} />
      </div>

      <div className="card-body">
        <div className="title-row">
          <div className="title">
            {item.name} {item.premiumBadge ? <span className="badge-emoji">{item.premiumBadge}</span> : null}
          </div>
        </div>
        <div className="desc">{item.desc}</div>

        {(item.minutes || item.shields || item.grantCoins || item.grantDiamonds) && (
          <div className="facts">
            {item.minutes ? <span>• Boost: <strong>{item.minutes}m</strong></span> : null}
            {item.shields ? <span>• Protectores: <strong>{item.shields}</strong></span> : null}
            {item.grantCoins ? <span>• +<strong>{item.grantCoins}</strong> 🪙</span> : null}
            {item.grantDiamonds ? <span>• +<strong>{item.grantDiamonds}</strong> 💎</span> : null}
          </div>
        )}
      </div>

      <div className="card-footer">
        {owned
          ? <button className="btn ghost" disabled>Adquirido</button>
          : <button className="btn primary" onClick={onBuy}>Comprar</button>
        }
      </div>
    </div>
  );
}

function Toast({ show, text, onHide }) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onHide, 1800);
    return () => clearTimeout(t);
  }, [show, onHide]);
  return (
    <div className={`toasty ${show ? "in" : ""}`}>
      <div className="toast-card">{text}</div>
    </div>
  );
}

export default function Shop() {
  const { coins, diamonds, addCoins, addDiamonds, grantBoost } = useUser();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | premium | real | utility | owned
  const [toast, setToast] = useState({ show: false, text: "" });

  const catalog = useMemo(() => getCatalog(), []);
  const [ownedList, setOwnedList] = useState(() => getOwned());
  const shields = getShields();
  const { badges, equipped } = getProfileBadges();

  const api = { addCoins, addDiamonds, grantBoost, coins, diamonds };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter(item => {
      const matchesQ = !q || [item.name, item.desc].join(" ").toLowerCase().includes(q);
      if (!matchesQ) return false;
      if (filter === "premium") return item.type === "premium" || !!item.premiumBadge;
      if (filter === "real")    return !!item.priceUSD || !!item.real;
      if (filter === "utility") return ["boost","streak","consumable","exchange","currency","bundle"].includes(item.type) && !item.priceUSD;
      if (filter === "owned")   return ownedList.includes(item.id);
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, query, filter, ownedList]);

  async function handleBuy(item) {
    const res = await buyItem(item, api);
    if (!res?.ok) {
      if (res?.reason === "coins") setToast({ show: true, text: "No tienes suficientes monedas." });
      if (res?.reason === "diamonds") setToast({ show: true, text: "No tienes suficientes diamantes." });
      return;
    }
    setOwnedList(getOwned()); // refresca adquiridos
    setToast({ show: true, text: "¡Compra realizada!" });
  }

  return (
    <div className="shop-wrap container">
      {/* Saldo & búsqueda */}
      <div className="shop-header">
        <div className="wallet">
          <div className="chip stat"><FaCoins /> {coins.toLocaleString()} <span>Monedas</span></div>
          <div className="chip stat gems"><FaGem /> {diamonds.toLocaleString()} <span>Diamantes</span></div>
          <div className="chip stat shield"><FaShieldAlt /> {shields} <span>Protectores</span></div>
        </div>
        <div className="search">
          <div className="searchbox">
            <FaSearch />
            <input
              className="search-input"
              placeholder="Buscar artículo…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters">
        <button className={`pill ${filter==="all" ? "active" : ""}`} onClick={()=>setFilter("all")}>Todos</button>
        <button className={`pill ${filter==="premium" ? "active" : ""}`} onClick={()=>setFilter("premium")}><FaCrown/> Premium</button>
        <button className={`pill ${filter==="real" ? "active" : ""}`} onClick={()=>setFilter("real")}>$ Real</button>
        <button className={`pill ${filter==="utility" ? "active" : ""}`} onClick={()=>setFilter("utility")}>Utilidad</button>
        <button className={`pill ${filter==="owned" ? "active" : ""}`} onClick={()=>setFilter("owned")}>Mis artículos</button>
      </div>

      {/* Grid de productos */}
      <div className="shop-grid">
        {filtered.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            owned={ownedList.includes(item.id)}
            onBuy={() => handleBuy(item)}
          />
        ))}
      </div>

      {/* Mis insignias premium (aparecen en Perfil) */}
      <div className="section-card">
        <div className="section-head">
          <h6>Mis insignias premium</h6>
          <div className="muted">Las verás en tu Perfil. Puedes equipar una.</div>
        </div>
        {badges.length === 0 ? (
          <div className="muted">Aún no tienes insignias premium.</div>
        ) : (
          <div className="badges-row">
            {badges.map(b => (
              <button
                key={b}
                className={`badge-btn ${equipped === b ? "equiped" : ""}`}
                onClick={() => { equipBadge(b); setToast({ show: true, text: "Insignia equipada ✔" }); }}
                title={equipped === b ? "Actualmente equipada" : "Equipar"}
              >
                <span className="emoji">{b}</span>
                <span className="label">{equipped === b ? "Equipado" : "Equipar"}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Toast show={toast.show} text={toast.text} onHide={() => setToast(s => ({...s, show:false}))}/>
    </div>
  );
}
