import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FaAt, FaUserPlus, FaUserMinus } from "react-icons/fa";
import UserAvatar from "../components/UserAvatar.jsx";
import { ensureUserByUsername, follow, unfollow, isFollowing, getFollowers, getFollowing, ensureUserById } from "../services/social.js";

export default function UserPublic() {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  useEffect(() => {
    const u = ensureUserByUsername(username);
    setUser(u || null);
    if (u) {
      setFollowers(getFollowers(u.id).map(ensureUserById).filter(Boolean));
      setFollowing(getFollowing(u.id).map(ensureUserById).filter(Boolean));
    }
  }, [username]);

  if (!user) return <div className="container"><div className="duo-card">Usuario no encontrado.</div></div>;

  const amIFollowing = isFollowing(user.id);

  function doFollow() {
    follow(user.id);
    setFollowers(getFollowers(user.id).map(ensureUserById).filter(Boolean));
  }
  function doUnfollow() {
    unfollow(user.id);
    setFollowers(getFollowers(user.id).map(ensureUserById).filter(Boolean));
  }

  return (
    <div className="container">
      <div className="duo-card">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <UserAvatar src={user.avatar} emoji={user.emoji} name={user.name} size={96} editable={false}/>
          <div className="flex-grow-1">
            <div className="h4 mb-0">{user.name}</div>
            <div className="text-muted"><FaAt/> @{user.username}</div>
            <div className="small text-muted">Nivel {user.stats?.level} • {user.stats?.xp} XP • {user.stats?.division}</div>
            {user.bio && <div className="mt-2">{user.bio}</div>}
          </div>
          <div>
            {amIFollowing
              ? <button className="btn btn-outline-danger" onClick={doUnfollow}><FaUserMinus className="me-1"/>Dejar de seguir</button>
              : <button className="btn btn-duo" onClick={doFollow}><FaUserPlus className="me-1"/>Seguir</button>}
          </div>
        </div>
        <hr/>
        <div className="d-flex gap-3">
          <div><strong>{followers.length}</strong> Seguidores</div>
          <div><strong>{following.length}</strong> Siguiendo</div>
          <div><strong>Racha</strong> {user.stats?.streak}d</div>
        </div>
      </div>
    </div>
  );
}
