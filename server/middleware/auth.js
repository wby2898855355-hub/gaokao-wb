import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gaokao-dev-secret-key-change-in-production';

export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '请先登录' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

// Optional auth - attaches userId if token present, but doesn't require it
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId;
    } catch (err) {
      // ignore invalid tokens for optional auth
    }
  }
  next();
}
