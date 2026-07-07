# 鲜当家SCM 移动端 App 实现总览

## 完成内容

### 1. Capacitor 原生壳
- 初始化 iOS + Android 原生项目
- 2个原生插件集成：生物认证（@aparajita/capacitor-biometric-auth v10.0.0）+ 原生存储（@capacitor/preferences v8.0.1）
- 原生权限配置：
  - iOS: `NSFaceIDUsageDescription` + `NSCameraUsageDescription`
  - Android: `USE_BIOMETRIC` + `USE_FINGERPRINT` + `CAMERA`
- `cap sync` 成功同步 Web 构建到两个原生项目

### 2. 角色差异化导航
- `navConfig.js` 将 13 个细粒度角色映射到 7 个角色组：
  - **admin**: 管理员（全部功能）
  - **warehouse**: 仓管员（扫码入库、盘点、库存查询）
  - **sales**: 销售人员（销售计划、客户管理、发货跟踪）
  - **purchase**: 采购员（采购计划、采购订单、供应商管理）
  - **finance**: 财务人员（应收应付、成本价、费用登记）
  - **logistics**: 物流人员（发货管理、承运商管理）
  - **quality**: 质检人员（质检相关）
- 每个角色组有独立的底部导航 Tab（最多5个）和仪表盘卡片

### 3. 指纹/生物认证登录
- 原生环境：调用设备 Face ID / 指纹传感器
- Web 环境：自动降级到 localStorage 模拟（H5 也可测试流程）
- 登录流程：
  1. 首次：用户名密码登录
  2. 在设置页开启指纹登录开关
  3. 后续：点击指纹按钮 → 生物认证 → 验证 token 有效性 → 自动登录
- Token 持久化：原生用 Preferences，Web 用 localStorage

### 4. 后端新增接口
- `POST /api/auth/mobile-login` — 移动端专用登录（绕过 Portal SSO）
  - 参数：`{ username, password }`
  - 返回：`{ success, data: { token, user: { id, username, role, permissions, employee } } }`
- admin 用户密码已重置为 `admin123`

### 5. 新增前端页面
| 页面 | 路由 | 功能 |
|------|------|------|
| Settings | /settings | 用户信息、指纹开关、关于、退出登录 |
| ScanInbound | /scan-inbound | 扫码搜索物料/批次 + 待入库订单列表 |
| StockTake | /stock-take | 盘点管理（待盘/已盘/已调整三Tab） |
| ApprovalCenter | /approval-center | 审批中心（待审批/已审批两Tab） |

### 6. Vite 三模式构建
| 模式 | 命令 | 用途 | base |
|------|------|------|------|
| dev | `vite` | 本地开发 | `/` |
| gw | `VITE_MODE=gw vite build` | 网关 H5 | `/mobile/` |
| native | `VITE_MODE=native vite build` | Capacitor App | `/` |

## 验证结果
- ✅ mobile-login API: `admin/admin123` → success, role=SUPER_ADMIN
- ✅ /auth/me: token 验证通过
- ✅ H5 访问: http://localhost:5174/mobile/ → HTTP 200
- ✅ cap sync: iOS + Android 项目同步成功（各2个插件）
- ✅ 原生权限: iOS Info.plist + Android AndroidManifest.xml 已配置

## 文件清单
- `mobile/capacitor.config.json` — Capacitor 配置
- `mobile/src/config/navConfig.js` — 角色导航配置
- `mobile/src/lib/biometric.js` — 生物认证服务
- `mobile/src/lib/api.js` — API 客户端（native/web 自适应）
- `mobile/src/store/authStore.js` — 认证状态管理
- `mobile/src/components/MobileLayout.jsx` — 动态导航布局
- `mobile/src/pages/Login.jsx` — 登录页（含指纹登录）
- `mobile/src/pages/Dashboard.jsx` — 角色仪表盘
- `mobile/src/pages/Settings.jsx` — 设置页（指纹开关）
- `mobile/src/pages/ScanInbound.jsx` — 扫码入库
- `mobile/src/pages/StockTake.jsx` — 盘点管理
- `mobile/src/pages/ApprovalCenter.jsx` — 审批中心
- `mobile/vite.config.js` — 三模式构建配置
- `mobile/package.json` — 脚本和依赖
- `mobile/ios/` — iOS 原生项目
- `mobile/android/` — Android 原生项目
- `server/src/modules/auth/auth.routes.js` — 新增 /auth/mobile-login 接口

## 后续步骤（如需打包发布）
1. **iOS**: `cd mobile && npx cap open ios` → Xcode 打开 → 配置签名 → Archive → 导出 IPA
2. **Android**: `cd mobile && npx cap open android` → Android Studio 打开 → Build APK/AAB
3. **在线更新**: Web 层面修改后重新 `build:native && cap sync`，App 重启即可加载最新版本（无需重新安装）
4. **原生层更新**: 修改 Capacitor 插件/原生权限等需要重新编译安装
