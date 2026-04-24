import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthModal from './AuthModal';
import './Header.css';

export default function Header() {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(decodeURIComponent(stored))); } catch {}
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setShowAuth(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const refreshUser = () => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(decodeURIComponent(stored))); } catch {}
    }
  };

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="logo">未选择的路</Link>
          <div className="header-right">
            {user ? (
              <div className="user-info">
                <img
                  src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.nickname)}`}
                  alt=""
                  className="avatar-small"
                  onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=U`; }}
                />
                <span className="user-nickname">{user.nickname}</span>
                <button className="btn-logout" onClick={() => setShowAuth(true)}>设置</button>
                <button className="btn-logout" onClick={handleLogout}>退出</button>
              </div>
            ) : (
              <button className="btn-login" onClick={() => setShowAuth(true)}>
                微信登录
              </button>
            )}
          </div>
        </div>
      </header>
      {showAuth && (
        <AuthModal
          user={user}
          onClose={() => setShowAuth(false)}
          onLoginSuccess={handleLoginSuccess}
          onProfileUpdate={refreshUser}
        />
      )}
    </>
  );
}
