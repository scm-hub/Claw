# 鲜当家 SCM 移动端 App 开发方案

> 编制日期：2026年7月3日
> 编制人：WorkBuddy AI
> 适用项目：xdj-scm（鲜当家供应链管理系统）

---

## 一、现状分析

### 1.1 已有移动端 H5

当前 `xdj-scm/mobile/` 目录已有一套完整的 React H5 移动端，技术栈：

| 项目 | 技术选型 |
|------|---------|
| 框架 | React 18 + Vite 6 |
| UI 库 | MUI v6 |
| 状态管理 | Zustand |
| 路由 | React Router v7 |
| 端口 | 5176（Vite Preview） |

**已有 7 个页面：**
- Dashboard（数据概览）
- Inventory（库存查询）
- SalesOrders（销售订单）
- SalesPlans（销售计划）
- PurchaseOrders（采购订单）
- Receivables（应收账款）
- Payables（应付账款）

**已有基础设施：**
- Portal SSO 统一登录（token key: `xdj_m_token`）
- API 封装（fetch + Bearer token）
- 底部导航栏（4 tab + 子页面）

### 1.2 H5 的局限性

| 痛点 | 说明 |
|------|------|
| 无法扫码 | 浏览器调用摄像头能力受限，条码/二维码识别率低 |
| 无法离线 | 断网后完全不可用，仓库 WiFi 信号不稳定 |
| 无推送通知 | 审批提醒依赖人工查看，响应不及时 |
| 体验像网页 | 无原生手势、无启动动画、无桌面图标 |
| 无法上架 | 不能进 App Store / 应用商店，用户信任度低 |
| 拍照体验差 | 浏览器拍照需手动选择相机，无法直接调用 |

---

## 二、技术方案对比

### 方案 A：Capacitor 原生壳（推荐）

**原理：** 在现有 React H5 外面包一层原生壳，通过 Capacitor 桥接调用设备原生能力。

| 维度 | 评价 |
|------|------|
| 代码复用率 | **95%+**，现有 H5 代码几乎不用改 |
| 开发周期 | **短**（2-4 周） |
| 原生能力 | 扫码、拍照、离线、推送、生物认证全支持 |
| 性能 | WebView 渲染，略逊纯原生但足够 |
| 上架 | 可上架 App Store / 应用宝 / 华为应用市场 |
| 维护成本 | 一套代码同时出 iOS + Android |
| 学习成本 | **低**，团队现有 React 技能直接用 |

### 方案 B：React Native 重写

| 维度 | 评价 |
|------|------|
| 代码复用率 | **0%**，全部重写 |
| 开发周期 | **长**（6-10 周） |
| 原生能力 | 完整原生能力，性能最好 |
| 性能 | 接近原生 |
| 学习成本 | **高**，需学习 RN 组件体系、导航、样式 |
| 维护成本 | 仍是一套代码出两端，但调试链路更复杂 |

### 方案 C：企业微信/钉钉 H5 应用

| 维度 | 评价 |
|------|------|
| 代码复用率 | **80%**，H5 适配企微/钉钉 JSAPI |
| 开发周期 | **中**（2-3 周） |
| 原生能力 | 通过 JSAPI 调用扫码、拍照，能力够用 |
| 上架 | 无需上架，企微/钉钉后台配置即可 |
| 推送通知 | 企微/钉钉消息通道，触达率高 |
| 局限 | 依赖第三方平台，用户必须装企微/钉钉 |

### 方案 D：微信小程序

| 维度 | 评价 |
|------|------|
| 代码复用率 | **0%**，需用小程序语法重写 |
| 开发周期 | **中长**（4-6 周） |
| 原生能力 | 扫码、拍照、定位均有 |
| 局限 | 包体 2MB 限制、审核流程、个人无法发布企业管理类 |

### 方案 E：PWA（渐进式 Web 应用）

| 维度 | 评价 |
|------|------|
| 代码复用率 | **95%**，加 manifest + Service Worker |
| 开发周期 | **极短**（1 周） |
| 原生能力 | 有限，iOS 推送支持差 |
| 局限 | 无法上架应用商店，用户认知度低 |

