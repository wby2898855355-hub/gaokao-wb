import { useState } from 'react';
import { api } from '../utils/api';

export default function PostForm({ forumKey, post, onClose, onSuccess }) {
  const isEdit = !!post;
  const [title, setTitle] = useState(post ? post.title : '');
  const [content, setContent] = useState(post ? post.content : '');
  const [isAnonymous, setIsAnonymous] = useState(post ? post.is_anonymous : false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('请输入标题'); return; }
    if (!content.trim()) { setError('请输入内容'); return; }

    setSubmitting(true);
    setError('');
    try {
      if (isEdit) {
        await api.updatePost(post.id, { title: title.trim(), content: content.trim() });
      } else {
        await api.createPost(forumKey, { title: title.trim(), content: content.trim(), is_anonymous: isAnonymous });
      }
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h2>{isEdit ? '编辑帖子' : '发布帖子'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>标题</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="输入标题..."
              maxLength={100}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>内容</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="分享你的故事..."
              rows={6}
            />
          </div>
          {!isEdit && (
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={e => setIsAnonymous(e.target.checked)}
                  style={{ width: 'auto', margin: 0 }}
                />
                匿名发帖（不会显示你的头像和昵称）
              </label>
            </div>
          )}
          {error && <p className="error-msg" style={{ marginBottom: 12 }}>{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose}>取消</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? '发布中...' : (isEdit ? '保存修改' : '发布')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
