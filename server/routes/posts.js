import { Router } from 'express';
import { queryAll, queryOne, execute } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// List posts in a forum
router.get('/forums/:forumKey/posts', (req, res) => {
  const { forumKey } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const offset = (page - 1) * limit;

  const posts = queryAll(
    `SELECT p.id, p.forum_key, p.user_id, p.title, p.content, p.is_anonymous,
            p.created_at, p.updated_at, p.is_edited,
            u.nickname, u.avatar_url
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.forum_key = ?
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    { '?': forumKey, '?1': limit, '?2': offset }
  );

  const countRow = queryOne(
    'SELECT COUNT(*) as count FROM posts WHERE forum_key = ?',
    { '?': forumKey }
  );
  const total = countRow ? countRow.count : 0;

  res.json({
    posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

// Get single post
router.get('/posts/:id', (req, res) => {
  const post = queryOne(
    `SELECT p.id, p.forum_key, p.user_id, p.title, p.content, p.is_anonymous,
            p.created_at, p.updated_at, p.is_edited,
            u.nickname, u.avatar_url
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.id = ?`,
    { '?': parseInt(req.params.id) }
  );

  if (!post) {
    return res.status(404).json({ error: '帖子不存在' });
  }

  res.json(post);
});

// Create post
router.post('/forums/:forumKey/posts', authMiddleware, (req, res) => {
  const { forumKey } = req.params;
  const { title, content, is_anonymous } = req.body;

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: '标题不能为空' });
  }
  if (title.length > 100) {
    return res.status(400).json({ error: '标题不能超过100个字符' });
  }
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: '内容不能为空' });
  }

  const result = execute(
    'INSERT INTO posts (forum_key, user_id, title, content, is_anonymous) VALUES (?, ?, ?, ?, ?)',
    { '?': forumKey, '?1': req.userId, '?2': title.trim(), '?3': content.trim(), '?4': is_anonymous ? 1 : 0 }
  );

  const post = queryOne(
    `SELECT p.id, p.forum_key, p.user_id, p.title, p.content, p.is_anonymous,
            p.created_at, p.updated_at, p.is_edited,
            u.nickname, u.avatar_url
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.id = ?`,
    { '?': result.lastInsertRowid }
  );

  res.status(201).json(post);
});

// Update post
router.put('/posts/:id', authMiddleware, (req, res) => {
  const postId = parseInt(req.params.id);
  const post = queryOne('SELECT * FROM posts WHERE id = ?', { '?': postId });

  if (!post) {
    return res.status(404).json({ error: '帖子不存在' });
  }
  if (post.user_id !== req.userId) {
    return res.status(403).json({ error: '只能编辑自己的帖子' });
  }

  const { title, content } = req.body;

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: '标题不能为空' });
  }
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: '内容不能为空' });
  }

  execute(
    'UPDATE posts SET title = ?, content = ?, updated_at = datetime(\'now\'), is_edited = 1 WHERE id = ?',
    { '?': title.trim(), '?1': content.trim(), '?2': postId }
  );

  const updated = queryOne(
    `SELECT p.id, p.forum_key, p.user_id, p.title, p.content, p.is_anonymous,
            p.created_at, p.updated_at, p.is_edited,
            u.nickname, u.avatar_url
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.id = ?`,
    { '?': postId }
  );

  res.json(updated);
});

// Delete post
router.delete('/posts/:id', authMiddleware, (req, res) => {
  const postId = parseInt(req.params.id);
  const post = queryOne('SELECT * FROM posts WHERE id = ?', { '?': postId });

  if (!post) {
    return res.status(404).json({ error: '帖子不存在' });
  }
  if (post.user_id !== req.userId) {
    return res.status(403).json({ error: '只能删除自己的帖子' });
  }

  execute('DELETE FROM posts WHERE id = ?', { '?': postId });
  res.json({ success: true });
});

export default router;
