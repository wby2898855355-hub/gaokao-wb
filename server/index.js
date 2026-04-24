import express from 'express';
import cors from 'cors';
import { getDb } from './db.js';
import authRoutes from './routes/auth.js';
import postsRoutes from './routes/posts.js';
import forumsRoutes from './routes/forums.js';
import commentsRoutes from './routes/comments.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Initialize database
await getDb();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', postsRoutes);
app.use('/api', forumsRoutes);
app.use('/api', commentsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Mock auth mode: ${!process.env.WECHAT_APPID || process.env.MOCK_AUTH === 'true' ? 'ON (dev)' : 'OFF (production)'}`);
});