---

## 三、推荐方案：Capacitor + 企业微信双通道

### 3.1 推荐理由

```
                    ┌──────────────────────────────────────────┐
                    │           推荐策略：双通道并行             │
                    ├──────────────────────────────────────────┤
                    │                                          │
                    │  通道 1：Capacitor 原生 App              │
                    │  → 仓库/车间人员（扫码、拍照、离线）       │
                    │  → 上架应用商店，品牌展示                  │
                    │                                          │
                    │  通道 2：企业微信 H5 应用                 │
                    │  → 管理层/销售/财务（审批、查看报表）       │
                    │  → 借助企微推送，零安装成本                │
                    │                                          │
                    └──────────────────────────────────────────┘
```

**核心优势：**
1. **代码复用最大化** — 两个通道共用同一套 React H5 代码
2. **场景精准匹配** — 仓库要扫码用原生 App，管理层要审批用企微
3. **渐进式推进** — 先上 Capacitor 原生壳，再接企微，风险可控
4. **后端零改动** — 现有 8 个 PM2 服务全部复用，API 不变

### 3.2 Capacitor 工作原理

```
┌─────────────────────────────────────────┐
│           iOS / Android 设备             │
│  ┌───────────────────────────────────┐  │
│  │     Capacitor 原生壳 (Swift/Kotlin)│  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │    WebView (系统级渲染)      │  │  │
│  │  │  ┌───────────────────────┐  │  │  │
│  │  │  │  React H5 应用 (现有)   │  │  │  │
│  │  │  │  MUI + Zustand + Router│  │  │  │
│  │  │  └───────────┬───────────┘  │  │  │
│  │  └──────────────┼──────────────┘  │  │
│  │     Capacitor Bridge (JS↔Native)   │  │
│  │  ┌────┬────┬────┬────┬────┐       │  │
│  │  │扫码│拍照│离线│推送│认证│       │  │
│  │  │插件│插件│插件│插件│插件│       │  │
│  │  └────┴────┴────┴────┴────┘       │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              │ HTTPS / API
              ▼
    ┌──────────────────┐
    │  Gateway :5174    │
    │  (现有网关不变)    │
    └──────────────────┘
```

---

## 四、功能规划

### 4.1 现有功能（H5 已有，直接复用）

| 功能模块 | 页面 | 状态 |
|---------|------|------|
| 数据概览 | Dashboard | 已完成 |
| 库存查询 | Inventory | 已完成 |
| 销售订单 | SalesOrders | 已完成 |
| 销售计划 | SalesPlans | 已完成 |
| 采购订单 | PurchaseOrders | 已完成 |
| 应收账款 | Receivables | 已完成 |
| 应付账款 | Payables | 已完成 |

### 4.2 新增原生功能

| 功能 | 使用场景 | Capacitor 插件 | 优先级 |
|------|---------|---------------|--------|
| **扫码作业** | 仓库出入库扫码、物料条码识别 | @capacitor-community/barcode-scanner | P0 |
| **拍照上传** | 质检拍照、入库拍照、到货签收 | @capacitor/camera | P0 |
| **离线缓存** | 仓库 WiFi 弱网环境数据暂存 | @capacitor/preferences + IndexedDB | P1 |
| **推送通知** | 审批待办提醒、订单状态变更 | @capacitor/push-notifications | P1 |
| **生物认证** | Face ID / 指纹快速登录 | @capacitor-community/biometric-auth | P2 |
| **GPS 定位** | 物流配送轨迹、外勤打卡 | @capacitor/geolocation | P2 |
| **本地通知** | 定时提醒、离线任务到期 | @capacitor/local-notifications | P2 |
| **文件下载** | 导出报表保存到手机 | @capacitor/filesystem | P2 |

### 4.3 新增页面

| 页面 | 功能说明 | 优先级 |
|------|---------|--------|
| **扫码出入库** | 扫描物料条码 → 自动填充出入库单 | P0 |
| **审批工作台** | 查看待审批列表 → 通过/拒绝/转交 | P0 |
| **质检记录** | 拍照 + 填写质检结果 → 提交 | P1 |
| **消息中心** | 推送通知列表、已读/未读管理 | P1 |
| **物流追踪** | 配送单 GPS 定位 + 签收拍照 | P2 |
| **个人设置** | 生物认证开关、消息提醒设置 | P2 |

