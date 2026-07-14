# Portal 移动端布局「加载配置列表失败」修复

## 问题
在综合平台点击「移动端布局」时，页面显示「加载配置列表失败」。

## 根因分析
`MobileLayoutConfig.jsx` 使用 Portal 前端通用的 `api` 实例来调用 SCM 后端 API：

```js
// Portal api 实例配置
baseURL: '/api'  // 默认拼接 /api 前缀

// MobileLayoutConfig 中的调用
api.get('/scm/api/mobile-layout/configs')
// 实际请求 → /api/scm/api/mobile-layout/configs  ❌ 错误！
```

请求路径拼接后变成 `/api/scm/api/mobile-layout/configs`，网关将其匹配到 Portal 后端（4001），而 Portal 后端没有 SCM 的 `mobile-layout` 路由。

## 修复方案
创建独立的 `scmApi` axios 实例（`baseURL: ''`），绕开 Portal API 的 `/api` 前缀：

```js
// 新建 scmApi 实例
const scmApi = axios.create({ baseURL: '', timeout: 15000 });
scmApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('sso_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 正确调用
scmApi.get('/scm/api/mobile-layout/configs')
// 实际请求 → /scm/api/mobile-layout/configs  ✅ 正确！
```

网关正确路由：`/scm/api/...` → SCM 后端（4003）

## 验证
- `curl http://localhost:5174/scm/api/mobile-layout/configs` → 返回「未提供认证令牌」（路由正确，认证中间件正常）
- SCM auth 中间件支持双 secret 验证（SSO_JWT_SECRET + JWT_SECRET），Portal 的 `sso_token` 可被 SCM 后端识别
- Portal 前端重新构建，gateway 已重启
