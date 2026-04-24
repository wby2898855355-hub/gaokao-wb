import { Router } from 'express';
import { queryAll, queryOne, execute } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Get comments for a post (flat list with parent_id for nesting)
router.get('/posts/:postId/comments', (req, res) => {
  const postId = parseInt(req.params.postId);

  // Get post to know the OP (original poster) user_id
  const post = queryOne('SELECT user_id FROM posts WHERE id = ?', { '?': postId });
  const opUserId = post ? post.user_id : null;

  const comments = queryAll(
    `SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.is_anonymous,
            c.created_at, c.updated_at, c.is_edited,
            u.nickname, u.avatar_url
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.post_id = ?
     ORDER BY c.created_at ASC`,
    { '?': postId }
  );

  res.json({ comments, opUserId });
});

// Create comment
router.post('/posts/:postId/comments', authMiddleware, (req, res) => {
  const postId = parseInt(req.params.postId);
  const { content, parent_id, is_anonymous } = req.body;

  // Verify post exists
  const post = queryOne('SELECT id FROM posts WHERE id = ?', { '?': postId });
  if (!post) {
    return res.status(404).json({ error: '帖子不存在' });
  }

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }

  if (content.length > 1000) {
    return res.status(400).json({ error: '评论不能超过1000个字符' });
  }

  // If replying to a comment, verify parent exists and belongs to same post
  if (parent_id) {
    const parent = queryOne('SELECT id FROM comments WHERE id = ? AND post_id = ?',
      { '?': parseInt(parent_id), '?1': postId });
    if (!parent) {
      return res.status(400).json({ error: '回复的评论不存在' });
    }
  }

  const result = execute(
    'INSERT INTO comments (post_id, user_id, parent_id, content, is_anonymous) VALUES (?, ?, ?, ?, ?)',
    {
      '?': postId,
      '?1': req.userId,
      '?2': parent_id ? parseInt(parent_id) : null,
      '?3': content.trim(),
      '?4': is_anonymous ? 1 : 0
    }
  );

  const comment = queryOne(
    `SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.is_anonymous,
            c.created_at, c.updated_at, c.is_edited,
            u.nickname, u.avatar_url
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.id = ?`,
    { '?': result.lastInsertRowid }
  );

  res.status(201).json(comment);
});

// Update comment
router.put('/comments/:id', authMiddleware, (req, res) => {
  const commentId = parseInt(req.params.id);
  const comment = queryOne('SELECT * FROM comments WHERE id = ?', { '?': commentId });

  if (!comment) {
    return res.status(404).json({ error: '评论不存在' });
  }
  if (comment.user_id !== req.userId) {
    return res.status(403).json({ error: '只能编辑自己的评论' });
  }

  const { content } = req.body;
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }

  execute(
    'UPDATE comments SET content = ?, updated_at = datetime(\'now\'), is_edited = 1 WHERE id = ?',
    { '?': content.trim(), '?1': commentId }
  );

  const updated = queryOne(
    `SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.is_anonymous,
            c.created_at, c.updated_at, c.is_edited,
            u.nickname, u.avatar_url
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.id = ?`,
    { '?': commentId }
  );

  res.json(updated);
});

// Delete comment
router.delete('/comments/:id', authMiddleware, (req, res) => {
  const commentId = parseInt(req.params.id);
  const comment = queryOne('SELECT * FROM comments WHERE id = ?', { '?': commentId });

  if (!comment) {
    return res.status(404).json({ error: '评论不存在' });
  }
  if (comment.user_id !== req.userId) {
    return res.status(403).json({ error: '只能删除自己的评论' });
  }

  execute('DELETE FROM comments WHERE id = ?', { '?': commentId });
  res.json({ success: true });
});

export default router;
