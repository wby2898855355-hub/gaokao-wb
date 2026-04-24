import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import PostForm from '../components/PostForm';
import './PostDetail.css';

function formatTime(t) {
  const d = new Date(t.replace(' ', 'T') + (t.includes('Z') ? '' : 'Z'));
  if (isNaN(d.getTime())) return t;
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getUserFromStorage() {
  const stored = localStorage.getItem('user');
  if (stored) {
    try { return JSON.parse(decodeURIComponent(stored)); } catch { return null; }
  }
  return null;
}

// ── Comment item component ──
function CommentItem({ comment, opUserId, currentUserId, postId, onRefresh, depth = 0 }) {
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyAnon, setReplyAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const isOP = comment.user_id === opUserId;
  const isOwner = currentUserId === comment.user_id;
  const isAnonymous = comment.is_anonymous === 1 || comment.is_anonymous === true;
  const displayName = isAnonymous ? '匿名用户' : comment.nickname;
  const displayAvatar = isAnonymous
    ? 'https://api.dicebear.com/7.x/initials/svg?seed=anonymous'
    : (comment.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(comment.nickname)}`);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setSubmitting(true);
    try {
      await api.createComment(postId, {
        content: replyContent.trim(),
        parent_id: comment.id,
        is_anonymous: replyAnon
      });
      setReplyContent('');
      setReplyAnon(false);
      setShowReply(false);
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    try {
      await api.updateComment(comment.id, { content: editContent.trim() });
      setEditing(false);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这条评论吗？')) return;
    try {
      await api.deleteComment(comment.id);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className={`comment-item ${depth > 0 ? 'comment-nested' : ''}`} style={{ marginLeft: depth > 0 ? Math.min(depth * 28, 84) : 0 }}>
      <div className="comment-inner">
        <img src={displayAvatar} alt="" className="comment-avatar"
          onError={(e) => { e.target.src = 'https://api.dicebear.com/7.x/initials/svg?seed=U'; }} />
        <div className="comment-body">
          <div className="comment-header">
            <span className={`comment-nick ${isAnonymous ? 'comment-anon' : ''}`}>{displayName}</span>
            {isOP && <span className="op-badge">楼主</span>}
            <span className="comment-time">
              {formatTime(comment.created_at)}
              {comment.is_edited ? ` · 编辑于 ${formatTime(comment.updated_at)}` : ''}
            </span>
          </div>

          {editing ? (
            <div className="comment-edit-form">
              <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3} />
              <div className="comment-edit-actions">
                <button className="btn-outline" onClick={() => { setEditing(false); setEditContent(comment.content); }}>取消</button>
                <button className="btn-primary" onClick={handleEdit}>保存</button>
              </div>
            </div>
          ) : (
            <div className="comment-content">{comment.content}</div>
          )}

          <div className="comment-actions">
            {currentUserId && (
              <button className="comment-act-btn" onClick={() => setShowReply(!showReply)}>
                {showReply ? '取消回复' : '回复'}
              </button>
            )}
            {isOwner && !editing && (
              <>
                <button className="comment-act-btn" onClick={() => setEditing(true)}>编辑</button>
                <button className="comment-act-btn comment-del" onClick={handleDelete}>删除</button>
              </>
            )}
          </div>

          {showReply && (
            <form className="reply-form" onSubmit={handleReply}>
              <textarea
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder={`回复 ${isAnonymous ? '匿名用户' : comment.nickname}...`}
                rows={3}
              />
              <div className="reply-form-bottom">
                <label className="anon-label">
                  <input type="checkbox" checked={replyAnon} onChange={e => setReplyAnon(e.target.checked)} />
                  匿名
                </label>
                <button type="submit" className="btn-primary" disabled={submitting || !replyContent.trim()}>
                  {submitting ? '发送中...' : '回复'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Child replies */}
      {comment.replies?.map(reply => (
        <CommentItem
          key={reply.id}
          comment={reply}
          opUserId={opUserId}
          currentUserId={currentUserId}
          postId={postId}
          onRefresh={onRefresh}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

// ── Main PostDetail page ──
export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);

  // Comments state
  const [comments, setComments] = useState([]);
  const [opUserId, setOpUserId] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [newCommentAnon, setNewCommentAnon] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const currentUser = getUserFromStorage();
  const currentUserId = currentUser?.id;

  const loadPost = useCallback(async () => {
    try {
      const data = await api.getPost(postId);
      setPost(data);
    } catch (err) {
      setError(err.message);
    }
  }, [postId]);

  const loadComments = useCallback(async () => {
    try {
      const data = await api.getComments(postId);
      setOpUserId(data.opUserId);

      // Build comment tree: top-level + nested replies
      const commentMap = {};
      const topLevel = [];
      for (const c of data.comments) {
        c.replies = [];
        commentMap[c.id] = c;
      }
      for (const c of data.comments) {
        if (c.parent_id && commentMap[c.parent_id]) {
          commentMap[c.parent_id].replies.push(c);
        } else if (!c.parent_id) {
          topLevel.push(c);
        }
      }
      setComments(topLevel);
    } catch (err) {
      // silently fail, comments are optional
    }
  }, [postId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadPost();
      setLoading(false);
    })();
    loadComments();
  }, [postId, loadPost, loadComments]);

  const handleEditSuccess = () => {
    setShowEdit(false);
    loadPost();
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这个帖子吗？')) return;
    try {
      await api.deletePost(postId);
      navigate(-1);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUserId) return;
    setCommentSubmitting(true);
    try {
      await api.createComment(postId, { content: newComment.trim(), is_anonymous: newCommentAnon });
      setNewComment('');
      setNewCommentAnon(false);
      loadComments();
    } catch (err) {
      alert(err.message);
    } finally {
      setCommentSubmitting(false);
    }
  };

  if (loading) return <div className="loading">加载中...</div>;
  if (error) return <div className="loading">{error}</div>;
  if (!post) return <div className="loading">帖子不存在</div>;

  const isOwner = currentUserId === post.user_id;
  const isPostAnon = post.is_anonymous === 1 || post.is_anonymous === true;
  const postDisplayName = isPostAnon ? '匿名用户' : post.nickname;
  const postDisplayAvatar = isPostAnon
    ? 'https://api.dicebear.com/7.x/initials/svg?seed=anonymous'
    : (post.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(post.nickname)}`);

  return (
    <div className="post-detail">
      <div className="container">
        <Link to={`/forum/${encodeURIComponent(post.forum_key)}`} className="back-link">
          &larr; 返回论坛
        </Link>

        <div className="card post-detail-card">
          <div className="post-meta">
            <img src={postDisplayAvatar} alt="" className="avatar"
              onError={(e) => { e.target.src = 'https://api.dicebear.com/7.x/initials/svg?seed=U'; }} />
            <div className="meta-text">
              <span className={`nickname ${isPostAnon ? 'nickname-anon' : ''}`}>{postDisplayName}</span>
              <span className="time">
                发布于 {formatTime(post.created_at)}
                {post.is_edited ? ` · 编辑于 ${formatTime(post.updated_at)}` : ''}
              </span>
            </div>
          </div>

          <h1 className="post-title">{post.title}</h1>
          <div className="post-content">{post.content}</div>

          {isOwner && (
            <div className="post-actions">
              <button className="btn-outline" onClick={() => setShowEdit(true)}>编辑</button>
              <button className="btn-outline" onClick={handleDelete} style={{ color: '#e74c3c', borderColor: '#e74c3c' }}>删除</button>
            </div>
          )}
        </div>

        {/* ── Comment Section ── */}
        <div className="comment-section">
          <h3 className="comment-section-title">评论 ({comments.length})</h3>

          {/* New comment form */}
          {currentUserId ? (
            <form className="comment-main-form" onSubmit={handleCommentSubmit}>
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="写下你的评论..."
                rows={3}
              />
              <div className="reply-form-bottom">
                <label className="anon-label">
                  <input type="checkbox" checked={newCommentAnon} onChange={e => setNewCommentAnon(e.target.checked)} />
                  匿名
                </label>
                <button type="submit" className="btn-primary" disabled={commentSubmitting || !newComment.trim()}>
                  {commentSubmitting ? '发送中...' : '发表评论'}
                </button>
              </div>
            </form>
          ) : (
            <p className="comment-login-hint">请先登录后再发表评论</p>
          )}

          {/* Comment list */}
          {comments.length === 0 ? (
            <p className="comment-empty">暂无评论，来说点什么吧</p>
          ) : (
            <div className="comment-list">
              {comments.map(c => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  opUserId={opUserId}
                  currentUserId={currentUserId}
                  postId={parseInt(postId)}
                  onRefresh={loadComments}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showEdit && (
        <PostForm
          forumKey={post.forum_key}
          post={post}
          onClose={() => setShowEdit(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
