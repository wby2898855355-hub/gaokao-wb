import { useState } from 'react';
import { api } from '../utils/api';

export default function AuthModal({ user, onClose, onLoginSuccess, onProfileUpdate }) {
  const isLoggedIn = !!user;
  const [mode, setMode] = useState(isLoggedIn ? 'profile' : 'login');
  const [nickname, setNickname] = useState(user ? user.nickname : '');
  const [avatarUrl, setAvatarUrl] = useState(user ? (user.avatar_url || '') : '');
  const [useWechatInfo, setUseWechatInfo] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = () => {
    // Open mock WeChat login
    const popup = window.open(
      `/api/auth/wechat/mock?redirect=${encodeURIComponent(window.location.href)}`,
      'wechat-login',
      'width=500,height=600'
    );

    // Listen for storage change (login completes)
    const handler = (e) => {
      if (e.key === 'token' && e.newValue) {
        window.removeEventListener('storage', handler);
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userData = JSON.parse(decodeURIComponent(storedUser));
            onLoginSuccess(userData);
          } catch {}
        }
      }
    };
    window.addEventListener('storage', handler);

    // Fallback: poll for completion
    const interval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token) {
        clearInterval(interval);
        window.removeEventListener('storage', handler);
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userData = JSON.parse(decodeURIComponent(storedUser));
            onLoginSuccess(userData);
          } catch {}
        }
      }
    }, 1000);
  };

  const handleUpdateProfile = async () => {
    if (!nickname.trim()) {
      setError('昵称不能为空');
      return;
    }
    setUpdating(true);
    setError('');
    try {
      const updated = await api.updateProfile({
        nickname: nickname.trim(),
        avatar_url: useWechatInfo ? null : (avatarUrl.trim() || null)
      });
      localStorage.setItem('user', encodeURIComponent(JSON.stringify({
        id: updated.id,
        nickname: updated.nickname,
        avatar_url: updated.avatar_url
      })));
      if (onProfileUpdate) onProfileUpdate();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        {!isLoggedIn && mode === 'login' ? (
          <>
            <h2>登录论坛</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
              使用微信登录，参与讨论
            </p>
            <button
              className="btn-primary"
              style={{ width: '100%', padding: 12, fontSize: 16 }}
              onClick={handleLogin}
            >
              微信登录
            </button>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 12 }}>
              当前为开发模式，使用模拟登录
            </p>
          </>
        ) : (
          <>
            <h2>{isLoggedIn ? '编辑个人资料' : '设置个人信息'}</h2>
            <div className="form-group">
              <label>昵称</label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="输入昵称..."
                maxLength={20}
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={useWechatInfo}
                  onChange={e => setUseWechatInfo(e.target.checked)}
                  style={{ width: 'auto', marginRight: 6 }}
                />
                使用微信头像和昵称
              </label>
            </div>
            {!useWechatInfo && (
              <div className="form-group">
                <label>头像链接（可选）</label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            )}
            {error && <p className="error-msg" style={{ marginBottom: 12 }}>{error}</p>}
            <div className="modal-actions">
              <button className="btn-outline" onClick={onClose}>取消</button>
              <button className="btn-primary" onClick={handleUpdateProfile} disabled={updating}>
                {updating ? '保存中...' : '保存'}
              </button>
            </div>
          </>
        )}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'none', fontSize: 18, color: 'var(--text-muted)',
            lineHeight: 1
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
