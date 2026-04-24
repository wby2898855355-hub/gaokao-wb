import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { regions } from '../utils/regions';
import PostCard from '../components/PostCard';
import PostForm from '../components/PostForm';
import AuthModal from '../components/AuthModal';
import './Forum.css';

function parseForumKey(key) {
  const parts = key.split('_');
  if (parts.length < 4) return null;
  return {
    year: parts[0],
    region: regions[parseInt(parts[1])] || '未知',
    subject: parts[2] === '1' ? '文科（历史类）' : '理科（物理类）',
    scoreRange: parts.slice(3).join('_')
  };
}

export default function Forum() {
  const { forumKey } = useParams();
  const [info, setInfo] = useState(null);
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [showPostForm, setShowPostForm] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const fetchPosts = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getPosts(forumKey, page);
      setPosts(data.posts);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [forumKey]);

  useEffect(() => {
    setInfo(parseForumKey(forumKey));
    fetchPosts();
  }, [forumKey, fetchPosts]);

  const handleFabClick = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setShowAuth(true);
    } else {
      setEditingPost(null);
      setShowPostForm(true);
    }
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    setShowPostForm(true);
  };

  const handlePostSuccess = () => {
    setShowPostForm(false);
    setEditingPost(null);
    fetchPosts(pagination.page);
  };

  const handleLoginSuccess = () => {
    setShowAuth(false);
    setEditingPost(null);
    setShowPostForm(true);
  };

  if (!info) {
    return <div className="loading">无效的论坛参数</div>;
  }

  return (
    <div className="forum">
      <div className="forum-header">
        <div className="container">
          <Link to="/" className="back-link">&larr; 返回首页</Link>
          <h2 className="forum-title">
            {info.year}年 · {info.region} · {info.subject}
          </h2>
          <p className="forum-score">分数段：{info.scoreRange} 分</p>
        </div>
      </div>

      <div className="container">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : error ? (
          <div className="loading">{error}</div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: 40 }}>🍃</p>
            <p>还没有人分享，来做第一个吧</p>
          </div>
        ) : (
          <>
            <div className="post-list">
              {posts.map(post => (
                <PostCard key={post.id} post={post} onEdit={handleEditPost} />
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn-outline"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchPosts(pagination.page - 1)}
                >
                  上一页
                </button>
                <span className="page-info">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  className="btn-outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchPosts(pagination.page + 1)}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={handleFabClick} title="发布帖子">
        +
      </button>

      {/* Post creation/edit modal */}
      {showPostForm && (
        <PostForm
          forumKey={forumKey}
          post={editingPost}
          onClose={() => { setShowPostForm(false); setEditingPost(null); }}
          onSuccess={handlePostSuccess}
        />
      )}

      {/* Auth modal */}
      {showAuth && (
        <AuthModal
          user={null}
          onClose={() => setShowAuth(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
}
