import { Router } from 'express';
import { queryOne, execute } from '../db.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

// WeChat OAuth URL - in production, this would redirect to WeChat
// For dev, we mock the flow
router.get('/wechat/url', (req, res) => {
  const redirect = req.query.redirect || '/';
  const appId = process.env.WECHAT_APPID;

  if (!appId || process.env.MOCK_AUTH === 'true') {
    // Mock mode: return a fake WeChat URL that redirects back with a mock code
    res.json({
      url: `/api/auth/wechat/mock?redirect=${encodeURIComponent(redirect)}`
    });
  } else {
    // Real WeChat OAuth
    const scope = 'snsapi_userinfo';
    const state = Math.random().toString(36).substring(2, 10);
    const redirectUri = encodeURIComponent(
      `${req.protocol}://${req.get('host')}/api/auth/wechat/callback?redirect=${encodeURIComponent(redirect)}`
    );
    res.json({
      url: `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}#wechat_redirect`
    });
  }
});

// Mock WeChat login for development
router.get('/wechat/mock', async (req, res) => {
  const mockOpenId = 'mock_openid_' + Math.random().toString(36).substring(2, 10);
  const mockNickname = '用户' + Math.random().toString(36).substring(2, 6).toUpperCase();
  const mockAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${mockNickname}`;

  // Find or create user
  let user = queryOne('SELECT * FROM users WHERE wechat_openid = ?', { '?': mockOpenId });
  if (!user) {
    execute(
      'INSERT INTO users (wechat_openid, nickname, avatar_url) VALUES (?, ?, ?)',
      { '?': mockOpenId, '?1': mockNickname, '?2': mockAvatar }
    );
    user = queryOne('SELECT * FROM users WHERE wechat_openid = ?', { '?': mockOpenId });
  }

  const token = generateToken(user.id);
  const redirect = req.query.redirect || '/';
  const userJson = encodeURIComponent(JSON.stringify({
    id: user.id,
    nickname: user.nickname,
    avatar_url: user.avatar_url
  }));

  // Return HTML that sends token back to opener and closes
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>登录中...</title></head>
    <body>
      <script>
        localStorage.setItem('token', '${token}');
        localStorage.setItem('user', '${userJson}');
        window.location.href = '${decodeURIComponent(redirect)}';
      </script>
      <p>登录成功，正在跳转...</p>
    </body>
    </html>
  `);
});

// Real WeChat callback
router.get('/wechat/callback', async (req, res) => {
  const { code, redirect } = req.query;
  const appId = process.env.WECHAT_APPID;
  const appSecret = process.env.WECHAT_SECRET;

  try {
    // Exchange code for access_token
    const tokenResp = await fetch(
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`
    );
    const tokenData = await tokenResp.json();

    if (tokenData.errcode) {
      return res.status(400).json({ error: '微信登录失败: ' + tokenData.errmsg });
    }

    // Get user info
    const userResp = await fetch(
      `https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${tokenData.openid}&lang=zh_CN`
    );
    const userData = await userResp.json();

    if (userData.errcode) {
      return res.status(400).json({ error: '获取用户信息失败: ' + userData.errmsg });
    }

    // Find or create user
    let user = queryOne('SELECT * FROM users WHERE wechat_openid = ?', { '?': userData.openid });
    if (!user) {
      execute(
        'INSERT INTO users (wechat_openid, wechat_unionid, nickname, avatar_url) VALUES (?, ?, ?, ?)',
        { '?': userData.openid, '?1': userData.unionid || null, '?2': userData.nickname, '?3': userData.headimgurl }
      );
      user = queryOne('SELECT * FROM users WHERE wechat_openid = ?', { '?': userData.openid });
    }

    const token = generateToken(user.id);
    const redirectUrl = decodeURIComponent(redirect || '/');
    const userJson = encodeURIComponent(JSON.stringify({
      id: user.id,
      nickname: user.nickname,
      avatar_url: user.avatar_url
    }));

    res.send(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>登录中...</title></head>
      <body>
        <script>
          localStorage.setItem('token', '${token}');
          localStorage.setItem('user', '${userJson}');
          window.location.href = '${redirectUrl}';
        </script>
        <p>登录成功，正在跳转...</p>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('WeChat auth error:', err);
    res.status(500).json({ error: '登录失败，请重试' });
  }
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  const user = queryOne('SELECT id, nickname, avatar_url, wechat_openid, created_at FROM users WHERE id = ?', { '?': req.userId });
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json(user);
});

// Update profile
router.put('/profile', authMiddleware, (req, res) => {
  const { nickname, avatar_url } = req.body;

  if (!nickname || nickname.trim().length === 0) {
    return res.status(400).json({ error: '昵称不能为空' });
  }
  if (nickname.length > 20) {
    return res.status(400).json({ error: '昵称不能超过20个字符' });
  }

  execute(
    'UPDATE users SET nickname = ?, avatar_url = ?, updated_at = datetime(\'now\') WHERE id = ?',
    { '?': nickname.trim(), '?1': avatar_url || null, '?2': req.userId }
  );

  const user = queryOne('SELECT id, nickname, avatar_url, created_at FROM users WHERE id = ?', { '?': req.userId });
  res.json(user);
});

export default router;
