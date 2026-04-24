import { Link } from 'react-router-dom';
import './PostCard.css';

export default function PostCard({ post, onEdit }) {
  const currentUserId = (() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { return JSON.parse(decodeURIComponent(stored)).id; } catch { return null; }
    }
    return null;
  })();

  const formatTime = (t) => {
    const d = new Date(t.replace(' ', 'T') + (t.includes('Z') ? '' : 'Z'));
    if (isNaN(d.getTime())) return t;
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const isOwner = currentUserId === post.user_id;
  const isAnonymous = post.is_anonymous === 1 || post.is_anonymous === true;
  const displayName = isAnonymous ? '匿名用户' : post.nickname;
  const displayAvatar = isAnonymous
    ? `https://api.dicebear.com/7.x/initials/svg?seed=anonymous`
    : (post.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(post.nickname)}`);

  return (
    <div className="card post-card">
      <div className="post-card-meta">
        <img
          src={displayAvatar}
          alt=""
          className="avatar-small"
          onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=U`; }}
        />
        <div className="meta-text">
          <div className="meta-top">
            <span className={`nickname ${isAnonymous ? 'nickname-anon' : ''}`}>{displayName}</span>
            <span className="time">
              发布于 {formatTime(post.created_at)}
              {post.is_edited ? ` · 编辑于 ${formatTime(post.updated_at)}` : ''}
            </span>
          </div>
        </div>
      </div>

      <Link to={`/post/${post.id}`} className="post-card-body">
        <h3 className="post-card-title">{post.title}</h3>
        <p className="post-card-preview">
          {post.content.length > 150 ? post.content.slice(0, 150) + '...' : post.content}
        </p>
      </Link>

      {isOwner && (
        <div className="post-card-actions">
          <button className="btn-edit" onClick={(e) => { e.preventDefault(); onEdit(post); }}>
            编辑
          </button>
        </div>
      )}
    </div>
  );
}
