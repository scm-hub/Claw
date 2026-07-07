const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('ai_token');
  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  return resp.json();
}

export default {
  // Auth
  ssoLogin: (ssoToken) =>
    request('/auth/sso-login', { method: 'POST', body: JSON.stringify({ ssoToken }) }),
  me: () => request('/auth/me'),

  // Chat
  chat: (message, history) =>
    request('/chat', { method: 'POST', body: JSON.stringify({ message, history }) }),
  getSuggestions: () => request('/chat/suggestions'),
  getIntents: () => request('/chat/intents'),

  // Order Assistant
  parseOrder: (message) =>
    request('/order-assistant/parse', { method: 'POST', body: JSON.stringify({ message }) }),
  createOrder: (orderData) =>
    request('/order-assistant/create', { method: 'POST', body: JSON.stringify({ orderData }) }),
  searchCustomers: (keyword) => request(`/order-assistant/customers?keyword=${encodeURIComponent(keyword)}`),
  searchMaterials: (keyword) => request(`/order-assistant/materials?keyword=${encodeURIComponent(keyword)}`),

  // Analytics
  getOverview: () => request('/analytics/overview'),
  getSalesAnalysis: () => request('/analytics/sales'),
  getInventoryAnalysis: () => request('/analytics/inventory'),
  getHrAnalysis: () => request('/analytics/hr'),
  getCrossSystem: () => request('/analytics/cross-system'),

  // Prediction
  getPredictionDashboard: () => request('/prediction/dashboard'),
  getSalesPrediction: () => request('/prediction/sales'),
  getInventoryPrediction: () => request('/prediction/inventory'),
};