---

## 五、开发阶段规划

### Phase 1：Capacitor 集成 + 原生壳搭建（第 1 周）

**目标：** 现有 H5 能在手机上以原生 App 形式运行

**任务清单：**
1. 在 `mobile/` 目录初始化 Capacitor
2. 配置 iOS 和 Android 平台
3. 调整 Vite 构建配置（base 路径、资源引用）
4. 适配安全区域（SafeArea）、状态栏样式
5. 配置 App 图标、启动画面
6. 处理 Android 返回键逻辑
7. 测试现有 7 个页面在原生壳中的运行

**交付物：** 可安装的 iOS/Android 测试包

### Phase 2：扫码作业 + 拍照上传（第 2-3 周）

**目标：** 仓库人员可以用手机扫码出入库、拍照质检

**任务清单：**
1. 集成 `@capacitor-community/barcode-scanner` 插件
2. 集成 `@capacitor/camera` 插件
3. 新增「扫码出入库」页面
   - 扫描物料条码 → 自动识别物料
   - 输入数量 → 提交出入库单
   - 支持连续扫码模式（批量出入库）
4. 新增「质检记录」页面
   - 选择入库单 → 拍照（支持多张）→ 填写质检结果
   - 图片压缩后上传到后端
5. 后端新增接口（如需）：
   - `POST /api/wms/scan-inbound` 扫码入库
   - `POST /api/wms/scan-outbound` 扫码出库
   - `POST /api/quality/inspection` 质检提交
6. 底部导航栏增加「扫码」入口

**交付物：** 带扫码和拍照功能的测试包

### Phase 3：离线模式 + 推送通知（第 4-5 周）

**目标：** 弱网环境可用 + 审批消息实时推送

**任务清单：**
1. **离线缓存：**
   - 集成 `@capacitor/preferences` + IndexedDB
   - 核心数据（库存、订单列表）本地缓存
   - 离线时展示缓存数据 + 标记「离线」状态
   - 网络恢复后自动同步离线操作
   - 离线操作队列（扫码出入库数据暂存 → 联网后批量提交）
2. **推送通知：**
   - 集成 `@capacitor/push-notifications`
   - iOS: APNs 配置
   - Android: FCM 配置
   - 后端新增推送服务：
     - 审批待办 → 推送给审批人
     - 订单状态变更 → 推送给相关人
   - 新增「消息中心」页面
3. **后端推送接口：**
   - 设备注册：`POST /api/notifications/register-device`
   - 推送发送：内部调用（workflow-engine 审批回调时触发）

**交付物：** 带离线模式和推送通知的完整 App

### Phase 4：审批工作台 + 生物认证（第 6 周）

**目标：** 移动端审批 + 快速登录

**任务清单：**
1. **审批工作台页面：**
   - 待审批列表（调用 workflow-engine API）
   - 审批详情查看
   - 通过/拒绝/转交操作
   - 审批历史记录
2. **生物认证：**
   - 集成 `@capacitor-community/biometric-auth`
   - 首次登录后绑定设备
   - 后续打开 App → Face ID/指纹 → 自动登录
   - 个人设置页可开关
3. **个人设置页面：**
   - 生物认证开关
   - 消息提醒设置
   - 清除缓存
   - 检查更新

**交付物：** 功能完整的正式版 App

### Phase 5：企业微信 H5 应用接入（第 7 周，可选）

**目标：** 管理层通过企业微信直接使用，无需安装 App

**任务清单：**
1. 企微后台配置自建应用
2. 接入企微 JSAPI（扫码、拍照通过企微桥接）
3. 企微 OAuth 登录 → Portal SSO 打通
4. 企微消息推送（审批待办通过企微消息通道）
5. 适配企微容器环境（UI 微调）

**交付物：** 企业微信内可用的 H5 应用

---

## 六、技术实现要点

