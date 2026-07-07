import { create } from 'zustand';

const useAuthStore = create((set) => ({
  token: localStorage.getItem('ai_token') || null,
  ssoToken: localStorage.getItem('ai_sso_token') || null,
  user: JSON.parse(localStorage.getItem('ai_user') || 'null'),

  // 同步方法：仅存储 token + user（API调用在 SsoAutoLogin 组件内完成）
  login: (token, user) => {
    localStorage.setItem('ai_token', token);
    localStorage.setItem('ai_user', JSON.stringify(user));
    set({ token, user });
  },

  setAuth: (data) => {
    localStorage.setItem('ai_token', data.token);
    if (data.ssoToken) localStorage.setItem('ai_sso_token', data.ssoToken);
    localStorage.setItem('ai_user', JSON.stringify(data.user));
    set({ token: data.token, ssoToken: data.ssoToken, user: data.user });
  },

  logout: () => {
    localStorage.removeItem('ai_token');
    localStorage.removeItem('ai_sso_token');
    localStorage.removeItem('ai_user');
    set({ token: null, ssoToken: null, user: null });
  },
}));

export default useAuthStore;
