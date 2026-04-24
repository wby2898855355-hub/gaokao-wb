const BASE_URL = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  getWechatUrl: (redirect) => request(`/auth/wechat/url?redirect=${encodeURIComponent(redirect)}`),
  getMe: () => request('/auth/me'),
  updateProfile: (data) => request('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  // Posts
  getPosts: (forumKey, page = 1, limit = 20) =>
    request(`/forums/${forumKey}/posts?page=${page}&limit=${limit}`),
  getPost: (id) => request(`/posts/${id}`),
  createPost: (forumKey, data) => request(`/forums/${forumKey}/posts`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updatePost: (id, data) => request(`/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deletePost: (id) => request(`/posts/${id}`, { method: 'DELETE' }),

  // Forum info
  getForumInfo: (forumKey) => request(`/forums/${forumKey}/info`),

  // Comments
  getComments: (postId) => request(`/posts/${postId}/comments`),
  createComment: (postId, data) => request(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateComment: (id, data) => request(`/comments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteComment: (id) => request(`/comments/${id}`, { method: 'DELETE' })
};
