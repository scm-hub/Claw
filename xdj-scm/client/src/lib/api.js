import { useAuthStore } from '../store/authStore';

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

// 获取当前组织编码
function getOrgCode() {
  return localStorage.getItem('scm_current_org') || '';
}

function buildQueryString(params) {
  if (!params || !Object.keys(params).length) return '';
  const qs = Object.entries(params)
    .filter(([, v]) => v !== '' && v !== null && v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return qs ? `?${qs}` : '';
}

async function request(url, options = {}) {
  const token = useAuthStore.getState().token;

  // FormData 不手动设置 Content-Type（让浏览器自动生成含 boundary 的 multipart/header）
  // FormData 也不可 JSON.stringify，否则会变成 "{}"
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // 组织上下文
  const orgCode = getOrgCode();
  if (orgCode) {
    headers['X-Org-Code'] = orgCode;
  }

  // 支持 params 查询参数（兼容 axios 风格调用）
  let finalUrl = `${BASE_URL}${url}`;
  if (options.params) {
    finalUrl += buildQueryString(options.params);
    const { params, ...restOptions } = options;
    options = restOptions;
  }

  let res;
  try {
    res = await fetch(finalUrl, {
      ...options,
      headers,
    });
  } catch (fetchErr) {
    // 网络层错误（DNS失败、连接被拒、CORS、Abort等）
    console.error('[API] fetch 网络错误:', {
      url: finalUrl,
      method: options?.method || 'GET',
      errMsg: fetchErr?.message,
      errName: fetchErr?.name,
    });
    throw new Error(`网络请求失败: ${fetchErr?.message || '无法连接服务器'}`);
  }

  if (res.status === 401) {
    useAuthStore.getState().clearAuth();
    // SCM 已关闭独立登录，401 时跳回 Portal 重新 SSO 登录
    const portalUrl = window.location.origin.replace(/:\d+$/, ':5174');
    window.location.href = portalUrl;
    throw new Error('认证已过期，请重新登录');
  }

  // 安全解析 JSON：处理非 JSON 响应（如 HTML 错误页）
  let data;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch (parseErr) {
    console.error('[API] JSON 解析失败:', {
      url: finalUrl,
      status: res.status,
      statusText: res.statusText,
      contentType: res.headers.get('content-type'),
      bodyPreview: text.substring(0, 500),
    });
    throw new Error(`服务器响应异常(${res.status}): ${text.substring(0, 200) || res.statusText}`);
  }

  if (!res.ok) {
    const err = new Error(data.message || `请求失败 (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  get: (url, options) => request(url, { ...options, method: 'GET' }),
  post: (url, body) => request(url, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: (url, body) => request(url, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch: (url) => request(url, { method: 'PATCH' }),
  delete: (url) => request(url, { method: 'DELETE' }),

  // Blob 下载（带token）
  getBlob: async (url) => {
    const token = useAuthStore.getState().token;
    const res = await fetch(`${BASE_URL}${url}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('下载失败');
    return res.blob();
  },
};

// 组织切换工具
export function setCurrentOrg(orgCode) {
  if (orgCode) {
    localStorage.setItem('scm_current_org', orgCode);
  } else {
    localStorage.removeItem('scm_current_org');
  }
}
export function getCurrentOrg() {
  return localStorage.getItem('scm_current_org') || '';
}

export default api;