### 6.1 Capacitor 初始化

```bash
# 在 mobile 目录初始化
cd xdj-scm/mobile
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android

# 初始化配置
npx cap init "鲜当家SCM" "com.xdj.scm" --web-dir=dist

# 添加平台
npx cap add ios
npx cap add android

# 构建 H5 并同步到原生项目
npm run build
npx cap sync
```

### 6.2 API 适配

现有 `api.js` 需小幅调整，支持原生环境：

```javascript
// 区分 H5 和原生环境
const isNative = Capacitor.isNativePlatform();
const BASE_URL = isNative
  ? 'https://scm.xdj.com/api'  // 原生 App 走公网域名
  : import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';  // H5 走相对路径
```

### 6.3 扫码调用示例

```javascript
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';

async function scanBarcode() {
  // 检查权限
  await BarcodeScanner.checkPermission({ force: true });
  // 开始扫码
  document.body.classList.add('scanner-active');
  const result = await BarcodeScanner.startScan();
  document.body.classList.remove('scanner-active');
  if (result.hasContent) {
    return result.content;  // 条码内容
  }
}
```

### 6.4 离线同步策略

```
在线模式：
  用户操作 → API 请求 → 后端处理 → 返回结果 → 更新 UI → 缓存到本地

离线模式：
  用户操作 → 存入离线队列 → 标记「待同步」
  网络恢复 → 遍历离线队列 → 逐条提交 API → 更新本地缓存
```

### 6.5 推送通知流程

```
workflow-engine 审批回调
  → SCM 后端收到审批待办
  → 查询审批人的设备注册信息
  → 调用推送服务（APNs/FCM）
  → 手机收到推送通知
  → 点击通知 → 打开 App → 跳转审批详情页
```

---

## 七、项目目录结构（规划）

```
xdj-scm/mobile/
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx          # 现有
│   │   ├── Inventory.jsx          # 现有
│   │   ├── SalesOrders.jsx        # 现有
│   │   ├── SalesPlans.jsx         # 现有
│   │   ├── PurchaseOrders.jsx     # 现有
│   │   ├── Receivables.jsx        # 现有
│   │   ├── Payables.jsx           # 现有
│   │   ├── Login.jsx              # 现有
│   │   ├── ScanInbound.jsx        # 新增 - 扫码入库
│   │   ├── ScanOutbound.jsx       # 新增 - 扫码出库
│   │   ├── QualityInspection.jsx  # 新增 - 质检记录
│   │   ├── ApprovalCenter.jsx     # 新增 - 审批工作台
│   │   ├── MessageCenter.jsx      # 新增 - 消息中心
│   │   ├── Settings.jsx           # 新增 - 个人设置
│   │   └── LogisticsTrack.jsx     # 新增 - 物流追踪
│   ├── components/
│   │   ├── MobileLayout.jsx       # 现有（改造导航）
│   │   ├── BarcodeScanner.jsx     # 新增 - 扫码组件
│   │   ├── PhotoUploader.jsx      # 新增 - 拍照上传组件
│   │   ├── OfflineIndicator.jsx   # 新增 - 离线状态指示器
│   │   └── PushNotification.jsx   # 新增 - 推送通知处理
│   ├── hooks/
│   │   ├── useScanner.js          # 新增 - 扫码 hook
│   │   ├── useOffline.js          # 新增 - 离线管理 hook
│   │   └── usePushNotification.js # 新增 - 推送 hook
│   ├── lib/
│   │   ├── api.js                 # 现有（适配原生环境）
│   │   ├── offlineQueue.js        # 新增 - 离线操作队列
│   │   └── nativeBridge.js        # 新增 - 原生能力封装
│   └── store/
│       ├── authStore.js           # 现有
│       ├── offlineStore.js        # 新增 - 离线数据
│       └── messageStore.js        # 新增 - 消息管理
├── ios/                           # 新增 - iOS 原生项目
├── android/                       # 新增 - Android 原生项目
├── capacitor.config.ts            # 新增 - Capacitor 配置
└── package.json
```

---

## 八、发布与部署

### 8.1 iOS 发布

