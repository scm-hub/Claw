function getBaseUrl() { return '/api'; }

async function request(url, options = {}) {
  let token = null;
  try {
    const auth = localStorage.getItem('claw_auth');
    if (auth) token = JSON.parse(auth).token;
  } catch {}

  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${getBaseUrl()}${url}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '请求失败');
  return data;
}

export const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
};
export default api;