| 步骤 | 说明 |
|------|------|
| Apple 开发者账号 | 企业账号 $299/年（企业内部分发，免上架审核） |
| 证书 + Profile | 在 Apple Developer 后台生成 |
| 构建 | `npx cap build ios` → Xcode 打包 |
| 分发方式 | 企业证书内部分发 / App Store 上架 |

### 8.2 Android 发布

| 步骤 | 说明 |
|------|------|
| 签名证书 | 生成 keystore 文件 |
| 构建 | `npx cap build android` → 生成 APK/AAB |
| 分发方式 | 应用宝/华为/小米应用市场 / 企业内部分发 APK |

### 8.3 后端部署

**现有后端无需改动**，只需：

1. **公网域名 + HTTPS 证书**（App 强制要求 HTTPS）
2. **推送服务配置**（APNs 证书 + FCM API Key）
3. **设备注册表**（MySQL 新增 `device_registration` 表）

```sql
CREATE TABLE device_registration (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  platform ENUM('ios', 'android') NOT NULL,
  deviceToken VARCHAR(500) NOT NULL,
  deviceModel VARCHAR(100),
  appVersion VARCHAR(20),
  status ENUM('active', 'inactive') DEFAULT 'active',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_userId (userId),
  INDEX idx_deviceToken (deviceToken(255))
);
```

---

## 九、成本预估

### 9.1 开发成本

| 阶段 | 内容 | 预估工作量 |
|------|------|-----------|
| Phase 1 | Capacitor 集成 + 原生壳 | 1 周 |
| Phase 2 | 扫码 + 拍照 | 2 周 |
| Phase 3 | 离线 + 推送 | 2 周 |
| Phase 4 | 审批 + 生物认证 | 1 周 |
| Phase 5 | 企业微信接入（可选） | 1 周 |
| **合计** | | **7 周** |

### 9.2 第三方费用

| 项目 | 费用 | 说明 |
|------|------|------|
| Apple 开发者账号 | $299/年 | 企业账号，内部分发 |
| Google Play 账号 | $25 一次性 | Android 上架 |
| 国内安卓市场 | 免费 | 应用宝/华为/小米 |
| FCM 推送 | 免费 | Google Firebase |
| APNs 推送 | 免费 | Apple 自带 |
| 服务器 HTTPS 证书 | 免费 | Let's Encrypt 或云厂商免费证书 |
| 企业微信 | 免费 | 200 人以下免费 |

### 9.3 硬件要求

| 设备 | 用途 | 说明 |
|------|------|------|
| Mac 电脑 | iOS 构建 | 现有 Mac M4 即可 |
| Android 测试机 | Android 测试 | 任意 Android 手机 |
| iPhone 测试机 | iOS 测试 | 任意 iPhone |

---

## 十、风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| Apple 审核被拒 | 中 | 企业证书内部分发，无需上架审核 |
| WebView 性能瓶颈 | 低 | MUI v6 已做移动端优化，实测足够 |
| 推送到达率 | 中 | Android 用 FCM + 厂商通道，iOS 用 APNs |
| 离线冲突 | 中 | 离线操作加时间戳，服务端做冲突检测 |
| 企微 API 变更 | 低 | 企微 API 稳定性强，变更频率低 |
| 网络安全 | 中 | API 强制 HTTPS + 证书锁定（Certificate Pinning） |

---

## 十一、总结

**推荐路径：Capacitor 原生壳 + 企业微信双通道**

1. **第一步（Phase 1-2）：** 用 Capacitor 把现有 H5 打包成原生 App，加上扫码和拍照，让仓库人员先用起来
2. **第二步（Phase 3-4）：** 加上离线模式和推送通知，提升弱网体验和审批效率
3. **第三步（Phase 5，可选）：** 接入企业微信，让管理层免安装直接用

**核心优势：**
- 现有 7 个 H5 页面代码 **95% 复用**
- 后端 8 个 PM2 服务 **零改动**
- 一套代码出 **iOS + Android 双端**
- 总开发周期 **4-7 周**（含可选的企业微信接入）
- 第三方费用极低（仅 Apple 开发者账号 $299/年）
