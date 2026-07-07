/* ==========================================
   SCM v3.1 - 供应链管理系统完整版
   13大模块 + 供应链驾驶舱
   ========================================== */

// ---------- 数据层 ----------
const API_BASE = 'http://192.168.21.34:8750';

// 当前模块（全局变量，供 BroadcastChannel 监听回调使用）
var currentModule = '';
var currentSubModule = '';

// ---------- 认证 ----------
function getToken() { return localStorage.getItem('scm_token'); }
function getAuthHeader() { return { 'Authorization': 'Bearer ' + (getToken() || '') }; }

async function doLogin() {
  var errEl = document.getElementById('loginErr');
  var btnEl = document.getElementById('loginBtn');
  var username = document.getElementById('loginUser').value.trim();
  var password = document.getElementById('loginPass').value;
  if (!username || !password) { errEl.textContent = '请输入用户名和密码'; return; }
  btnEl.disabled = true; btnEl.textContent = '登录中...'; errEl.textContent = '';
  try {
    var resp = await fetch(API_BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password })
    });
    var data = await resp.json();
    if (resp.ok && data.token) {
      localStorage.setItem('scm_token', data.token);
      localStorage.setItem('scm_user', JSON.stringify(data.user));
      document.getElementById('loginOverlay').classList.add('hidden');
      await initApp();
    } else {
      errEl.textContent = (data && data.detail) || '登录失败，请检查用户名和密码';
    }
  } catch (e) { errEl.textContent = '网络错误，无法连接服务器'; }
  btnEl.disabled = false; btnEl.textContent = '登 录';
}

async function checkLogin() {
  var token = getToken();
  if (!token) return false;
  try {
    var resp = await fetch(API_BASE + '/api/auth/verify', { headers: getAuthHeader() });
    return resp.ok;
  } catch (e) { return false; }
}

function logout() {
  localStorage.removeItem('scm_token');
  localStorage.removeItem('scm_user');
  location.reload();
}

function bindLoginEnter() {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && document.getElementById('loginOverlay') && !document.getElementById('loginOverlay').classList.contains('hidden')) {
      doLogin();
    }
  });
}

// ---------- 用户管理 API ----------
async function syncUserAccount(username, password, displayName, roleCode, deptId, employeeId, phone, email, isNew) {
  var data = {
    username: username,
    display_name: displayName,
    role: roleCode,
    dept_id: deptId,
    employee_id: employeeId,
    phone: phone,
    email: email
  };
  var method, url;
  if (isNew) {
    data.password = password;
    method = 'POST';
    url = API_BASE + '/api/users';
  } else {
    if (password) data.password = password;
    method = 'PUT';
    url = API_BASE + '/api/users/' + encodeURIComponent(username);
  }
  try {
    var resp = await fetch(url, {
      method: method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, getAuthHeader()),
      body: JSON.stringify(data)
    });
    if (!resp.ok && resp.status !== 200) {
      var err = await resp.json().catch(function() { return {}; });
      throw new Error(err.detail || '操作失败');
    }
  } catch (e) { showToast('用户同步失败: ' + e.message, 'error'); }
}

async function deleteUserAccount(username) {
  try {
    await fetch(API_BASE + '/api/users/' + encodeURIComponent(username), {
      method: 'DELETE',
      headers: getAuthHeader()
    });
  } catch (e) { /* 静默失败 */ }
}

// 13大模块的默认数据
const defaultData = {
  // 一、需求与计划管理
  demandPlans: [
    { id: 'DP001', name: '2026Q3销售预测', type: '销售预测', product: '电子产品', month: '2026-07', forecastQty: 5000, confidence: 0.85, status: '已审核' },
    { id: 'DP002', name: 'MPS主生产计划', type: '主生产计划', product: '机械部件', month: '2026-08', forecastQty: 2000, confidence: 0.9, status: '执行中' },
    { id: 'DP003', name: 'MRP物料需求', type: '物料需求计划', product: '包装材料', month: '2026-08', forecastQty: 15000, confidence: 0.8, status: '待审核' },
    { id: 'DP004', name: '产能计划', type: '产能计划', product: '成品组装', month: '2026-09', forecastQty: 1000, confidence: 0.75, status: '草稿' }
  ],
  
  // 二、采购与供应管理
  purchaseOrders: [
    { id: 'PO2024050001', productName: 'STM32F407VET6 微控制器', supplierName: '深圳华强电子有限公司', qty: 500, amount: 22750, date: '2026-05-15', status: '已审批', type: '标准采购' },
    { id: 'PO2024050002', productName: '防静电PE包装袋', supplierName: '顺丰速运供应链服务', qty: 10000, amount: 3500, date: '2026-05-17', status: '待审批', type: '紧急采购' },
    { id: 'PO2024050003', productName: '铝制散热片 40x40mm', supplierName: '东莞精密机械制造厂', qty: 2000, amount: 6400, date: '2026-05-10', status: '已审批', type: '标准采购' },
    { id: 'PO2024050004', productName: 'ESP32-WROOM-32E 模组', supplierName: '深圳比亚迪电子有限公司', qty: 3000, amount: 54000, date: '2026-05-12', status: '已发货', type: '标准采购' }
  ],
  
  // 三、供应商管理SRM
  suppliers: [
    { id: 'SUP001', name: '深圳华强电子有限公司', category: '电子元器件', contact: '张伟', phone: '13800138001', rating: 5, status: '合作中', type: '战略供应商', score: 95 },
    { id: 'SUP002', name: '东莞精密机械制造厂', category: '机械部件', contact: '李娜', phone: '13800138002', rating: 4, status: '合作中', type: '核心供应商', score: 88 },
    { id: 'SUP003', name: '惠州包装材料有限公司', category: '包装材料', contact: '王磊', phone: '13800138003', rating: 3, status: '合作中', type: '一般供应商', score: 75 },
    { id: 'SUP004', name: '广州化工原料供应有限公司', category: '化工原料', contact: '陈静', phone: '13800138004', rating: 4, status: '合作中', type: '核心供应商', score: 90 },
    { id: 'SUP005', name: '顺丰速运供应链服务', category: '物流服务', contact: '刘洋', phone: '13800138005', rating: 5, status: '合作中', type: '战略供应商', score: 98 },
    { id: 'SUP006', name: '上海博通半导体有限公司', category: '电子元器件', contact: '赵敏', phone: '13800138006', rating: 4, status: '合作中', type: '核心供应商', score: 85 },
    { id: 'SUP007', name: '苏州工业园区设备制造有限公司', category: '设备供应', contact: '孙涛', phone: '13800138007', rating: 3, status: '暂停合作', type: '一般供应商', score: 65 },
    { id: 'SUP008', name: '佛山金属材料加工有限公司', category: '原材料', contact: '周杰', phone: '13800138008', rating: 4, status: '合作中', type: '核心供应商', score: 82 }
  ],
  
  // 四、生产协同管理
  productionOrders: [
    { id: 'WO001', productId: 'PRD001', qty: 1000, startDate: '2026-05-20', endDate: '2026-05-25', status: '生产中', workshop: 'SMT车间', priority: '高' },
    { id: 'WO002', productId: 'PRD002', qty: 5000, startDate: '2026-05-18', endDate: '2026-05-22', status: '已完成', workshop: '机加车间', priority: '中' },
    { id: 'WO003', productId: 'PRD005', qty: 2000, startDate: '2026-05-22', endDate: '2026-05-28', status: '待排产', workshop: '组装车间', priority: '高' },
    { id: 'WO004', productId: 'PRD006', qty: 500, startDate: '2026-05-25', endDate: '2026-05-30', status: '计划中', workshop: '测试车间', priority: '中' }
  ],
  
  // 五、库存管理
  inventory: [
    { id: 'INV001', productName: 'STM32F407VET6 微控制器', sku: 'IC-MCU-001', category: '电子元器件', warehouse: 'A仓-电子仓', qty: 1200, logicalQty: 1200, safetyStock: 500, location: 'A-01-02', status: '正常' },
    { id: 'INV002', productName: '铝制散热片 40x40mm', sku: 'MECH-HS-001', category: '机械部件', warehouse: 'B仓-机械仓', qty: 450, logicalQty: 450, safetyStock: 500, location: 'B-02-03', status: '预警' },
    { id: 'INV003', productName: '防静电PE包装袋', sku: 'PKG-PE-001', category: '包装材料', warehouse: 'C仓-包材仓', qty: 35000, logicalQty: 35000, safetyStock: 10000, location: 'C-03-01', status: '正常' },
    { id: 'INV004', productName: '环氧树脂 AB胶', sku: 'CHM-EP-001', category: '化工原料', warehouse: 'D仓-化工仓', qty: 15, logicalQty: 15, safetyStock: 30, location: 'D-01-05', status: '预警' },
    { id: 'INV005', productName: 'ESP32-WROOM-32E 模组', sku: 'IC-WIFI-001', category: '电子元器件', warehouse: 'A仓-电子仓', qty: 2500, logicalQty: 2500, safetyStock: 500, location: 'A-02-01', status: '正常' },
    { id: 'INV006', productName: '工业级开关电源 12V 10A', sku: 'PWR-SW-001', category: '电子元器件', warehouse: 'A仓-电子仓', qty: 80, logicalQty: 80, safetyStock: 100, location: 'A-03-04', status: '预警' }
  ],
  
  // 六、仓储管理WMS
  warehouseOperations: [
    { id: 'WH001', type: '入库', productName: 'STM32F407VET6 微控制器', qty: 500, warehouse: 'A仓-电子仓', operator: '张三', date: '2026-05-15', status: '已完成' },
    { id: 'WH002', type: '出库', productName: '铝制散热片 40x40mm', qty: 200, warehouse: 'B仓-机械仓', operator: '李四', date: '2026-05-16', status: '已完成' },
    { id: 'WH003', type: '移库', productName: '防静电PE包装袋', qty: 1000, fromWarehouse: 'C仓-包材仓', toWarehouse: '临时仓', operator: '王五', date: '2026-05-17', status: '进行中' },
    { id: 'WH004', type: '盘点', productName: '环氧树脂 AB胶', qty: 15, warehouse: 'D仓-化工仓', operator: '赵六', date: '2026-05-18', status: '待审核' }
  ],
  
  // 七、物流运输管理TMS
  transportOrders: [
    { id: 'TR001', orderId: 'PO2024050001', from: '深圳', to: '上海', carrier: '顺丰速运', vehicle: '粤B12345', driver: '张师傅', startDate: '2026-05-16', endDate: '2026-05-18', status: '运输中', cost: 1200 },
    { id: 'TR002', orderId: 'PO2024050003', from: '东莞', to: '广州', carrier: '德邦物流', vehicle: '粤A56789', driver: '李师傅', startDate: '2026-05-12', endDate: '2026-05-13', status: '已完成', cost: 800 },
    { id: 'TR003', orderId: 'PO2024050004', from: '广州', to: '深圳', carrier: '中通快递', vehicle: '粤C34567', driver: '王师傅', startDate: '2026-05-10', endDate: '2026-05-11', status: '已完成', cost: 500 },
    { id: 'TR004', orderId: 'PO2024050002', from: '惠州', to: '深圳', carrier: '京东物流', vehicle: '粤D78901', driver: '赵师傅', startDate: '2026-05-20', endDate: '2026-05-21', status: '待发运', cost: 600 }
  ],
  
  // 八、订单协同管理
  salesOrders: [
    { id: 'SO001', customer: '华为技术有限公司', productName: 'STM32F407VET6 微控制器', qty: 1000, amount: 45500, orderDate: '2026-05-10', deliveryDate: '2026-05-25', status: '生产中', priority: '高', salesperson: '陈明' },
    { id: 'SO002', customer: '小米科技有限公司', productName: 'ESP32-WROOM-32E 模组', qty: 5000, amount: 90000, orderDate: '2026-05-12', deliveryDate: '2026-05-30', status: '已确认', priority: '高', salesperson: '刘芳' },
    { id: 'SO003', customer: '比亚迪股份有限公司', productName: '铝制散热片 40x40mm', qty: 20000, amount: 64000, orderDate: '2026-05-05', deliveryDate: '2026-05-20', status: '已发货', priority: '中', salesperson: '李伟' },
    { id: 'SO004', customer: '美的集团', productName: '工业级开关电源 12V 10A', qty: 200, amount: 13000, orderDate: '2026-05-15', deliveryDate: '2026-05-28', status: '待确认', priority: '中', salesperson: '孙悦' }
  ],
  
  // 九、质量协同管理
  qualityInspections: [
    { id: 'QI001', type: '来料检验', productName: 'STM32F407VET6 微控制器', batch: 'B20240501', inspector: '质检员A', date: '2026-05-16', result: '合格', defectRate: 0.01 },
    { id: 'QI002', type: '制程检验', productName: '铝制散热片 40x40mm', batch: 'B20240502', workshop: '机加车间', inspector: '质检员B', date: '2026-05-17', result: '不合格', defectRate: 0.05 },
    { id: 'QI003', type: '出货检验', productName: 'ESP32-WROOM-32E 模组', batch: 'B20240503', customer: '小米', inspector: '质检员C', date: '2026-05-18', result: '合格', defectRate: 0.02 },
    { id: 'QI004', type: '来料检验', productName: '环氧树脂 AB胶', batch: 'B20240504', inspector: '质检员A', date: '2026-05-19', result: '合格', defectRate: 0.01 }
  ],
  
  // 十、财务协同
  financialRecords: [
    { id: 'FIN001', type: '采购付款', orderId: 'PO2024050001', amount: 22750, date: '2026-05-20', status: '已支付', supplierId: 'SUP001', supplierName: '深圳华强电子有限公司' },
    { id: 'FIN002', type: '物流费用', orderId: 'TR001', amount: 1200, date: '2026-05-18', status: '待支付', carrier: '顺丰速运' },
    { id: 'FIN003', type: '销售收款', orderId: 'SO001', amount: 45500, date: '2026-05-15', status: '已收款', customer: '华为技术有限公司' },
    { id: 'FIN004', type: '采购付款', orderId: 'PO2024050003', amount: 6400, date: '2026-05-12', status: '已支付', supplierId: 'SUP002', supplierName: '东莞精密机械制造厂' }
  ],
  
  // 十一、数据分析与BI
  biReports: [
    { id: 'BI001', name: '库存周转分析', type: '库存分析', period: '2026-05', value: 5.2, target: 6.0, status: '需关注' },
    { id: 'BI002', name: '供应商准时交付率', type: '供应商分析', period: '2026-05', value: 0.95, target: 0.97, status: '良好' },
    { id: 'BI003', name: '采购成本分析', type: '采购分析', period: '2026-05', value: 0.88, target: 0.85, status: '需优化' },
    { id: 'BI004', name: '订单准时交付率', type: 'OTD分析', period: '2026-05', value: 0.92, target: 0.95, status: '需提升' }
  ],
  
  // 十二、基础数据管理
  masterData: {
    products: [
      { id: 'PRD001', name: 'STM32F407VET6 微控制器', category: '电子元器件', spec: 'ARM Cortex-M4, 168MHz', unit: '片', price: 45.50, uom: 'PCS' },
      { id: 'PRD002', name: '铝制散热片 40x40mm', category: '机械部件', spec: '40x40x10mm, 6063铝合金', unit: '个', price: 3.20, uom: 'PCS' },
      { id: 'PRD003', name: '防静电PE包装袋', category: '包装材料', spec: '200x300mm, 0.08mm厚', unit: '个', price: 0.35, uom: 'PCS' },
      { id: 'PRD004', name: '环氧树脂 AB胶', category: '化工原料', spec: 'A:B=2:1, 5kg装', unit: '桶', price: 280.00, uom: 'KIT' },
      { id: 'PRD005', name: 'ESP32-WROOM-32E 模组', category: '电子元器件', spec: 'WiFi+蓝牙, 4MB Flash', unit: '片', price: 18.00, uom: 'PCS' },
      { id: 'PRD006', name: '工业级开关电源 12V 10A', category: '电子元器件', spec: '输入AC220V, 输出DC12V/10A', unit: '台', price: 65.00, uom: 'PCS' }
    ],
    customers: [
      { id: 'CUST001', name: '华为技术有限公司', category: '战略客户', contact: '任先生', phone: '13800138111', address: '深圳龙岗' },
      { id: 'CUST002', name: '小米科技有限公司', category: '核心客户', contact: '雷先生', phone: '13800138222', address: '北京海淀' },
      { id: 'CUST003', name: '比亚迪股份有限公司', category: '战略客户', contact: '王先生', phone: '13800138333', address: '深圳坪山' },
      { id: 'CUST004', name: '美的集团', category: '核心客户', contact: '方女士', phone: '13800138444', address: '佛山顺德' }
    ],
    warehouses: [
      { id: 'WH01', name: 'A仓-电子仓', type: '原材料仓', location: '深圳工厂A栋', manager: '张经理', capacity: 10000 },
      { id: 'WH02', name: 'B仓-机械仓', type: '原材料仓', location: '深圳工厂B栋', manager: '李经理', capacity: 8000 },
      { id: 'WH03', name: 'C仓-包材仓', type: '包材仓', location: '深圳工厂C栋', manager: '王经理', capacity: 15000 },
      { id: 'WH04', name: 'D仓-化工仓', type: '危险品仓', location: '深圳工厂D栋', manager: '赵经理', capacity: 5000 }
    ],
    boms: [
      { id: 'BOM001', productId: 'PRD001', productName: 'STM32F407VET6 微控制器', version: 'V2.1', components: 'PCB基板,芯片,电容,电阻', level: 3, status: '生效' },
      { id: 'BOM002', productId: 'PRD005', productName: 'ESP32-WROOM-32E 模组', version: 'V3.0', components: 'PCB基板,ESP32,天线,Flash', level: 2, status: '生效' }
    ]
  },
  
  // 十三、系统集成平台
  integrations: [
    { id: 'INT001', system: 'ERP', type: '数据同步', status: '正常', lastSync: '2026-05-20 10:30:00', frequency: '实时' },
    { id: 'INT002', system: 'MES', type: '生产指令', status: '正常', lastSync: '2026-05-20 09:15:00', frequency: '每5分钟' },
    { id: 'INT003', system: 'WMS', type: '库存同步', status: '正常', lastSync: '2026-05-20 11:00:00', frequency: '实时' },
    { id: 'INT004', system: 'TMS', type: '运输状态', status: '告警', lastSync: '2026-05-19 16:20:00', frequency: '每10分钟' },
    { id: 'INT005', system: 'OA', type: '审批流程', status: '正常', lastSync: '2026-05-20 08:45:00', frequency: '实时' }
  ],
  
  
  // 十四、组织架构
  orgData: {
    departments: [
      {id:'D001',name:'总经理办公室',code:'GM',parentId:null,manager:'张总',memberCount:3,order:1},
      {id:'D002',name:'销售部',code:'SALES',parentId:null,manager:'陈明',memberCount:12,order:2},
      {id:'D003',name:'华南销售组',code:'SALES-SC',parentId:'D002',manager:'陈明',memberCount:5,order:1},
      {id:'D004',name:'华北销售组',code:'SALES-NC',parentId:'D002',manager:'刘芳',memberCount:4,order:2},
      {id:'D005',name:'华东销售组',code:'SALES-EC',parentId:'D002',manager:'李伟',memberCount:3,order:3},
      {id:'D006',name:'采购部',code:'PURCH',parentId:null,manager:'赵磊',memberCount:8,order:3},
      {id:'D007',name:'原料采购组',code:'PURCH-RM',parentId:'D006',manager:'赵磊',memberCount:4,order:1},
      {id:'D008',name:'设备采购组',code:'PURCH-EQ',parentId:'D006',manager:'钱进',memberCount:4,order:2},
      {id:'D009',name:'仓储物流部',code:'WHLG',parentId:null,manager:'王强',memberCount:6,order:4},
      {id:'D010',name:'财务部',code:'FIN',parentId:null,manager:'周华',memberCount:5,order:5},
      {id:'D011',name:'人力资源部',code:'HR',parentId:null,manager:'吴芳',memberCount:3,order:6},
      {id:'D012',name:'售后服务部',code:'AFSALES',parentId:null,manager:'郑刚',memberCount:4,order:7}
    ],
    roles: [
      {id:'R001',name:'系统管理员',code:'ADMIN',permissions:['全部权限']},
      {id:'R002',name:'销售经理',code:'SALES_MGR',permissions:['客户管理','订单管理','销售计划']},
      {id:'R003',name:'销售专员',code:'SALES_REP',permissions:['客户管理','订单录入','销售计划查看']},
      {id:'R004',name:'采购经理',code:'PURCH_MGR',permissions:['采购计划','物料管理','供应商管理']},
      {id:'R005',name:'仓库主管',code:'WH_MGR',permissions:['物流管理','入库管理','出库管理']},
      {id:'R006',name:'财务审核员',code:'FIN_AUDITOR',permissions:['订单审批','售后审批','对账管理']},
      {id:'R007',name:'售后专员',code:'AFTER_REP',permissions:['售后管理','退货处理','退款处理']},
      {id:'R008',name:'只读用户',code:'READONLY',permissions:['数据查看','报表查看']}
    ],
    employees: [
      {id:'E001',name:'陈明',code:'QH000001',deptId:'D002',roleId:'R002',phone:'13800138001',email:'chenming@scm.com',status:'在职',joinDate:'2023-01-15'},
      {id:'E002',name:'刘芳',code:'QH000002',deptId:'D004',roleId:'R002',phone:'13800138002',email:'liufang@scm.com',status:'在职',joinDate:'2023-03-20'},
      {id:'E003',name:'王强',code:'QH000003',deptId:'D009',roleId:'R005',phone:'13800138003',email:'wangqiang@scm.com',status:'在职',joinDate:'2023-05-10'},
      {id:'E004',name:'赵磊',code:'QH000004',deptId:'D006',roleId:'R004',phone:'13800138004',email:'zhaolei@scm.com',status:'在职',joinDate:'2023-02-08'},
      {id:'E005',name:'李伟',code:'QH000005',deptId:'D005',roleId:'R002',phone:'13800138005',email:'liwe@scm.com',status:'在职',joinDate:'2023-07-01'},
      {id:'E006',name:'周华',code:'QH000006',deptId:'D010',roleId:'R006',phone:'13800138006',email:'zhouhua@scm.com',status:'在职',joinDate:'2023-04-18'},
      {id:'E007',name:'郑刚',code:'QH000007',deptId:'D012',roleId:'R007',phone:'13800138007',email:'zhenggang@scm.com',status:'在职',joinDate:'2023-08-12'},
      {id:'E008',name:'吴芳',code:'QH000008',deptId:'D011',roleId:'R001',phone:'13800138008',email:'wufang@scm.com',status:'在职',joinDate:'2023-01-05'},
      {id:'E009',name:'钱进',code:'QH000009',deptId:'D008',roleId:'R004',phone:'13800138009',email:'qianjin@scm.com',status:'在职',joinDate:'2023-09-22'},
      {id:'E010',name:'孙悦',code:'QH000010',deptId:'D007',roleId:'R003',phone:'13800138010',email:'sunyue@scm.com',status:'在职',joinDate:'2024-02-14'}
    ]
  },

  // 销售计划
  salesPlans: [
    {id:'SP001',type:'scheduled',customerId:'CUST001',customerName:'华为技术有限公司',productName:'STM32F407VET6',planQty:20000,actualQty:12500,month:'2026-05',owner:'陈明',status:'执行中',weekDays:[1,3,5],timeSlot:'09:00-12:00',autoGenerate:true,items:[{materialName:'STM32F407VET6',qty:20000,remark:'月度主计划'}]},
    {id:'SP002',type:'scheduled',customerId:'CUST002',customerName:'小米科技有限公司',productName:'ESP32模组',planQty:15000,actualQty:9800,month:'2026-05',owner:'刘芳',status:'执行中',weekDays:[2,4],timeSlot:'14:00-17:00',autoGenerate:true,items:[{materialName:'ESP32-WROOM-32E',qty:15000,remark:'无线模组供应'}]},
    {id:'SP003',type:'scheduled',customerId:'CUST003',customerName:'比亚迪股份有限公司',productName:'铝制散热片',planQty:30000,actualQty:21000,month:'2026-05',owner:'王强',status:'执行中',weekDays:[1,2,3,4,5],timeSlot:'08:00-18:00',autoGenerate:true,items:[{materialName:'铝制散热片',qty:30000,remark:'新能源配套'}]},
    {id:'SP004',type:'temporary',customerId:'CUST001',customerName:'华为技术有限公司',productName:'STM32F407VET6',planQty:5000,actualQty:3200,month:'2026-05',owner:'陈明',status:'执行中',createDate:'2026-05-20',reason:'紧急客户补单',items:[{materialName:'STM32F407VET6',qty:5000,remark:'紧急补单'}]},
    {id:'SP005',type:'temporary',customerId:'CUST004',customerName:'美的集团',productName:'PCB基板 FR-4',planQty:8000,actualQty:4500,month:'2026-05',owner:'刘芳',status:'执行中',createDate:'2026-05-23',reason:'产线临时增补',items:[{materialName:'PCB基板 FR-4',qty:8000,remark:'产线增补'}]}
  ],

  // 采购计划
  purchasePlans: [
    {id:'PP001',materialName:'PCB基板 FR-4',planQty:50000,unit:'片',needDate:'2026-06-01',supplier:'深南电路',status:'待审批'},
    {id:'PP002',materialName:'ARM Cortex-M4芯片',planQty:8000,unit:'片',needDate:'2026-06-05',supplier:'ST原厂',status:'已审批'},
    {id:'PP003',materialName:'铝型材6063',planQty:12000,unit:'kg',needDate:'2026-06-10',supplier:'凤铝铝业',status:'待审批'}
  ],

  // 售后记录
  afterSalesRecords: [
    {id:'AS001',orderId:'SO003',type:'退货退款',reason:'规格不符',items:[{code:'M-STM32-001',name:'STM32F407VET6',spec:'LQFP-100',qty:200,price:42.00,amount:8400}],amount:8400,status:'处理中',date:'2026-05-18',applicant:'王强',warehouseReceived:false},
    {id:'AS002',orderId:'SO001',type:'退款不退货',reason:'价格争议',items:[{code:'M-STM32-001',name:'STM32F407VET6',spec:'LQFP-100',qty:500,price:42.00,amount:21000}],amount:5000,status:'处理中',date:'2026-05-22',applicant:'陈明',warehouseReceived:false}
  ],

  // ID计数器
  counters: {
    demandPlan: 5, purchaseOrder: 6, supplier: 9, productionOrder: 5,
    inventory: 7, warehouseOp: 5, transport: 5, salesOrder: 5,
    quality: 5, financial: 5, biReport: 5, integration: 6,
    salesPlan: 6, purchasePlan: 4, afterSalesRecord: 3
  }
};

// 加载数据（先用默认数据初始化，再异步从 API 加载）
var scmData = JSON.parse(JSON.stringify(defaultData));
async function loadDataFromAPI() {
  try {
    const resp = await fetch(API_BASE + '/api/desktop', { headers: getAuthHeader() });
    if (resp.ok) {
      const data = await resp.json();
      if (data && Object.keys(data).length > 0) {
        // 直接以 API 数据为主，defaultData 仅补充 API 中缺失的模块
        var apiData = JSON.parse(JSON.stringify(data));
        var base = JSON.parse(JSON.stringify(defaultData));
        // 对于 API 中没有的 key，用 defaultData 填充
        for (var k in base) {
          if (base.hasOwnProperty(k) && !apiData.hasOwnProperty(k)) {
            apiData[k] = base[k];
          }
        }
        // 为已有的销售订单数据补充 salesperson 字段（兼容旧数据）
        if (apiData.salesOrders && Array.isArray(apiData.salesOrders)) {
          apiData.salesOrders.forEach(function(order) {
            if (order.salesperson === undefined) {
              // 根据订单 ID 分配默认业务员（兼容之前添加的默认值）
              var defaultSalespersonMap = {
                'SO001': '陈明',
                'SO002': '刘芳', 
                'SO003': '李伟',
                'SO004': '孙悦'
              };
              order.salesperson = defaultSalespersonMap[order.id] || '-';
            }
          });
        }
        scmData = apiData;
        return true;
      }
    }
  } catch (e) { console.error('API 加载失败，使用默认数据', e); }
  return false;
}
function deepMerge(base, override) {
  const result = JSON.parse(JSON.stringify(base));
  for (const key of Object.keys(override)) {
    if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key]) && base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      result[key] = deepMerge(base[key], override[key]);
    } else if (Array.isArray(base[key]) && Array.isArray(override[key])) {
      // 数组合并：先从 base 中匹配 override 的 id，再追加 override 中新的项
      var mergedArr = [];
      var overrideUsed = {};
      base[key].forEach(function(baseItem) {
        var overrideItem = override[key].find(function(o) { return o.id === baseItem.id; });
        if (overrideItem) {
          overrideUsed[overrideItem.id] = true;
          var merged = JSON.parse(JSON.stringify(baseItem));
          for (var k in overrideItem) {
            if (overrideItem.hasOwnProperty(k)) { merged[k] = overrideItem[k]; }
          }
          mergedArr.push(merged);
        } else {
          mergedArr.push(baseItem);
        }
      });
      // 追加 override 中 base 没有的新项
      override[key].forEach(function(overrideItem) {
        if (!overrideUsed[overrideItem.id]) {
          mergedArr.push(overrideItem);
        }
      });
      result[key] = mergedArr;
    } else {
      result[key] = override[key];
    }
  }
  return result;
}
async function saveData() {
  try {
    await fetch(API_BASE + '/api/desktop', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, getAuthHeader()),
      body: JSON.stringify({ data: scmData })
    });
  } catch (e) { console.error('API 保存失败', e); }

  // 同步 orders 到移动端 API（/api/data/save），确保 APP 端数据一致
  try {
    var custMap = {};
    if (scmData.masterData && scmData.masterData.customers) {
      scmData.masterData.customers.forEach(function(c) { custMap[c.name] = c.id; });
    }
    var mobileOrders = (scmData.salesOrders || []).map(function(o) {
      return {
        id: o.id,
        customer_id: custMap[o.customer] || '',
        customer_name: o.customer || '',
        items: o.items || [],
        amount: o.amount || 0,
        status: o.status || '',
        date: o.orderDate || '',
        salesman: o.salesperson || ''
      };
    });
    var mobilePayload = { orders: mobileOrders };
    await fetch(API_BASE.replace(/\/api$/, '') + '/api/data/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mobilePayload)
    });
  } catch (e) { console.error('移动端数据同步失败', e); }

  // 写入 localStorage，使同源浏览器中 mobile.html 的 BroadcastChannel 监听器能读取
  try { localStorage.setItem('scm_v2_data', JSON.stringify(scmData)); } catch(e) {}

  try { new BroadcastChannel('scm_sync').postMessage({type:'data_changed',source:'desktop'}); } catch(e) {}
}
// 不再在启动时无条件保存——会覆盖后端真实数据
// 数据同步由 init() 中的 loadDataFromAPI() → saveData() 完成

// BroadcastChannel 监听移动端数据变更
(function(){
  try {
    var syncCh = new BroadcastChannel('scm_sync');
    syncCh.onmessage = async function(e) {
      if (e.data && e.data.type === 'data_changed' && e.data.source === 'mobile') {
        await loadDataFromAPI();
        if (typeof currentModule !== 'undefined' && currentModule && typeof switchModule === 'function') {
          switchModule(currentModule, currentSubModule);
        }
      }
    };
  } catch(e) {}
})();

// ---------- 工具函数 ----------
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }
function formatDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatMoney(n) {
  return Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function showToast(msg, type = 'info') {
  const container = $('#toastContainer');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => { el.remove(); }, 2800);
}
function openModal(title, bodyHtml, footerHtml) {
  const modal = $('#modal');
  modal.innerHTML = `
    <div class="modal-header">
      <h3>${title}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">${bodyHtml}</div>
    ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
  `;
  $('#modalOverlay').classList.add('show');
}
function closeModal() {
  $('#modalOverlay').classList.remove('show');
  $('#modal').innerHTML = '';
}
$('#modalOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ---------- 侧边栏导航 ----------
const moduleStructure = [
  { id: 'dashboard', name: '供应链驾驶舱', icon: '📊', sub: [] },
  { id: 'demand', name: '需求与计划管理', icon: '📈', sub: [
    { id: 'demand-forecast', name: '销售预测', short: '预测' },
    { id: 'demand-mps', name: '主生产计划MPS', short: 'MPS' },
    { id: 'demand-mrp', name: '物料需求计划MRP', short: 'MRP' },
    { id: 'demand-capacity', name: '产能计划', short: '产能' }
  ]},
  { id: 'purchase', name: '采购与供应管理', icon: '🛒', sub: [
    { id: 'purchase-order', name: '采购订单PO', short: '订单' },
    { id: 'purchase-rfq', name: '采购询价RFQ', short: '询价' },
    { id: 'purchase-arrival', name: '到货管理', short: '到货' },
    { id: 'purchase-cost', name: '采购成本分析', short: '成本' }
  ]},
  { id: 'supplier', name: '供应商管理SRM', icon: '🏭', sub: [
    { id: 'supplier-list', name: '供应商列表', short: '列表' },
    { id: 'supplier-rating', name: '供应商评级', short: '评级' },
    { id: 'supplier-contract', name: '合同管理', short: '合同' },
    { id: 'supplier-risk', name: '风险预警', short: '风险' }
  ]},
  { id: 'salesplan', name: '销售计划', icon: '📅', sub: [
    { id: 'salesplan-scheduled', name: '定时计划', short: '定时' },
    { id: 'salesplan-temporary', name: '临时计划', short: '临时' },
    { id: 'salesplan-realtime', name: '实时销售', short: '实时' },
    { id: 'salesplan-summary', name: '销售汇总', short: '汇总' }
  ]},
  { id: 'production', name: '生产协同管理', icon: '🏗️', sub: [
    { id: 'production-order', name: '生产工单', short: '工单' },
    { id: 'production-progress', name: '生产进度跟踪', short: '进度' },
    { id: 'production-shortage', name: '缺料分析', short: '缺料' },
    { id: 'production-alert', name: '生产异常预警', short: '异常' }
  ]},
  { id: 'inventory', name: '库存管理', icon: '📦', sub: [
    { id: 'inventory-list', name: '库存列表', short: '列表' },
    { id: 'inventory-alert', name: '库存预警', short: '预警' },
    { id: 'inventory-age', name: '库龄分析', short: '库龄' },
    { id: 'inventory-transfer', name: '调拨管理', short: '调拨' }
  ]},
  { id: 'warehouse', name: '仓储管理WMS', icon: '🏪', sub: [
    { id: 'warehouse-in', name: '入库管理', short: '入库' },
    { id: 'warehouse-out', name: '出库管理', short: '出库' },
    { id: 'warehouse-location', name: '库位管理', short: '库位' },
    { id: 'warehouse-picking', name: '拣货策略', short: '拣货' }
  ]},
  { id: 'transport', name: '物流运输管理TMS', icon: '🚚', sub: [
    { id: 'transport-order', name: '发运计划', short: '发运' },
    { id: 'transport-tracking', name: '在途跟踪', short: '跟踪' },
    { id: 'transport-carrier', name: '承运商管理', short: '承运' },
    { id: 'transport-cost', name: '运费结算', short: '运费' }
  ]},
  { id: 'sales', name: '订单协同管理', icon: '📝', sub: [
    { id: 'sales-order', name: '销售订单', short: '订单' },
    { id: 'sales-schedule', name: '订单排程', short: '排程' },
    { id: 'sales-tracking', name: '订单跟踪', short: '跟踪' },
    { id: 'sales-atp', name: '交期承诺ATP', short: '交期' }
  ]},
  { id: 'quality', name: '质量协同管理', icon: '✅', sub: [
    { id: 'quality-iqc', name: '来料检验IQC', short: '来料' },
    { id: 'quality-ipqc', name: '制程检验IPQC', short: '制程' },
    { id: 'quality-oqc', name: '出货检验OQC', short: '出货' },
    { id: 'quality-trace', name: '质量追溯', short: '追溯' }
  ]},
  { id: 'finance', name: '财务协同', icon: '💰', sub: [
    { id: 'finance-payment', name: '采购对账', short: '对账' },
    { id: 'finance-invoice', name: '发票协同', short: '发票' },
    { id: 'finance-cost', name: '成本核算', short: '成本' },
    { id: 'finance-analysis', name: '供应链成本分析', short: '分析' }
  ]},
  { id: 'analytics', name: '数据分析与BI', icon: '📊', sub: [
    { id: 'analytics-dashboard', name: '供应链驾驶舱', short: '驾驶舱' },
    { id: 'analytics-inventory', name: '库存分析', short: '库存' },
    { id: 'analytics-purchase', name: '采购分析', short: '采购' },
    { id: 'analytics-supplier', name: '供应商分析', short: '供应商' }
  ]},
  { id: 'master', name: '基础数据管理', icon: '🗃️', sub: [
    { id: 'master-product', name: '物料主数据', short: '物料' },
    { id: 'master-customer', name: '客户主数据', short: '客户' },
    { id: 'master-warehouse', name: '仓库主数据', short: '仓库' },
    { id: 'master-bom', name: 'BOM主数据', short: 'BOM' }
  ]},
  { id: 'integration', name: '系统集成平台', icon: '🔗', sub: [
    { id: 'integration-status', name: '集成状态', short: '状态' },
    { id: 'integration-erp', name: 'ERP接口', short: 'ERP' },
    { id: 'integration-mes', name: 'MES接口', short: 'MES' },
    { id: 'integration-wms', name: 'WMS接口', short: 'WMS' }
  ]},
  { id: 'org', name: '组织架构', icon: '🏢', sub: [
    { id: 'org-dept', name: '部门管理', short: '部门' },
    { id: 'org-role', name: '角色权限', short: '角色' },
    { id: 'org-user', name: '人员管理', short: '人员' }
  ]}
];

var currentModule = 'dashboard';
var currentSubModule = '';

function renderSidebar() {
  const nav = $('#sidebarNav');
  let html = '';
  moduleStructure.forEach(group => {
    if (group.sub.length === 0) {
      // 一级菜单项
      html += `
        <div class="nav-group" data-module="${group.id}">
          <div class="nav-group-header" onclick="switchModule('${group.id}')">
            <span class="nav-icon">${group.icon}</span>
            <span class="nav-label">${group.name}</span>
          </div>
        </div>`;
    } else {
      // 可折叠菜单组
      const isOpen = currentModule === group.id || group.sub.some(s => s.id === currentSubModule);
      html += `
        <div class="nav-group ${isOpen ? 'open active-parent' : ''}" data-module="${group.id}">
          <div class="nav-group-header" onclick="toggleNavGroup('${group.id}')">
            <span class="nav-icon">${group.icon}</span>
            <span class="nav-label">${group.name}</span>
            <span class="nav-arrow">▶</span>
          </div>
          <div class="nav-sub" style="max-height: ${isOpen ? '800px' : '0'}">
            ${group.sub.map(sub => `
              <div class="nav-sub-item ${currentSubModule === sub.id ? 'active' : ''}" 
                   data-module="${group.id}" data-sub="${sub.id}" 
                   data-short="${sub.short}" onclick="switchSubModule('${group.id}', '${sub.id}')">
                ${sub.name}
              </div>
            `).join('')}
          </div>
        </div>`;
    }
  });
  nav.innerHTML = html;
}

function toggleNavGroup(groupId) {
  const group = $(`[data-module="${groupId}"]`);
  group.classList.toggle('open');
  const sub = group.querySelector('.nav-sub');
  sub.style.maxHeight = group.classList.contains('open') ? '800px' : '0';
}

function switchModule(moduleId) {
  currentModule = moduleId;
  currentSubModule = '';
  renderSidebar();
  renderMainContent();
}

function switchSubModule(moduleId, subId) {
  console.log('[DEBUG] switchSubModule called:', moduleId, subId);
  currentModule = moduleId;
  currentSubModule = subId;
  renderSidebar();
  renderMainContent();
}

// ---------- 主内容渲染 ----------
function renderMainContent() {
  const main = $('#mainContent');
  
  if (currentModule === 'dashboard') {
    renderDashboard();
    return;
  }
  
  console.log('[DEBUG] renderMainContent, currentModule:', currentModule, 'currentSubModule:', currentSubModule);
  
  // 根据模块ID渲染对应内容
  const moduleMap = {
    'demand': window.renderDemandModule || renderDemandModule,
    'purchase': window.renderPurchaseModule || renderPurchaseModule,
    'supplier': window.renderSupplierModule || renderSupplierModule,
    'production': window.renderProductionModule || renderProductionModule,
    'inventory': window.renderInventoryModule || renderInventoryModule,
    'warehouse': window.renderWarehouseModule || renderWarehouseModule,
    'transport': window.renderTransportModule || renderTransportModule,
    'sales': window.renderSalesModule || renderSalesModule,
    'quality': window.renderQualityModule || renderQualityModule,
    'finance': window.renderFinanceModule || renderFinanceModule,
    'analytics': window.renderAnalyticsModule || renderAnalyticsModule,
    'master': window.renderMasterModule || renderMasterModule,
    'integration': window.renderIntegrationModule || renderIntegrationModule,
    'org': window.renderOrgModule || renderOrgModule,
    'salesplan': window.renderSalesPlanModule || renderSalesPlanModule
  };
  
  if (moduleMap[currentModule]) {
    moduleMap[currentModule]();
  } else {
    // 回退：通过 window 动态查找 renderXxxModule（支持 app-modules.js 定义的模块）
    var fnKey = 'render' + currentModule.charAt(0).toUpperCase() + currentModule.slice(1) + 'Module';
    var fnFallback = window[fnKey];
    if (typeof fnFallback === 'function') {
      fnFallback();
    } else {
      main.innerHTML = '<div class="module active"><div class="module-header"><h2>模块开发中</h2></div></div>';
    }
  }
}

// ---------- 各模块实现 ----------

// 1. 供应链驾驶舱
function renderDashboard() {
  const main = $('#mainContent');
  const totalInventory = scmData.inventory.reduce((sum, i) => sum + i.qty, 0);
  const warningInventory = scmData.inventory.filter(i => i.qty < i.safetyStock).length;
  const pendingOrders = scmData.purchaseOrders.filter(o => o.status === '待审批').length;
  const totalSuppliers = scmData.suppliers.length;
  const activeSuppliers = scmData.suppliers.filter(s => s.status === '合作中').length;
  const totalSales = scmData.salesOrders.reduce((sum, o) => sum + o.amount, 0);
  
  const html = `
    <div class="module active" id="module-dashboard">
      <div class="module-header">
        <h2>供应链驾驶舱</h2>
        <span class="module-time">数据更新时间: ${formatDate(Date.now())}</span>
      </div>
      
      <!-- 核心KPI -->
      <div class="stats-grid cols-5">
        <div class="stat-card">
          <div class="stat-icon blue">📦</div>
          <div class="stat-info">
            <div class="stat-label">库存总量</div>
            <div class="stat-value">${totalInventory.toLocaleString()}</div>
            <div class="stat-desc">预警: ${warningInventory}个SKU</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">🏭</div>
          <div class="stat-info">
            <div class="stat-label">供应商总数</div>
            <div class="stat-value">${totalSuppliers}</div>
            <div class="stat-desc">合作中: ${activeSuppliers}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">📋</div>
          <div class="stat-info">
            <div class="stat-label">待处理审批</div>
            <div class="stat-value">${pendingOrders}</div>
            <div class="stat-desc">采购订单</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">🚚</div>
          <div class="stat-info">
            <div class="stat-label">在途运输</div>
            <div class="stat-value">${scmData.transportOrders.filter(t => t.status === '运输中').length}</div>
            <div class="stat-desc">运输中订单</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple">💰</div>
          <div class="stat-info">
            <div class="stat-label">本月销售额</div>
            <div class="stat-value">${(totalSales/10000).toFixed(1)}万</div>
            <div class="stat-desc">人民币</div>
          </div>
        </div>
      </div>
      
      <!-- 图表区 -->
      <div class="charts-row cols-3">
        <div class="chart-card">
          <h3>库存预警Top 5</h3>
          <div class="chart-container" id="inventoryChart"></div>
        </div>
        <div class="chart-card">
          <h3>供应商评级分布</h3>
          <div class="chart-container" id="supplierChart"></div>
        </div>
        <div class="chart-card">
          <h3>订单状态分布</h3>
          <div class="chart-container" id="orderChart"></div>
        </div>
      </div>
      
      <!-- 预警信息 -->
      <div class="chart-card full" style="margin-top:14px;">
        <h3>实时预警信息</h3>
        <div class="cockpit-alert-list" id="alertList"></div>
      </div>
      
      <!-- KPI环形图 -->
      <div class="chart-card full" style="margin-top:14px;">
        <h3>供应链KPI概览</h3>
        <div class="kpi-ring-row" id="kpiRings"></div>
      </div>
    </div>
  `;
  
  main.innerHTML = html;
  
  // 渲染库存预警图表
  const warningItems = scmData.inventory.filter(i => i.qty < i.safetyStock)
    .sort((a,b) => (a.qty/a.safetyStock) - (b.qty/b.safetyStock))
    .slice(0, 5);
  let invHtml = '';
  warningItems.forEach(item => {
    const ratio = item.qty / item.safetyStock;
    const colorClass = ratio < 0.5 ? 'warn' : 'caution';
    invHtml += `
      <div class="hbar-item">
        <span class="hbar-label" title="${item.productName}">${item.productName}</span>
        <div class="hbar-track"><div class="hbar-fill ${colorClass}" style="width:${Math.round(ratio * 100)}%"></div></div>
        <span class="hbar-value">${item.qty}/${item.safetyStock}</span>
      </div>`;
  });
  $('#inventoryChart').innerHTML = invHtml || '<p style="text-align:center;color:var(--text-muted);padding:20px 0;">库存状态良好</p>';
  
  // 供应商评级分布
  const ratingMap = {};
  scmData.suppliers.forEach(s => { ratingMap[s.rating] = (ratingMap[s.rating] || 0) + 1; });
  let supHtml = '';
  [5,4,3,2,1].forEach(r => {
    const cnt = ratingMap[r] || 0;
    const pct = totalSuppliers ? Math.round(cnt / totalSuppliers * 100) : 0;
    supHtml += `
      <div class="bar-row">
        <span class="bar-label">${'★'.repeat(r)}</span>
        <div class="bar-track"><div class="bar-fill blue" style="width:${Math.max(pct, 5)}%"></div></div>
        <span class="bar-value">${cnt}</span>
      </div>`;
  });
  $('#supplierChart').innerHTML = supHtml;
  
  // 订单状态分布
  const orderStatusMap = {};
  scmData.purchaseOrders.forEach(o => { orderStatusMap[o.status] = (orderStatusMap[o.status] || 0) + 1; });
  const statusOrder = ['待审批','已审批','已发货','已完成','已取消'];
  const statusColors = { '待审批':'orange','已审批':'blue','已发货':'purple','已完成':'green','已取消':'red' };
  let orderHtml = '';
  statusOrder.forEach(s => {
    const cnt = orderStatusMap[s] || 0;
    const pct = scmData.purchaseOrders.length ? Math.round(cnt / scmData.purchaseOrders.length * 100) : 0;
    orderHtml += `
      <div class="bar-row">
        <span class="bar-label">${s}</span>
        <div class="bar-track"><div class="bar-fill ${statusColors[s] || 'blue'}" style="width:${Math.max(pct, 3)}%"></div></div>
        <span class="bar-value">${cnt}</span>
      </div>`;
  });
  $('#orderChart').innerHTML = orderHtml;
  
  // 预警信息
  const alerts = [];
  scmData.inventory.forEach(i => {
    var minQty = Math.min(i.qty, i.logicalQty || i.qty);
    var minLabel = (i.logicalQty !== undefined && i.logicalQty < i.qty) ? '逻辑库存' : '库存';
    if (minQty < i.safetyStock * 0.5) {
      alerts.push({ type: 'danger', msg: `${i.productName} ${minLabel}严重不足 (${minQty}/${i.safetyStock})` });
    } else if (minQty < i.safetyStock) {
      alerts.push({ type: 'warning', msg: `${i.productName} ${minLabel}低于安全库存 (${minQty}/${i.safetyStock})` });
    }
  });
  scmData.purchaseOrders.forEach(o => {
    if (o.status === '待审批') {
      alerts.push({ type: 'warning', msg: `采购订单 ${o.id} 待审批` });
    }
  });
  scmData.transportOrders.forEach(t => {
    if (t.status === '运输中') {
      alerts.push({ type: 'info', msg: `运输订单 ${t.id} 运输中 (${t.from} → ${t.to})` });
    }
  });
  
  let alertHtml = '';
  alerts.slice(0, 8).forEach(a => {
    alertHtml += `
      <div class="cockpit-alert-item">
        <div class="cockpit-alert-dot ${a.type === 'danger' ? 'red' : a.type === 'warning' ? 'orange' : 'blue'}"></div>
        <div class="cockpit-alert-msg">${a.msg}</div>
      </div>`;
  });
  $('#alertList').innerHTML = alertHtml || '<p style="text-align:center;color:var(--text-muted);padding:20px 0;">暂无预警信息</p>';
  
  // KPI环形图
  const kpis = [
    { label: '库存周转率', value: 5.2, target: 6.0, color: 'blue' },
    { label: '准时交付率', value: 0.95, target: 0.97, color: 'green' },
    { label: '采购合格率', value: 0.98, target: 0.99, color: 'orange' },
    { label: '供应商绩效', value: 0.88, target: 0.90, color: 'purple' }
  ];
  
  let kpiHtml = '';
  kpis.forEach(kpi => {
    const pct = Math.round((kpi.value / kpi.target) * 100);
    kpiHtml += `
      <div class="kpi-ring">
        <div class="kpi-ring-circle" style="background: conic-gradient(var(--${kpi.color}) 0% ${pct}%, #f1f3f4 ${pct}% 100%);">
          <div class="kpi-ring-value">${(kpi.value * 100).toFixed(0)}%</div>
        </div>
        <div class="kpi-ring-label">${kpi.label}</div>
      </div>`;
  });
  $('#kpiRings').innerHTML = kpiHtml;
}

// 2. 需求与计划管理模块
function renderDemandModule() {
  const main = $('#mainContent');
  const subModules = {
    'demand-forecast': { name: '销售预测', data: scmData.demandPlans.filter(d => d.type === '销售预测') },
    'demand-mps': { name: '主生产计划MPS', data: scmData.demandPlans.filter(d => d.type === '主生产计划') },
    'demand-mrp': { name: '物料需求计划MRP', data: scmData.demandPlans.filter(d => d.type === '物料需求计划') },
    'demand-capacity': { name: '产能计划', data: scmData.demandPlans.filter(d => d.type === '产能计划') }
  };
  
  const activeSub = currentSubModule || 'demand-forecast';
  const subData = subModules[activeSub] || subModules['demand-forecast'];
  
  const html = `
    <div class="module active" id="module-demand">
      <div class="module-header">
        <h2>需求与计划管理 - ${subData.name}</h2>
        <div class="module-header-actions">
          <button class="btn btn-primary" onclick="openDemandForm()">+ 新增计划</button>
        </div>
      </div>
      
      <div class="module-tabs">
        ${Object.entries(subModules).map(([id, sub]) => `
          <div class="module-tab ${activeSub === id ? 'active' : ''}" onclick="switchSubModule('demand', '${id}')">
            ${sub.name}
          </div>
        `).join('')}
      </div>
      
      <div class="toolbar">
        <input class="input" id="demandSearch" placeholder="搜索计划名称/产品..." oninput="filterDemandTable()">
        <select class="select" id="demandStatusFilter" onchange="filterDemandTable()">
          <option value="">全部状态</option>
          <option value="草稿">草稿</option>
          <option value="待审核">待审核</option>
          <option value="已审核">已审核</option>
          <option value="执行中">执行中</option>
        </select>
      </div>
      
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>计划编号</th><th>计划名称</th><th>类型</th><th>产品</th>
              <th>月份</th><th>预测数量</th><th>置信度</th><th>状态</th><th>操作</th>
            </tr>
          </thead>
          <tbody id="demandTbody"></tbody>
        </table>
      </div>
      <div class="pagination" id="demandPagination"></div>
    </div>
  `;
  
  main.innerHTML = html;
  renderDemandTable(subData.data);
}

function renderDemandTable(data) {
  const tbody = $('#demandTbody');
  if (!tbody) return;
  
  let html = '';
  data.forEach(item => {
    const statusBadge = item.status === '已审核' ? 'badge-success' : 
                       item.status === '执行中' ? 'badge-info' :
                       item.status === '待审核' ? 'badge-warning' : 'badge-secondary';
    html += `
      <tr>
        <td>${item.id}</td>
        <td><strong>${item.name}</strong></td>
        <td>${item.type}</td>
        <td>${item.product}</td>
        <td>${item.month}</td>
        <td>${item.forecastQty.toLocaleString()}</td>
        <td>${(item.confidence * 100).toFixed(0)}%</td>
        <td><span class="badge ${statusBadge}">${item.status}</span></td>
        <td>
          <div class="action-group">
            <button class="btn btn-outline btn-xs" onclick="editDemand('${item.id}')">编辑</button>
            <button class="btn btn-danger btn-xs" onclick="deleteDemand('${item.id}')">删除</button>
          </div>
        </td>
      </tr>`;
  });
  
  tbody.innerHTML = html || '<tr><td colspan="9"><div class="empty-state"><p>暂无数据</p></div></td></tr>';
}

// 3. 采购与供应管理模块
function renderPurchaseModule() {
  const main = $('#mainContent');
  const subModules = {
    'purchase-order': { name: '采购订单PO', data: scmData.purchaseOrders },
    'purchase-rfq': { name: '采购询价RFQ', data: [] },
    'purchase-arrival': { name: '到货管理', data: [] },
    'purchase-cost': { name: '采购成本分析', data: [] }
  };
  
  const activeSub = currentSubModule || 'purchase-order';
  const subData = subModules[activeSub] || subModules['purchase-order'];
  
  const html = `
    <div class="module active" id="module-purchase">
      <div class="module-header">
        <h2>采购与供应管理 - ${subData.name}</h2>
        <div class="module-header-actions">
          <button class="btn btn-primary" onclick="openPurchaseForm()">+ 新建采购</button>
        </div>
      </div>
      
      <div class="module-tabs">
        ${Object.entries(subModules).map(([id, sub]) => `
          <div class="module-tab ${activeSub === id ? 'active' : ''}" onclick="switchSubModule('purchase', '${id}')">
            ${sub.name}
          </div>
        `).join('')}
      </div>
      
      <div class="toolbar">
        <input class="input" id="purchaseSearch" placeholder="搜索订单号/供应商..." oninput="filterPurchaseTable()">
        <select class="select" id="purchaseStatusFilter" onchange="filterPurchaseTable()">
          <option value="">全部状态</option>
          <option value="待审批">待审批</option>
          <option value="已审批">已审批</option>
          <option value="已发货">已发货</option>
          <option value="已完成">已完成</option>
          <option value="已取消">已取消</option>
        </select>
        <select class="select" id="purchaseTypeFilter" onchange="filterPurchaseTable()">
          <option value="">全部类型</option>
          <option value="标准采购">标准采购</option>
          <option value="紧急采购">紧急采购</option>
          <option value="招标采购">招标采购</option>
        </select>
      </div>
      
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>订单号</th><th>供应商</th><th>产品</th><th>数量</th>
              <th>金额(元)</th><th>下单日期</th><th>类型</th><th>状态</th><th>操作</th>
            </tr>
          </thead>
          <tbody id="purchaseTbody"></tbody>
        </table>
      </div>
      <div class="pagination" id="purchasePagination"></div>
    </div>
  `;
  
  main.innerHTML = html;
  renderPurchaseTable(subData.data);
}

function renderPurchaseTable(data) {
  const tbody = $('#purchaseTbody');
  if (!tbody) return;
  
  const statusBadgeMap = {
    '待审批': 'badge-warning', '已审批': 'badge-info',
    '已发货': 'badge-info', '已完成': 'badge-success',
    '已取消': 'badge-secondary'
  };
  
  let html = '';
  data.forEach(order => {
    html += `
      <tr>
        <td><strong>${order.id}</strong></td>
        <td>${order.supplierName}</td>
        <td>${order.productName}</td>
        <td>${order.qty.toLocaleString()}</td>
        <td>${formatMoney(order.amount)}</td>
        <td>${order.date}</td>
        <td>${order.type}</td>
        <td><span class="badge ${statusBadgeMap[order.status] || 'badge-secondary'}">${order.status}</span></td>
        <td>
          <div class="action-group">
            ${order.status === '待审批' ? `<button class="btn btn-success btn-xs" onclick="approvePurchase('${order.id}')">审批</button>` : ''}
            <button class="btn btn-outline btn-xs" onclick="viewPurchase('${order.id}')">查看</button>
            <button class="btn btn-danger btn-xs" onclick="deletePurchase('${order.id}')">删除</button>
          </div>
        </td>
      </tr>`;
  });
  
  tbody.innerHTML = html || '<tr><td colspan="9"><div class="empty-state"><p>暂无采购订单</p></div></td></tr>';
}

// 4. 供应商管理模块
function renderSupplierModule() {
  const main = $('#mainContent');
  const subModules = {
    'supplier-list': { name: '供应商列表', data: scmData.suppliers },
    'supplier-rating': { name: '供应商评级', data: scmData.suppliers },
    'supplier-contract': { name: '合同管理', data: [] },
    'supplier-risk': { name: '风险预警', data: [] }
  };
  
  const activeSub = currentSubModule || 'supplier-list';
  const subData = subModules[activeSub] || subModules['supplier-list'];
  
  const html = `
    <div class="module active" id="module-supplier">
      <div class="module-header">
        <h2>供应商管理SRM - ${subData.name}</h2>
        <div class="module-header-actions">
          <button class="btn btn-primary" onclick="openSupplierForm()">+ 新增供应商</button>
        </div>
      </div>
      
      <div class="module-tabs">
        ${Object.entries(subModules).map(([id, sub]) => `
          <div class="module-tab ${activeSub === id ? 'active' : ''}" onclick="switchSubModule('supplier', '${id}')">
            ${sub.name}
          </div>
        `).join('')}
      </div>
      
      <div class="toolbar">
        <input class="input" id="supplierSearch" placeholder="搜索供应商名称/联系人..." oninput="filterSupplierTable()">
        <select class="select" id="supplierCategoryFilter" onchange="filterSupplierTable()">
          <option value="">全部分类</option>
          <option value="电子元器件">电子元器件</option>
          <option value="机械部件">机械部件</option>
          <option value="包装材料">包装材料</option>
          <option value="化工原料">化工原料</option>
          <option value="物流服务">物流服务</option>
          <option value="设备供应">设备供应</option>
          <option value="原材料">原材料</option>
        </select>
        <select class="select" id="supplierStatusFilter" onchange="filterSupplierTable()">
          <option value="">全部状态</option>
          <option value="合作中">合作中</option>
          <option value="暂停合作">暂停合作</option>
          <option value="潜在供应商">潜在供应商</option>
        </select>
      </div>
      
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>编号</th><th>供应商名称</th><th>分类</th><th>联系人</th>
              <th>电话</th><th>类型</th><th>评级</th><th>绩效分</th><th>状态</th><th>操作</th>
            </tr>
          </thead>
          <tbody id="supplierTbody"></tbody>
        </table>
      </div>
      <div class="pagination" id="supplierPagination"></div>
    </div>
  `;
  
  main.innerHTML = html;
  renderSupplierTable(subData.data);
}

function renderSupplierTable(data) {
  const tbody = $('#supplierTbody');
  if (!tbody) return;
  
  let html = '';
  data.forEach(s => {
    const stars = '★'.repeat(s.rating) + '☆'.repeat(5 - s.rating);
    const statusBadge = s.status === '合作中' ? 'badge-success' : 
                       s.status === '暂停合作' ? 'badge-warning' : 'badge-info';
    const scoreColor = s.score >= 90 ? 'badge-success' : 
                      s.score >= 80 ? 'badge-info' : 
                      s.score >= 70 ? 'badge-warning' : 'badge-danger';
    
    html += `
      <tr>
        <td>${s.id}</td>
        <td><strong>${s.name}</strong></td>
        <td>${s.category}</td>
        <td>${s.contact}</td>
        <td>${s.phone}</td>
        <td>${s.type}</td>
        <td><span class="rating-stars">${stars}</span></td>
        <td><span class="badge ${scoreColor}">${s.score}</span></td>
        <td><span class="badge ${statusBadge}">${s.status}</span></td>
        <td>
          <div class="action-group">
            <button class="btn btn-outline btn-xs" onclick="editSupplier('${s.id}')">编辑</button>
            <button class="btn btn-danger btn-xs" onclick="deleteSupplier('${s.id}')">删除</button>
          </div>
        </td>
      </tr>`;
  });
  
  tbody.innerHTML = html || '<tr><td colspan="10"><div class="empty-state"><p>暂无供应商</p></div></td></tr>';
}

// 由于代码长度限制，这里只展示核心框架，其他模块的实现类似
function renderProductionModule() {
  $('#mainContent').innerHTML = `
    <div class="module active">
      <div class="module-header">
        <h2>生产协同管理</h2>
        <button class="btn btn-primary">+ 新建工单</button>
      </div>
      <div class="info-panel">📊 生产协同管理模块：包含生产计划下发、工单协同、BOM协同、生产进度跟踪、缺料分析、委外加工管理、齐套分析、生产异常预警等功能。</div>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>工单号</th><th>产品</th><th>数量</th><th>开始日期</th><th>结束日期</th><th>车间</th><th>状态</th><th>优先级</th><th>操作</th></tr></thead>
          <tbody>
            ${scmData.productionOrders.map(o => `
              <tr>
                <td>${o.id}</td><td>${o.productName}</td><td>${o.qty}</td>
                <td>${o.startDate}</td><td>${o.endDate}</td><td>${o.workshop}</td>
                <td><span class="badge ${o.status === '生产中' ? 'badge-info' : o.status === '已完成' ? 'badge-success' : 'badge-warning'}">${o.status}</span></td>
                <td><span class="badge ${o.priority === '高' ? 'badge-danger' : 'badge-warning'}">${o.priority}</span></td>
                <td><button class="btn btn-outline btn-xs">查看</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderInventoryModule() {
  $('#mainContent').innerHTML = `
    <div class="module active">
      <div class="module-header">
        <h2>库存管理</h2>
        <div class="module-header-actions">
          <button class="btn btn-success" onclick="window._openStockIO('in')">入库</button>
          <button class="btn btn-warning" onclick="window._openStockIO('out')">出库</button>
          <button class="btn btn-primary" onclick="window._openTransfer()">调拨</button>
        </div>
      </div>
      <div class="info-panel">📦 库存管理模块：包含安全库存、库存预警、批次管理、保质期管理、库龄分析、呆滞库存分析、调拨管理、盘点管理、库存成本分析等功能。</div>
      <div class="toolbar">
        <input class="input" placeholder="搜索产品名称/SKU...">
        <select class="select"><option>全部状态</option><option>库存正常</option><option>库存预警</option></select>
      </div>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>产品名称</th><th>SKU</th><th>分类</th><th>仓库</th><th>库位</th><th>当前库存</th><th>逻辑库存</th><th>安全库存</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            ${scmData.inventory.map(i => `
              <tr class="${(i.qty < i.safetyStock || i.logicalQty < i.safetyStock) ? ((i.qty < i.safetyStock*0.5 || i.logicalQty < i.safetyStock*0.5) ? 'row-danger' : 'row-warning') : ''}">
                <td>${i.productName}</td><td>${i.sku}</td><td>${i.category}</td>
                <td>${i.warehouse}</td><td>${i.location}</td>
                <td><strong>${i.qty}</strong></td><td><strong>${i.logicalQty}</strong></td><td>${i.safetyStock}</td>
                <td><span class="badge ${i.status === '预警' ? 'badge-danger' : 'badge-success'}">${i.status}</span></td>
                <td>
                  <div class="action-group">
                    <button class="btn btn-success btn-xs">入库</button>
                    <button class="btn btn-warning btn-xs">出库</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderWarehouseModule() {
  $('#mainContent').innerHTML = `
    <div class="module active">
      <div class="module-header">
        <h2>仓储管理WMS</h2>
        <button class="btn btn-primary">+ 新建作业</button>
      </div>
      <div class="info-panel">🏪 仓储管理模块：包含入库管理、出库管理、库位管理、条码/RFID、上架策略、拣货策略、波次管理、自动化仓储接口、仓库作业绩效等功能。</div>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>作业号</th><th>类型</th><th>产品</th><th>数量</th><th>仓库</th><th>操作员</th><th>日期</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            ${scmData.warehouseOperations.map(w => `
              <tr>
                <td>${w.id}</td><td>${w.type}</td><td>${w.productName}</td><td>${w.qty}</td>
                <td>${w.warehouse || w.fromWarehouse}</td><td>${w.operator}</td><td>${w.date}</td>
                <td><span class="badge ${w.status === '已完成' ? 'badge-success' : w.status === '进行中' ? 'badge-info' : 'badge-warning'}">${w.status}</span></td>
                <td><button class="btn btn-outline btn-xs">查看</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderTransportModule() {
  $('#mainContent').innerHTML = `
    <div class="module active">
      <div class="module-header">
        <h2>物流运输管理TMS</h2>
        <button class="btn btn-primary">+ 新建运输</button>
      </div>
      <div class="info-panel">🚚 物流运输管理模块：包含发运计划、车辆管理、路线优化、承运商管理、运费结算、在途跟踪、配送签收、物流KPI分析等功能。</div>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>运输单号</th><th>关联订单</th><th>起运地</th><th>目的地</th><th>承运商</th><th>司机</th><th>开始日期</th><th>状态</th><th>费用(元)</th><th>操作</th></tr></thead>
          <tbody>
            ${scmData.transportOrders.map(t => `
              <tr>
                <td>${t.id}</td><td>${t.orderId}</td><td>${t.from}</td><td>${t.to}</td>
                <td>${t.carrier}</td><td>${t.driver}</td><td>${t.startDate}</td>
                <td><span class="badge ${t.status === '运输中' ? 'badge-info' : t.status === '已完成' ? 'badge-success' : 'badge-warning'}">${t.status}</span></td>
                <td>${formatMoney(t.cost)}</td>
                <td><button class="btn btn-outline btn-xs">跟踪</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 15. 销售计划（本地兜底渲染，app-modules.js 的 window.renderSalesPlanModule 优先）
function renderSalesPlanModule() {
  console.log('[DEBUG] renderSalesPlanModule (local fallback) called, sub:', currentSubModule);
  var data = scmData.salesPlans || [];
  var sub = currentSubModule || 'salesplan-scheduled';

  var subLabels = { 'salesplan-scheduled': '定时计划', 'salesplan-temporary': '临时计划', 'salesplan-realtime': '实时销售', 'salesplan-summary': '销售汇总' };
  var subDescs = { 'salesplan-scheduled': '配置每周执行日期与时段，系统定时自动生成标准化销售计划', 'salesplan-temporary': '根据临时业务需求快速创建一次性销售计划', 'salesplan-realtime': '查看所有销售计划的实时执行进度与达成情况', 'salesplan-summary': '按类型与周期汇总销售计划执行数据' };

  var tabsHtml = Object.keys(subLabels).map(function(k) {
    return '<span class="module-tab' + (sub === k ? ' active' : '') + '" onclick="switchSubModule(\'salesplan\',\'' + k + '\')">' + subLabels[k] + '</span>';
  }).join('');

  var filtered = [];
  if (sub === 'salesplan-scheduled') filtered = data.filter(function(s) { return s.type === 'scheduled'; });
  else if (sub === 'salesplan-temporary') filtered = data.filter(function(s) { return s.type === 'temporary'; });
  else filtered = data;

  function badgeClass(rate) { return rate >= 90 ? 'badge-success' : rate >= 60 ? 'badge-warning' : 'badge-danger'; }
  function typeBadge(t) { return t === 'scheduled' ? '<span class="badge badge-info">定时</span>' : '<span class="badge badge-warning">临时</span>'; }
  function calcRate(s) { return s.planQty > 0 ? (s.actualQty / s.planQty * 100).toFixed(1) : '0.0'; }

  if (sub === 'salesplan-summary') {
    var totalPlan = 0, totalActual = 0, scheduledCnt = 0, tempCnt = 0;
    data.forEach(function(s) { totalPlan += s.planQty || 0; totalActual += s.actualQty || 0; if (s.type === 'scheduled') scheduledCnt++; else tempCnt++; });
    var rate = totalPlan > 0 ? (totalActual / totalPlan * 100).toFixed(1) : '0.0';
    $('#mainContent').innerHTML =
      '<div class="module active">' +
        '<div class="module-header"><h2>销售计划</h2></div>' +
        '<div class="module-tabs">' + tabsHtml + '</div>' +
        '<div class="info-panel">📊 ' + subDescs['salesplan-summary'] + '</div>' +
        '<div class="module-body">' +
          '<div class="stats-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px;">' +
            '<div class="stat-card"><div class="stat-label">总计划量</div><div class="stat-value">' + totalPlan.toLocaleString() + '</div></div>' +
            '<div class="stat-card"><div class="stat-label">总实际量</div><div class="stat-value">' + totalActual.toLocaleString() + '</div></div>' +
            '<div class="stat-card"><div class="stat-label">整体达成率</div><div class="stat-value" style="color:' + (rate >= 90 ? 'var(--success)' : rate >= 60 ? 'var(--warning)' : 'var(--danger)') + '">' + rate + '%</div></div>' +
            '<div class="stat-card"><div class="stat-label">计划总数</div><div class="stat-value">' + data.length + ' 项</div></div>' +
          '</div>' +
          '<div class="table-wrapper"><table class="table">' +
            '<thead><tr><th>类型</th><th>计划数</th><th>计划量</th><th>实际量</th><th>达成率</th></tr></thead>' +
            '<tbody>' +
              '<tr><td><span class="badge badge-info">定时</span></td><td>' + scheduledCnt + '</td><td>' + data.filter(function(s){return s.type==='scheduled';}).reduce(function(a,s){return a+(s.planQty||0);},0).toLocaleString() + '</td><td>' + data.filter(function(s){return s.type==='scheduled';}).reduce(function(a,s){return a+(s.actualQty||0);},0).toLocaleString() + '</td><td>' + (data.filter(function(s){return s.type==='scheduled';}).reduce(function(a,s){return a+(s.planQty||0);},0) > 0 ? (data.filter(function(s){return s.type==='scheduled';}).reduce(function(a,s){return a+(s.actualQty||0);},0) / data.filter(function(s){return s.type==='scheduled';}).reduce(function(a,s){return a+(s.planQty||0);},0) * 100).toFixed(1) : '0.0') + '%</td></tr>' +
              '<tr><td><span class="badge badge-warning">临时</span></td><td>' + tempCnt + '</td><td>' + data.filter(function(s){return s.type==='temporary';}).reduce(function(a,s){return a+(s.planQty||0);},0).toLocaleString() + '</td><td>' + data.filter(function(s){return s.type==='temporary';}).reduce(function(a,s){return a+(s.actualQty||0);},0).toLocaleString() + '</td><td>' + (data.filter(function(s){return s.type==='temporary';}).reduce(function(a,s){return a+(s.planQty||0);},0) > 0 ? (data.filter(function(s){return s.type==='temporary';}).reduce(function(a,s){return a+(s.actualQty||0);},0) / data.filter(function(s){return s.type==='temporary';}).reduce(function(a,s){return a+(s.planQty||0);},0) * 100).toFixed(1) : '0.0') + '%</td></tr>' +
            '</tbody>' +
          '</table></div>' +
        '</div>' +
      '</div>';
    return;
  }

  var rowsHtml = filtered.length === 0 ? '<tr><td colspan="9" style="text-align:center;padding:40px;color:#9aa0a6;">暂无数据</td></tr>' :
    filtered.map(function(s) {
      var r = calcRate(s);
      return '<tr class="clickable-row" onclick="if(window._viewSalesPlan)window._viewSalesPlan(\'' + s.id + '\')">' +
        '<td>' + typeBadge(s.type) + '</td>' +
        '<td>' + (s.customerName || '-') + '</td>' +
        '<td>' + (s.productName || '-') + '</td>' +
        '<td>' + (s.month || '-') + '</td>' +
        '<td>' + (s.planQty || 0).toLocaleString() + '</td>' +
        '<td>' + (s.actualQty || 0).toLocaleString() + '</td>' +
        '<td><span class="badge ' + badgeClass(parseFloat(r)) + '">' + r + '%</span></td>' +
        '<td>' + (s.owner || '-') + '</td>' +
        '<td><div class="action-group">' +
          '<button class="btn btn-outline btn-xs" onclick="event.stopPropagation();if(window._viewSalesPlan)window._viewSalesPlan(\'' + s.id + '\')">查看</button>' +
          '<button class="btn btn-outline btn-xs" onclick="event.stopPropagation();if(window._editSalesPlan)window._editSalesPlan(\'' + s.id + '\')">编辑</button>' +
          '<button class="btn btn-danger btn-xs" onclick="event.stopPropagation();if(window._deleteSalesPlan)window._deleteSalesPlan(\'' + s.id + '\')">删除</button>' +
        '</div></td>' +
      '</tr>';
    }).join('');

  $('#mainContent').innerHTML =
    '<div class="module active">' +
      '<div class="module-header">' +
        '<h2>销售计划</h2>' +
        '<div class="module-header-actions">' +
          '<button class="btn btn-primary" onclick="if(window._openSalesPlanForm)window._openSalesPlanForm()">+ 新建计划</button>' +
        '</div>' +
      '</div>' +
      '<div class="module-tabs">' + tabsHtml + '</div>' +
      '<div class="info-panel">📅 ' + (subDescs[sub] || '') + '</div>' +
      '<div class="table-wrapper"><table class="table">' +
        '<thead><tr><th>类型</th><th>客户</th><th>产品</th><th>月份</th><th>计划量</th><th>实际量</th><th>达成率</th><th>负责人</th><th>操作</th></tr></thead>' +
        '<tbody>' + rowsHtml + '</tbody>' +
      '</table></div>' +
    '</div>';
}

function renderSalesModule() {
  var data = scmData.salesOrders;
  $('#mainContent').innerHTML = `
    <div class="module active">
      <div class="module-header">
        <h2>订单协同管理</h2>
        <div class="module-header-actions">
          <button class="btn btn-primary" onclick="window._openSalesForm()">+ 新建订单</button>
        </div>
      </div>
      <div class="info-panel">📝 订单协同管理模块：包含销售订单、客户订单协同、订单排程、交期承诺ATP、订单跟踪、发货协同、客户满意度分析等功能。</div>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>订单号</th><th>客户</th><th>产品</th><th>数量</th><th>金额(元)</th><th>下单日期</th><th>交期</th><th>状态</th><th>业务员</th><th>优先级</th><th>操作</th></tr></thead>
          <tbody>
            ${data.map(s => `
              <tr class="clickable-row" onclick="window._viewSales('${s.id}')">
                <td>${s.id}</td><td>${s.customer}</td><td>${s.productName}</td><td>${s.qty}</td>
                <td>${formatMoney(s.amount)}</td><td>${s.orderDate}</td><td>${s.deliveryDate}</td>
                <td><span class="badge ${s.status === '已发货' ? 'badge-success' : s.status === '生产中' ? 'badge-info' : 'badge-warning'}">${s.status}</span></td>
                <td>${s.salesperson || '-'}</td>
                <td><span class="badge ${s.priority === '高' ? 'badge-danger' : 'badge-warning'}">${s.priority}</span></td>
                <td><div class="action-group"><button class="btn btn-outline btn-xs" onclick="event.stopPropagation();window._viewSales('${s.id}')">查看</button>${s.status === '待确认' || s.status === '待审核' ? `<button class="btn btn-outline btn-xs" onclick="event.stopPropagation();window._editSales('${s.id}')">编辑</button><button class="btn btn-success btn-xs" onclick="event.stopPropagation();window._approveSales('${s.id}')">审核</button><button class="btn btn-danger btn-xs" onclick="event.stopPropagation();window._deleteSales('${s.id}')">删除</button>` : ''}</div></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderQualityModule() {
  $('#mainContent').innerHTML = `
    <div class="module active">
      <div class="module-header">
        <h2>质量协同管理</h2>
        <button class="btn btn-primary">+ 新建检验</button>
      </div>
      <div class="info-panel">✅ 质量协同管理模块：包含来料检验IQC、制程检验IPQC、出货检验OQC、质量追溯、不良品管理、CAPA纠正预防、供应商质量分析等功能。</div>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>检验单号</th><th>检验类型</th><th>产品</th><th>批次</th><th>检验员</th><th>日期</th><th>结果</th><th>不良率</th><th>操作</th></tr></thead>
          <tbody>
            ${scmData.qualityInspections.map(q => `
              <tr>
                <td>${q.id}</td><td>${q.type}</td><td>${q.productName}</td><td>${q.batch}</td>
                <td>${q.inspector}</td><td>${q.date}</td>
                <td><span class="badge ${q.result === '合格' ? 'badge-success' : 'badge-danger'}">${q.result}</span></td>
                <td>${(q.defectRate * 100).toFixed(1)}%</td>
                <td><button class="btn btn-outline btn-xs">查看</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderFinanceModule() {
  $('#mainContent').innerHTML = `
    <div class="module active">
      <div class="module-header">
        <h2>财务协同</h2>
        <button class="btn btn-primary">+ 新建记录</button>
      </div>
      <div class="info-panel">💰 财务协同模块：包含采购对账、发票协同、应付管理、成本核算、物流费用分析、供应链成本分析等功能。</div>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>记录号</th><th>类型</th><th>关联单号</th><th>金额(元)</th><th>日期</th><th>状态</th><th>对方</th><th>操作</th></tr></thead>
          <tbody>
            ${scmData.financialRecords.map(f => `
              <tr>
                <td>${f.id}</td><td>${f.type}</td><td>${f.orderId}</td><td>${formatMoney(f.amount)}</td>
                <td>${f.date}</td>
                <td><span class="badge ${f.status === '已支付' || f.status === '已收款' ? 'badge-success' : 'badge-warning'}">${f.status}</span></td>
                <td>${f.supplierName || f.carrier || f.customer}</td>
                <td><button class="btn btn-outline btn-xs">查看</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAnalyticsModule() {
  $('#mainContent').innerHTML = `
    <div class="module active">
      <div class="module-header">
        <h2>数据分析与BI</h2>
        <button class="btn btn-primary">生成报表</button>
      </div>
      <div class="info-panel">📊 数据分析与BI模块：包含供应链驾驶舱、库存分析、缺料分析、采购分析、供应商分析、OTD交付分析、库存周转分析、风险预警分析等功能。</div>
      <div class="stats-grid cols-2">
        ${scmData.biReports.map(r => `
          <div class="stat-card">
            <div class="stat-icon ${r.status === '良好' ? 'green' : r.status === '需关注' ? 'orange' : 'red'}">📈</div>
            <div class="stat-info">
              <div class="stat-label">${r.name}</div>
              <div class="stat-value">${typeof r.value === 'number' ? (r.value * 100).toFixed(1) + '%' : r.value}</div>
              <div class="stat-desc">目标: ${typeof r.target === 'number' ? (r.target * 100).toFixed(1) + '%' : r.target} | 状态: ${r.status}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderMasterModule() {
  $('#mainContent').innerHTML = `
    <div class="module active">
      <div class="module-header">
        <h2>基础数据管理</h2>
        <button class="btn btn-primary">+ 新增数据</button>
      </div>
      <div class="info-panel">🗃️ 基础数据管理模块：包含物料主数据、BOM主数据、客户主数据、供应商主数据、仓库主数据、编码规则、数据权限管理等功能。</div>
      <div class="module-tabs">
        <div class="module-tab active" onclick="showMasterTab('product')">物料主数据</div>
        <div class="module-tab" onclick="showMasterTab('customer')">客户主数据</div>
        <div class="module-tab" onclick="showMasterTab('warehouse')">仓库主数据</div>
      </div>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>编号</th><th>名称</th><th>分类</th><th>规格</th><th>单位</th><th>参考单价(元)</th><th>计量单位</th><th>操作</th></tr></thead>
          <tbody>
            ${scmData.masterData.products.map(p => `
              <tr>
                <td>${p.id}</td><td>${p.name}</td><td>${p.category}</td>
                <td>${p.spec}</td><td>${p.unit}</td><td>${formatMoney(p.price)}</td><td>${p.uom}</td>
                <td><button class="btn btn-outline btn-xs">编辑</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderIntegrationModule() {
  $('#mainContent').innerHTML = `
    <div class="module active">
      <div class="module-header">
        <h2>系统集成平台</h2>
        <button class="btn btn-primary">同步数据</button>
      </div>
      <div class="info-panel">🔗 系统集成平台模块：包含ERP接口、MES接口、WMS接口、TMS接口、PLM接口、OA接口、API平台、EDI电子数据交换等功能。</div>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>集成ID</th><th>系统</th><th>类型</th><th>状态</th><th>最后同步</th><th>频率</th><th>操作</th></tr></thead>
          <tbody>
            ${scmData.integrations.map(i => `
              <tr>
                <td>${i.id}</td><td>${i.system}</td><td>${i.type}</td>
                <td><span class="badge ${i.status === '正常' ? 'badge-success' : 'badge-danger'}">${i.status}</span></td>
                <td>${i.lastSync}</td><td>${i.frequency}</td>
                <td><button class="btn btn-outline btn-xs">测试</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 14. 组织架构
function renderOrgModule() {
  console.log('[DEBUG] renderOrgModule called, currentSubModule:', currentSubModule);
  try {
    switch (currentSubModule) {
      case 'org-role': renderOrgRole(); break;
      case 'org-user': renderOrgUser(); break;
      default: renderOrgDept(); break;
    }
  } catch(e) {
    console.error('[ERROR] renderOrgModule:', e);
    showToast('组织架构模块渲染失败: ' + e.message, 'error');
  }
}

// 14a. 部门管理
function renderOrgDept() {
  console.log('[DEBUG] renderOrgDept called');
  var deptData = scmData.orgData.departments;
  var rows = '';
  deptData.forEach(function(d) {
    var parent = '';
    if (d.parentId) {
      var p = deptData.find(function(x) { return x.id === d.parentId; });
      parent = p ? p.name : '-';
    } else {
      parent = '顶级部门';
    }
    rows += '<tr><td>' + d.code + '</td><td>' + d.name + '</td><td>' + parent + '</td><td>' + d.manager + '</td><td>' + d.memberCount + '</td>' +
      '<td><button class="btn btn-outline btn-xs" onclick="editOrgDept(\'' + d.id + '\')">编辑</button> ' +
      '<button class="btn btn-outline btn-xs" onclick="deleteOrgDept(\'' + d.id + '\')">删除</button></td></tr>';
  });
  $('#mainContent').innerHTML =
    '<div class="module active"><div class="module-header"><h2>部门管理</h2><button class="btn btn-primary" onclick="addOrgDept()">新增部门</button></div>' +
    '<div class="table-wrapper"><table class="table"><thead><tr><th>编号</th><th>部门名称</th><th>上级部门</th><th>负责人</th><th>人数</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
}

function addOrgDept() {
  var deptData = scmData.orgData.departments;
  var parentOptions = '<option value="">无（顶级部门）</option>' + deptData.map(function(d) { return '<option value="' + d.id + '">' + d.name + '</option>'; }).join('');
  openModal('新增部门',
    '<div class="form-group"><label>部门名称 *</label><input class="input" id="deptName"></div>' +
    '<div class="form-group"><label>编号 *</label><input class="input" id="deptCode"></div>' +
    '<div class="form-group"><label>上级部门</label><select class="select" id="deptParent">' + parentOptions + '</select></div>' +
    '<div class="form-group"><label>负责人</label><input class="input" id="deptManager"></div>',
    '<button class="btn btn-primary" onclick="saveOrgDept()">保存</button> <button class="btn btn-outline" onclick="closeModal()">取消</button>'
  );
}

function saveOrgDept() {
  var deptData = scmData.orgData.departments;
  var name = $('#deptName').value.trim();
  var code = $('#deptCode').value.trim();
  if (!name || !code) { showToast('部门名称和编号不能为空', 'error'); return; }
  var maxOrder = 0;
  deptData.forEach(function(d) { if (d.order > maxOrder) maxOrder = d.order; });
  deptData.push({
    id: 'D' + String(deptData.length + 1001).substring(1),
    name: name, code: code,
    parentId: $('#deptParent').value || null,
    manager: $('#deptManager').value.trim(),
    memberCount: 0, order: maxOrder + 1
  });
  saveData(); closeModal(); renderOrgDept();
  showToast('部门已新增');
}

function editOrgDept(id) {
  var deptData = scmData.orgData.departments;
  var d = deptData.find(function(x) { return x.id === id; });
  if (!d) return;
  var parentOptions = '<option value="">无（顶级部门）</option>' + deptData.filter(function(x) { return x.id !== id; }).map(function(d) { return '<option value="' + d.id + '"' + (d.id === d.parentId ? ' selected' : '') + '>' + d.name + '</option>'; }).join('');
  openModal('编辑部门',
    '<div class="form-group"><label>部门名称 *</label><input class="input" id="deptName" value="' + d.name + '"></div>' +
    '<div class="form-group"><label>编号 *</label><input class="input" id="deptCode" value="' + d.code + '"></div>' +
    '<div class="form-group"><label>上级部门</label><select class="select" id="deptParent">' + parentOptions + '</select></div>' +
    '<div class="form-group"><label>负责人</label><input class="input" id="deptManager" value="' + (d.manager || '') + '"></div>',
    '<button class="btn btn-primary" onclick="updateOrgDept(\'' + id + '\')">保存</button> <button class="btn btn-outline" onclick="closeModal()">取消</button>'
  );
}

function updateOrgDept(id) {
  var deptData = scmData.orgData.departments;
  var d = deptData.find(function(x) { return x.id === id; });
  if (!d) return;
  var name = $('#deptName').value.trim();
  if (!name) { showToast('部门名称不能为空', 'error'); return; }
  d.name = name;
  d.code = $('#deptCode').value.trim();
  d.parentId = $('#deptParent').value || null;
  d.manager = $('#deptManager').value.trim();
  saveData(); closeModal(); renderOrgDept();
  showToast('部门已更新');
}

function deleteOrgDept(id) {
  var deptData = scmData.orgData.departments;
  var d = deptData.find(function(x) { return x.id === id; });
  if (!d) return;
  var childCount = deptData.filter(function(x) { return x.parentId === id; }).length;
  if (childCount > 0) { showToast('该部门下有子部门，请先删除子部门', 'error'); return; }
  var empCount = scmData.orgData.employees.filter(function(e) { return e.deptId === id; }).length;
  if (empCount > 0) { showToast('该部门下有' + empCount + '名员工，请先移除', 'error'); return; }
  scmData.orgData.departments = deptData.filter(function(x) { return x.id !== id; });
  saveData(); renderOrgDept();
  showToast('部门已删除');
}

// 14b. 角色权限
function renderOrgRole() {
  console.log('[DEBUG] renderOrgRole called');
  var roleData = scmData.orgData.roles;
  var rows = '';
  roleData.forEach(function(r) {
    rows += '<tr><td>' + r.code + '</td><td>' + r.name + '</td><td>' + r.permissions.join('、') + '</td>' +
      '<td><button class="btn btn-outline btn-xs" onclick="editOrgRole(\'' + r.id + '\')">编辑</button> ' +
      '<button class="btn btn-outline btn-xs" onclick="deleteOrgRole(\'' + r.id + '\')">删除</button></td></tr>';
  });
  $('#mainContent').innerHTML =
    '<div class="module active"><div class="module-header"><h2>角色权限</h2><button class="btn btn-primary" onclick="addOrgRole()">新增角色</button></div>' +
    '<div class="table-wrapper"><table class="table"><thead><tr><th>编号</th><th>角色名称</th><th>权限</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
}

function addOrgRole() {
  openModal('新增角色',
    '<div class="form-group"><label>角色名称 *</label><input class="input" id="roleName"></div>' +
    '<div class="form-group"><label>编号 *</label><input class="input" id="roleCode"></div>' +
    '<div class="form-group"><label>权限（逗号分隔）</label><input class="input" id="rolePerms" value="数据查看"></div>',
    '<button class="btn btn-primary" onclick="saveOrgRole()">保存</button> <button class="btn btn-outline" onclick="closeModal()">取消</button>'
  );
}

function saveOrgRole() {
  var roleData = scmData.orgData.roles;
  var name = $('#roleName').value.trim();
  var code = $('#roleCode').value.trim();
  if (!name || !code) { showToast('角色名称和编号不能为空', 'error'); return; }
  var perms = $('#rolePerms').value.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
  if (perms.length === 0) perms = ['数据查看'];
  roleData.push({
    id: 'R' + String(roleData.length + 1001).substring(1),
    name: name, code: code, permissions: perms
  });
  saveData(); closeModal(); renderOrgRole();
  showToast('角色已新增');
}

function editOrgRole(id) {
  var roleData = scmData.orgData.roles;
  var r = roleData.find(function(x) { return x.id === id; });
  if (!r) return;
  openModal('编辑角色',
    '<div class="form-group"><label>角色名称 *</label><input class="input" id="roleName" value="' + r.name + '"></div>' +
    '<div class="form-group"><label>编号 *</label><input class="input" id="roleCode" value="' + r.code + '"></div>' +
    '<div class="form-group"><label>权限（逗号分隔）</label><input class="input" id="rolePerms" value="' + r.permissions.join(', ') + '"></div>',
    '<button class="btn btn-primary" onclick="updateOrgRole(\'' + id + '\')">保存</button> <button class="btn btn-outline" onclick="closeModal()">取消</button>'
  );
}

function updateOrgRole(id) {
  var roleData = scmData.orgData.roles;
  var r = roleData.find(function(x) { return x.id === id; });
  if (!r) return;
  var name = $('#roleName').value.trim();
  if (!name) { showToast('角色名称不能为空', 'error'); return; }
  r.name = name;
  r.code = $('#roleCode').value.trim();
  r.permissions = $('#rolePerms').value.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
  if (r.permissions.length === 0) r.permissions = ['数据查看'];
  saveData(); closeModal(); renderOrgRole();
  showToast('角色已更新');
}

function deleteOrgRole(id) {
  var roleData = scmData.orgData.roles;
  var r = roleData.find(function(x) { return x.id === id; });
  if (!r) return;
  var userCount = scmData.orgData.employees.filter(function(e) { return e.roleId === id; }).length;
  if (userCount > 0) { showToast('该角色下有' + userCount + '名用户，请先移除', 'error'); return; }
  scmData.orgData.roles = roleData.filter(function(x) { return x.id !== id; });
  saveData(); renderOrgRole();
  showToast('角色已删除');
}

// 14c. 人员管理
function renderOrgUser() {
  console.log('[DEBUG] renderOrgUser called');
  var empData = scmData.orgData.employees;
  var deptData = scmData.orgData.departments;
  var roleData = scmData.orgData.roles;
  var rows = '';
  empData.forEach(function(e) {
    var dept = deptData.find(function(d) { return d.id === e.deptId; });
    var role = roleData.find(function(r) { return r.id === e.roleId; });
    rows += '<tr><td>' + e.code + '</td><td>' + e.name + '</td><td>' + (dept ? dept.name : '-') + '</td><td>' + (role ? role.name : '-') + '</td><td>' + (e.username || e.code || '-') + '</td><td>' + e.phone + '</td><td>' + e.status + '</td>' +
      '<td><button class="btn btn-outline btn-xs" onclick="editOrgUser(\'' + e.id + '\')">编辑</button> ' +
      '<button class="btn btn-outline btn-xs" onclick="deleteOrgUser(\'' + e.id + '\')">删除</button></td></tr>';
  });
  $('#mainContent').innerHTML =
    '<div class="module active"><div class="module-header"><h2>人员管理</h2><button class="btn btn-primary" onclick="addOrgUser()">新增人员</button></div>' +
    '<div class="table-wrapper"><table class="table"><thead><tr><th>工号</th><th>姓名</th><th>所属部门</th><th>角色</th><th>登录账号</th><th>电话</th><th>状态</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
}

function addOrgUser() {
  var deptData = scmData.orgData.departments;
  var roleData = scmData.orgData.roles;
  openModal('新增人员',
    '<div class="form-group"><label>姓名 *</label><input class="input" id="empName"></div>' +
    '<div class="form-group"><label>工号 *</label><input class="input" id="empCode"></div>' +
    '<div class="form-group"><label>所属部门 *</label><select class="select" id="empDept">' + deptData.map(function(d) { return '<option value="' + d.id + '">' + d.name + '</option>'; }).join('') + '</select></div>' +
    '<div class="form-group"><label>角色 *</label><select class="select" id="empRole">' + roleData.map(function(r) { return '<option value="' + r.id + '">' + r.name + '</option>'; }).join('') + '</select></div>' +
    '<div class="form-info">登录账号自动使用工号</div>' +
    '<div class="form-group"><label>登录密码 *</label><input class="input" id="empPassword" type="password" value="123456" placeholder="默认密码123456"></div>' +
    '<div class="form-group"><label>电话</label><input class="input" id="empPhone"></div>' +
    '<div class="form-group"><label>邮箱</label><input class="input" id="empEmail"></div>',
    '<button class="btn btn-primary" onclick="saveOrgUser()">保存</button> <button class="btn btn-outline" onclick="closeModal()">取消</button>'
  );
}

async function saveOrgUser() {
  var empData = scmData.orgData.employees;
  var name = $('#empName').value.trim();
  var code = $('#empCode').value.trim();
  var deptId = $('#empDept').value;
  var roleId = $('#empRole').value;
  var password = $('#empPassword').value;
  if (!name || !code || !deptId || !roleId || !password) { showToast('姓名、工号、部门、角色、密码均为必填', 'error'); return; }
  var username = code;
  var role = scmData.orgData.roles.find(function(r) { return r.id === roleId; });
  var newEmp = {
    id: 'E' + String(empData.length + 1001).substring(1),
    name: name, code: code, deptId: deptId, roleId: roleId,
    phone: $('#empPhone').value.trim(), email: $('#empEmail').value.trim(),
    status: '在职', joinDate: new Date().toISOString().split('T')[0],
    username: username
  };
  empData.push(newEmp);
  // Update department member count
  var dept = scmData.orgData.departments.find(function(d) { return d.id === deptId; });
  if (dept) dept.memberCount++;
  // 同步创建后端用户账号
  await syncUserAccount(username, password, name, role ? role.code : 'user', deptId, code, $('#empPhone').value.trim(), $('#empEmail').value.trim(), true);
  saveData(); closeModal(); renderOrgUser();
  showToast('人员已新增，登录账号已创建');
}

function editOrgUser(id) {
  var empData = scmData.orgData.employees;
  var e = empData.find(function(x) { return x.id === id; });
  if (!e) return;
  var deptData = scmData.orgData.departments;
  var roleData = scmData.orgData.roles;
  openModal('编辑人员',
    '<div class="form-group"><label>姓名 *</label><input class="input" id="empName" value="' + e.name + '"></div>' +
    '<div class="form-group"><label>工号 *</label><input class="input" id="empCode" value="' + e.code + '"></div>' +
    '<div class="form-group"><label>所属部门 *</label><select class="select" id="empDept">' + deptData.map(function(d) { return '<option value="' + d.id + '"' + (d.id === e.deptId ? ' selected' : '') + '>' + d.name + '</option>'; }).join('') + '</select></div>' +
    '<div class="form-group"><label>角色 *</label><select class="select" id="empRole">' + roleData.map(function(r) { return '<option value="' + r.id + '"' + (r.id === e.roleId ? ' selected' : '') + '>' + r.name + '</option>'; }).join('') + '</select></div>' +
    '<div class="form-group"><label>登录账号（工号）</label><input class="input" id="empUsername" value="' + e.code + '" readonly style="background:#f5f5f5"></div>' +
    '<div class="form-group"><label>新密码（留空不修改）</label><input class="input" id="empPassword" type="password" placeholder="留空则不修改密码"></div>' +
    '<div class="form-group"><label>电话</label><input class="input" id="empPhone" value="' + (e.phone || '') + '"></div>' +
    '<div class="form-group"><label>邮箱</label><input class="input" id="empEmail" value="' + (e.email || '') + '"></div>',
    '<button class="btn btn-primary" onclick="updateOrgUser(\'' + id + '\')">保存</button> <button class="btn btn-outline" onclick="closeModal()">取消</button>'
  );
}

async function updateOrgUser(id) {
  var empData = scmData.orgData.employees;
  var e = empData.find(function(x) { return x.id === id; });
  if (!e) return;
  var newDeptId = $('#empDept').value;
  var oldDeptId = e.deptId;
  var oldRoleId = e.roleId;
  var newRoleId = $('#empRole').value;
  var oldCode = e.code;
  e.name = $('#empName').value.trim();
  e.code = $('#empCode').value.trim();
  e.deptId = newDeptId;
  e.roleId = newRoleId;
  e.phone = $('#empPhone').value.trim();
  e.email = $('#empEmail').value.trim();
  var newPassword = $('#empPassword').value;
  if (oldDeptId !== newDeptId) {
    var oldDept = scmData.orgData.departments.find(function(d) { return d.id === oldDeptId; });
    if (oldDept && oldDept.memberCount > 0) oldDept.memberCount--;
    var newDept = scmData.orgData.departments.find(function(d) { return d.id === newDeptId; });
    if (newDept) newDept.memberCount++;
  }
  // 同步更新后端用户账号（登录账号以工号为准）
  var role = scmData.orgData.roles.find(function(r) { return r.id === newRoleId; });
  if (oldCode !== e.code) {
    await deleteUserAccount(oldCode);
    await syncUserAccount(e.code, newPassword, e.name, role ? role.code : 'user', newDeptId, e.code, e.phone, e.email, true);
  } else {
    await syncUserAccount(e.code, newPassword, e.name, role ? role.code : 'user', newDeptId, e.code, e.phone, e.email, false);
  }
  saveData(); closeModal(); renderOrgUser();
  showToast('人员已更新');
}

function deleteOrgUser(id) {
  var empData = scmData.orgData.employees;
  var e = empData.find(function(x) { return x.id === id; });
  if (!e) return;
  var dept = scmData.orgData.departments.find(function(d) { return d.id === e.deptId; });
  if (dept && dept.memberCount > 0) dept.memberCount--;
  scmData.orgData.employees = empData.filter(function(x) { return x.id !== id; });
  // 同步删除后端用户账号
  var username = e.username || e.code;
  deleteUserAccount(username);
  saveData(); renderOrgUser();
  showToast('人员已删除，登录账号已注销');
}

// ---------- 业务函数 ----------
function openSupplierForm() {
  openModal('新增供应商', `
    <div class="form-group"><label>供应商名称 *</label><input class="input" id="supName"></div>
    <div class="form-group"><label>分类 *</label>
      <select class="select" id="supCategory">
        <option value="">请选择</option>
        <option value="电子元器件">电子元器件</option>
        <option value="机械部件">机械部件</option>
        <option value="包装材料">包装材料</option>
        <option value="化工原料">化工原料</option>
        <option value="物流服务">物流服务</option>
        <option value="设备供应">设备供应</option>
        <option value="原材料">原材料</option>
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label>联系人 *</label><input class="input" id="supContact"></div>
      <div class="form-group"><label>电话 *</label><input class="input" id="supPhone"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>类型</label>
        <select class="select" id="supType">
          <option value="战略供应商">战略供应商</option>
          <option value="核心供应商">核心供应商</option>
          <option value="一般供应商">一般供应商</option>
        </select>
      </div>
      <div class="form-group"><label>初始评级</label>
        <select class="select" id="supRating">
          <option value="5">★★★★★</option>
          <option value="4">★★★★☆</option>
          <option value="3">★★★☆☆</option>
          <option value="2">★★☆☆☆</option>
          <option value="1">★☆☆☆☆</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label>状态</label>
      <select class="select" id="supStatus">
        <option value="合作中">合作中</option>
        <option value="暂停合作">暂停合作</option>
        <option value="潜在供应商">潜在供应商</option>
      </select>
    </div>
  `, `
    <button class="btn btn-outline" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="saveSupplier()">保存</button>
  `);
}

function saveSupplier() {
  const name = $('#supName').value.trim();
  const category = $('#supCategory').value;
  const contact = $('#supContact').value.trim();
  const phone = $('#supPhone').value.trim();
  if (!name || !category || !contact || !phone) {
    showToast('请填写所有必填字段', 'warning'); return;
  }
  
  const newId = `SUP${String(scmData.counters.supplier).padStart(3,'0')}`;
  scmData.counters.supplier++;
  
  scmData.suppliers.push({
    id: newId, name, category, contact, phone,
    type: $('#supType').value,
    rating: parseInt($('#supRating').value),
    status: $('#supStatus').value,
    score: (rating==='A'?95:rating==='B'?85:rating==='C'?70:80)
  });
  
  saveData();
  closeModal();
  renderSupplierModule();
  showToast('供应商已添加', 'success');
}

function editSupplier(id) {
  const supplier = scmData.suppliers.find(s => s.id === id);
  if (!supplier) return;
  
  openModal('编辑供应商', `
    <div class="form-group"><label>供应商编号</label><input class="input" value="${supplier.id}" disabled></div>
    <div class="form-group"><label>供应商名称 *</label><input class="input" id="supName" value="${supplier.name}"></div>
    <div class="form-group"><label>分类 *</label>
      <select class="select" id="supCategory">
        <option value="">请选择</option>
        <option value="电子元器件" ${supplier.category === '电子元器件' ? 'selected' : ''}>电子元器件</option>
        <option value="机械部件" ${supplier.category === '机械部件' ? 'selected' : ''}>机械部件</option>
        <option value="包装材料" ${supplier.category === '包装材料' ? 'selected' : ''}>包装材料</option>
        <option value="化工原料" ${supplier.category === '化工原料' ? 'selected' : ''}>化工原料</option>
        <option value="物流服务" ${supplier.category === '物流服务' ? 'selected' : ''}>物流服务</option>
        <option value="设备供应" ${supplier.category === '设备供应' ? 'selected' : ''}>设备供应</option>
        <option value="原材料" ${supplier.category === '原材料' ? 'selected' : ''}>原材料</option>
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label>联系人 *</label><input class="input" id="supContact" value="${supplier.contact}"></div>
      <div class="form-group"><label>电话 *</label><input class="input" id="supPhone" value="${supplier.phone}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>类型</label>
        <select class="select" id="supType">
          <option value="战略供应商" ${supplier.type === '战略供应商' ? 'selected' : ''}>战略供应商</option>
          <option value="核心供应商" ${supplier.type === '核心供应商' ? 'selected' : ''}>核心供应商</option>
          <option value="一般供应商" ${supplier.type === '一般供应商' ? 'selected' : ''}>一般供应商</option>
        </select>
      </div>
      <div class="form-group"><label>评级</label>
        <select class="select" id="supRating">
          <option value="5" ${supplier.rating === 5 ? 'selected' : ''}>★★★★★</option>
          <option value="4" ${supplier.rating === 4 ? 'selected' : ''}>★★★★☆</option>
          <option value="3" ${supplier.rating === 3 ? 'selected' : ''}>★★★☆☆</option>
          <option value="2" ${supplier.rating === 2 ? 'selected' : ''}>★★☆☆☆</option>
          <option value="1" ${supplier.rating === 1 ? 'selected' : ''}>★☆☆☆☆</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label>状态</label>
      <select class="select" id="supStatus">
        <option value="合作中" ${supplier.status === '合作中' ? 'selected' : ''}>合作中</option>
        <option value="暂停合作" ${supplier.status === '暂停合作' ? 'selected' : ''}>暂停合作</option>
        <option value="潜在供应商" ${supplier.status === '潜在供应商' ? 'selected' : ''}>潜在供应商</option>
      </select>
    </div>
  `, `
    <button class="btn btn-outline" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="updateSupplier('${id}')">更新</button>
  `);
}

function updateSupplier(id) {
  const idx = scmData.suppliers.findIndex(s => s.id === id);
  if (idx < 0) return;
  
  scmData.suppliers[idx] = {
    ...scmData.suppliers[idx],
    name: $('#supName').value.trim(),
    category: $('#supCategory').value,
    contact: $('#supContact').value.trim(),
    phone: $('#supPhone').value.trim(),
    type: $('#supType').value,
    rating: parseInt($('#supRating').value),
    status: $('#supStatus').value
  };
  
  saveData();
  closeModal();
  renderSupplierModule();
  showToast('供应商已更新', 'success');
}

function deleteSupplier(id) {
  const supplier = scmData.suppliers.find(s => s.id === id);
  if (!supplier) return;
  
  openModal('确认删除', `
    <p>确定要删除供应商「${supplier.name}」吗？</p>
    <p class="text-muted" style="font-size:12px;margin-top:8px;">此操作将同时删除相关的采购订单记录。</p>
  `, `
    <button class="btn btn-outline" onclick="closeModal()">取消</button>
    <button class="btn btn-danger" onclick="confirmDeleteSupplier('${id}')">确认删除</button>
  `);
}

function confirmDeleteSupplier(id) {
  scmData.suppliers = scmData.suppliers.filter(s => s.id !== id);
  scmData.purchaseOrders = scmData.purchaseOrders.filter(o => o.supplierId !== id);
  saveData();
  closeModal();
  renderSupplierModule();
  showToast('供应商已删除', 'success');
}

function openPurchaseForm() {
  const supplierOptions = scmData.suppliers.filter(s => s.status === '合作中')
    .map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  const productOptions = scmData.masterData.products
    .map(p => `<option value="${p.id}" data-price="${p.price}" data-name="${p.name}">${p.name} (${p.category})</option>`).join('');
  
  openModal('新建采购订单', `
    <div class="form-group"><label>供应商 *</label>
      <select class="select" id="purchaseSupplier">${supplierOptions}</select>
    </div>
    <div class="form-group"><label>产品 *</label>
      <select class="select" id="purchaseProduct">${productOptions}</select>
    </div>
    <div class="form-row">
      <div class="form-group"><label>数量 *</label><input class="input" type="number" id="purchaseQty" value="1" min="1"></div>
      <div class="form-group"><label>采购类型</label>
        <select class="select" id="purchaseType">
          <option value="标准采购">标准采购</option>
          <option value="紧急采购">紧急采购</option>
          <option value="招标采购">招标采购</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label>下单日期</label><input class="input" type="date" id="purchaseDate" value="${formatDate(Date.now())}"></div>
    <div class="form-group"><label>预计金额(元)</label><input class="input" id="purchaseAmount" readonly></div>
  `, `
    <button class="btn btn-outline" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="savePurchase()">保存</button>
  `);
  
  // 计算金额
  const calcAmount = () => {
    const qty = parseInt($('#purchaseQty').value) || 0;
    const sel = $('#purchaseProduct').selectedOptions[0];
    const price = sel ? parseFloat(sel.dataset.price) : 0;
    $('#purchaseAmount').value = formatMoney(qty * price);
  };
  $('#purchaseQty').addEventListener('input', calcAmount);
  $('#purchaseProduct').addEventListener('change', calcAmount);
  calcAmount();
}

function savePurchase() {
  const supplierId = $('#purchaseSupplier').value;
  const productId = $('#purchaseProduct').value;
  const qty = parseInt($('#purchaseQty').value);
  const date = $('#purchaseDate').value;
  
  if (!supplierId || !productId || !qty || qty <= 0 || !date) {
    showToast('请填写所有必填字段', 'warning'); return;
  }
  
  const supplier = scmData.suppliers.find(s => s.id === supplierId);
  const product = scmData.masterData.products.find(p => p.id === productId);
  const amount = qty * product.price;
  
  const newId = `PO${date.replace(/-/g,'')}${String(scmData.counters.purchaseOrder).padStart(4,'0')}`;
  scmData.counters.purchaseOrder++;
  
  scmData.purchaseOrders.push({
    id: newId,
    productId: productId, supplierId: supplierId,
    productName: product.name, supplierName: supplier.name,
    qty, amount, date, status: '待审批',
    type: $('#purchaseType').value
  });
  
  saveData();
  closeModal();
  renderPurchaseModule();
  showToast('采购订单已创建', 'success');
}

function approvePurchase(id) {
  const order = scmData.purchaseOrders.find(o => o.id === id);
  if (!order || order.status !== '待审批') return;
  
  order.status = '已审批';
  saveData();
  renderPurchaseModule();
  showToast(`订单 ${id} 已审批通过`, 'success');
}

function viewPurchase(id) {
  const order = scmData.purchaseOrders.find(o => o.id === id);
  if (!order) return;
  
  openModal('查看采购订单', `
    <div class="form-group"><label>订单号</label><input class="input" value="${order.id}" disabled></div>
    <div class="form-row">
      <div class="form-group"><label>供应商</label><input class="input" value="${order.supplierName}" disabled></div>
      <div class="form-group"><label>产品</label><input class="input" value="${order.productName}" disabled></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>数量</label><input class="input" value="${order.qty.toLocaleString()}" disabled></div>
      <div class="form-group"><label>金额</label><input class="input" value="${formatMoney(order.amount)}" disabled></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>下单日期</label><input class="input" value="${order.date}" disabled></div>
      <div class="form-group"><label>状态</label><input class="input" value="${order.status}" disabled></div>
    </div>
    <div class="form-group"><label>采购类型</label><input class="input" value="${order.type}" disabled></div>
  `, `
    <button class="btn btn-outline" onclick="closeModal()">关闭</button>
  `);
}

function deletePurchase(id) {
  const order = scmData.purchaseOrders.find(o => o.id === id);
  if (!order) return;
  
  openModal('确认删除', `
    <p>确定要删除采购订单「${order.id}」吗？</p>
    <p class="text-muted" style="font-size:12px;margin-top:8px;">此操作不可恢复。</p>
  `, `
    <button class="btn btn-outline" onclick="closeModal()">取消</button>
    <button class="btn btn-danger" onclick="confirmDeletePurchase('${id}')">确认删除</button>
  `);
}

function confirmDeletePurchase(id) {
  scmData.purchaseOrders = scmData.purchaseOrders.filter(o => o.id !== id);
  saveData();
  closeModal();
  renderPurchaseModule();
  showToast('采购订单已删除', 'success');
}

// ---------- 过滤函数 ----------
function filterSupplierTable() {
  const search = ($('#supplierSearch')?.value || '').toLowerCase();
  const category = $('#supplierCategoryFilter')?.value;
  const status = $('#supplierStatusFilter')?.value;
  
  let data = [...scmData.suppliers];
  if (search) data = data.filter(s => 
    s.name.toLowerCase().includes(search) || 
    s.contact.toLowerCase().includes(search)
  );
  if (category) data = data.filter(s => s.category === category);
  if (status) data = data.filter(s => s.status === status);
  
  renderSupplierTable(data);
}

function filterPurchaseTable() {
  const search = ($('#purchaseSearch')?.value || '').toLowerCase();
  const status = $('#purchaseStatusFilter')?.value;
  const type = $('#purchaseTypeFilter')?.value;
  
  let data = [...scmData.purchaseOrders];
  if (search) data = data.filter(o => 
    o.id.toLowerCase().includes(search) || 
    o.supplierName.toLowerCase().includes(search)
  );
  if (status) data = data.filter(o => o.status === status);
  if (type) data = data.filter(o => o.type === type);
  
  renderPurchaseTable(data);
}

function filterDemandTable() {
  const search = ($('#demandSearch')?.value || '').toLowerCase();
  const status = $('#demandStatusFilter')?.value;
  
  let data = [...scmData.demandPlans];
  if (search) data = data.filter(d => 
    d.name.toLowerCase().includes(search) || 
    d.product.toLowerCase().includes(search)
  );
  if (status) data = data.filter(d => d.status === status);
  
  renderDemandTable(data);
}

// ---------- 库存管理按钮（基础桩函数，app-modules.js 会增强覆盖） ----------
function _openStockIO(type) {
  // 如果 app-modules.js 已加载增强版，则直接调用增强版函数
  if (typeof window._openStockIO === 'function' && window._openStockIO.toString().indexOf('[DEBUG app-modules]') !== -1) {
    window._openStockIO(type);
    return;
  }
  showToast('库存' + (type === 'in' ? '入库' : '出库') + '模块加载中，请刷新页面后重试', 'info');
}

function _openTransfer() {
  if (typeof window._openTransfer === 'function' && window._openTransfer.toString().indexOf('[DEBUG app-modules]') !== -1) {
    window._openTransfer();
    return;
  }
  showToast('调拨模块加载中，请刷新页面后重试', 'info');
}

// ---------- 初始化 ----------
async function initApp() {
  renderSidebar();
  await loadDataFromAPI();
  // 去掉自动回写，避免刷新页面污染 MySQL 数据
  // saveData(); // 加载真实数据后回写，确保数据结构同步
  // 延迟执行，确保所有脚本加载完成
  setTimeout(function() {
    switchModule('dashboard');
  }, 0);
}

async function init() {
  bindLoginEnter();
  var loginOk = await checkLogin();
  if (loginOk) {
    await initApp();
  } else {
    document.getElementById('loginOverlay').classList.remove('hidden');
  }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// 暴露函数给全局作用域（仅当未被 app-modules.js 增强版覆盖时才赋值）
// app-modules.js 的增强版包含 _getEnhancedRenderer 特征，检测到则保留增强版
if (typeof window.switchModule !== 'function' || window.switchModule.toString().indexOf('_getEnhancedRenderer') === -1) {
  window.switchModule = switchModule;
}
if (typeof window.switchSubModule !== 'function' || window.switchSubModule.toString().indexOf('_getEnhancedRenderer') === -1) {
  window.switchSubModule = switchSubModule;
}
window.toggleNavGroup = toggleNavGroup;
window._openStockIO = _openStockIO;
window._openTransfer = _openTransfer;
window.openSupplierForm = openSupplierForm;
window.saveSupplier = saveSupplier;
window.editSupplier = editSupplier;
window.updateSupplier = updateSupplier;
window.deleteSupplier = deleteSupplier;

// ---------- 销售订单操作（兜底实现，会被 app-modules.js 覆盖） ----------
window._openSalesForm = window._openSalesForm || function(editId) {
  var item = editId ? scmData.salesOrders.find(function(o) { return o.id === editId; }) : null;
  var custOpts = (scmData.masterData.customers || []).map(function(c) { return '<option value="' + c.id + '"' + (item && item.customerId === c.id ? ' selected' : '') + '>' + c.name + '</option>'; }).join('');
  var prodOpts = (scmData.masterData.products || []).map(function(p) { return '<option value="' + p.id + '"' + (item && item.productId === p.id ? ' selected' : '') + '>' + p.name + '</option>'; }).join('');
  var spOpts = '<option value="">请选择业务员</option>' + (scmData.orgData.employees || []).map(function(e) { return '<option value="' + e.name + '"' + (item && item.salesperson === e.name ? ' selected' : '') + '>' + e.name + '</option>'; }).join('');
  openModal(item ? '编辑订单' : '新建订单',
    '<div class="form-row"><div class="form-group"><label>客户 *</label><select class="select" id="soCustomer">' + custOpts + '</select></div><div class="form-group"><label>产品 *</label><select class="select" id="soProduct">' + prodOpts + '</select></div></div>' +
    '<div class="form-row"><div class="form-group"><label>数量 *</label><input class="input" type="number" id="soQty" value="' + (item ? item.qty : 100) + '" min="1"></div><div class="form-group"><label>金额(元) *</label><input class="input" type="number" id="soAmount" value="' + (item ? item.amount : 5000) + '"></div></div>' +
    '<div class="form-row"><div class="form-group"><label>业务员 *</label><select class="select" id="soSalesperson">' + spOpts + '</select></div></div>' +
    '<div class="form-row"><div class="form-group"><label>下单日期</label><input class="input" type="date" id="soDate" value="' + (item ? item.orderDate : formatDate(Date.now())) + '"></div><div class="form-group"><label>交期</label><input class="input" type="date" id="soDelivery" value="' + (item ? item.deliveryDate : formatDate(Date.now() + 7 * 86400000)) + '"></div></div>' +
    '<div class="form-row"><div class="form-group"><label>优先级</label><select class="select" id="soPriority"><option>高</option><option>中</option><option>低</option></select></div><div class="form-group"><label>状态</label><select class="select" id="soStatus"><option>待审核</option><option>生产中</option><option>已发货</option></select></div></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="window._saveSales(\'' + (editId || '') + '\')">保存</button>');
};
window._saveSales = window._saveSales || function(editId) {
  var cust = $('#soCustomer').value; var prod = $('#soProduct').value;
  var qty = parseInt($('#soQty').value); var amount = parseFloat($('#soAmount').value);
  var sp = $('#soSalesperson').value;
  if (!cust || !prod || !qty || !amount || !sp) { showToast('请填写必填字段', 'warning'); return; }
  var custObj = (scmData.masterData.customers || []).find(function(c) { return c.id === cust; });
  var prodObj = (scmData.masterData.products || []).find(function(p) { return p.id === prod; });
  if (editId) {
    var idx = scmData.salesOrders.findIndex(function(o) { return o.id === editId; });
    if (idx >= 0) { scmData.salesOrders[idx] = { id: editId, customer: custObj ? custObj.name : '', productName: prodObj ? prodObj.name : '', qty: qty, amount: amount, orderDate: $('#soDate').value, deliveryDate: $('#soDelivery').value, priority: $('#soPriority').value, status: $('#soStatus').value, salesperson: sp }; }
  } else {
    scmData.counters.salesOrder = scmData.counters.salesOrder || 5; var nid = 'SO' + String(scmData.counters.salesOrder).padStart(3, '0'); scmData.counters.salesOrder++;
    scmData.salesOrders.push({ id: nid, customer: custObj ? custObj.name : '', productName: prodObj ? prodObj.name : '', qty: qty, amount: amount, orderDate: $('#soDate').value, deliveryDate: $('#soDelivery').value, priority: $('#soPriority').value, status: $('#soStatus').value, salesperson: sp });
  }
  saveData(); closeModal(); if (currentModule === 'sales') renderSalesModule();
};
window._editSales = window._editSales || function(id) { window._openSalesForm(id); };
window._viewSales = window._viewSales || function(id) {
  var s = scmData.salesOrders.find(function(x) { return x.id === id; }); if (!s) return;
  openModal('订单详情 - ' + s.id,
    '<div class="form-row"><div class="form-group"><label>订单号</label><input class="input" value="' + s.id + '" disabled></div><div class="form-group"><label>状态</label><input class="input" value="' + s.status + '" disabled></div></div>' +
    '<div class="form-row"><div class="form-group"><label>客户</label><input class="input" value="' + s.customer + '" disabled></div><div class="form-group"><label>产品</label><input class="input" value="' + s.productName + '" disabled></div></div>' +
    '<div class="form-row"><div class="form-group"><label>数量</label><input class="input" value="' + s.qty + '" disabled></div><div class="form-group"><label>金额(元)</label><input class="input" value="' + formatMoney(s.amount) + '" disabled></div></div>' +
    '<div class="form-row"><div class="form-group"><label>业务员</label><input class="input" value="' + (s.salesperson || '-') + '" disabled></div></div>' +
    '<div class="form-row"><div class="form-group"><label>下单日期</label><input class="input" value="' + s.orderDate + '" disabled></div><div class="form-group"><label>交期</label><input class="input" value="' + s.deliveryDate + '" disabled></div></div>' +
    '<div class="form-row"><div class="form-group"><label>优先级</label><input class="input" value="' + s.priority + '" disabled></div></div>',
    '<button class="btn btn-outline" onclick="closeModal()">关闭</button>' + ((s.status==='待确认'||s.status==='待审核') ? '<button class="btn btn-outline" onclick="closeModal();window._editSales(\'' + id + '\')">编辑</button>' : '') );
};
window._approveSales = window._approveSales || function(id) {
  var order = scmData.salesOrders.find(function(o){return o.id===id;});
  if(!order || (order.status!=='待确认'&&order.status!=='待审核')){ showToast('仅可审核待确认/待审核状态的订单','warning'); return; }
  order.status='已确认';
  saveData();
  if(currentModule==='sales') renderSalesModule();
  showToast('订单 '+id+' 已审核通过','success');
};
window._deleteSales = window._deleteSales || function(id) {
  var order = scmData.salesOrders.find(function(o){return o.id===id;});
  if(!order || order.status !== '待确认' && order.status !== '待审核'){ showToast('仅可删除待确认/待审核状态的订单','warning'); return; }
  var s = scmData.salesOrders.find(function(x) { return x.id === id; }); if (!s) return;
  openModal('确认删除', '<p>确定删除订单「' + s.id + '」吗？</p>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="scmData.salesOrders = scmData.salesOrders.filter(function(o) { return o.id !== \'' + id + '\'; }); saveData(); closeModal(); if (currentModule === \'sales\') renderSalesModule(); showToast(\'已删除\', \'success\');">确认</button>');
};
// ---------- 销售计划操作（兜底实现，会被 app-modules.js 覆盖） ----------
window._openSalesPlanForm = window._openSalesPlanForm || function(editId) {
  var item = editId ? scmData.salesPlans.find(function(p) { return p.id === editId; }) : null;
  var custOpts = (scmData.masterData.customers || []).map(function(c) { return '<option value="' + c.id + '"' + (item && item.customerId === c.id ? ' selected' : '') + '>' + c.name + '</option>'; }).join('');
  var prodOpts = (scmData.masterData.products || []).map(function(p) { return '<option value="' + p.id + '"' + (item && item.productId === p.id ? ' selected' : '') + '>' + p.name + '</option>'; }).join('');
  var typeOpts = '<option value="scheduled" ' + (item && item.type === 'scheduled' ? 'selected' : '') + '>定时计划</option><option value="temporary" ' + (item && item.type === 'temporary' ? 'selected' : '') + '>临时计划</option>';
  openModal(item ? '编辑销售计划' : '新建销售计划',
    '<div class="form-row"><div class="form-group"><label>类型 *</label><select class="select" id="spType">' + typeOpts + '</select></div><div class="form-group"><label>客户 *</label><select class="select" id="spCustomer">' + custOpts + '</select></div></div>' +
    '<div class="form-row"><div class="form-group"><label>产品 *</label><select class="select" id="spProduct">' + prodOpts + '</select></div><div class="form-group"><label>月份</label><input class="input" type="month" id="spMonth" value="' + (item ? item.month : formatDate(Date.now()).substring(0,7)) + '"></div></div>' +
    '<div class="form-row"><div class="form-group"><label>计划量 *</label><input class="input" type="number" id="spPlanQty" value="' + (item ? item.planQty : 1000) + '" min="1"></div><div class="form-group"><label>实际量</label><input class="input" type="number" id="spActualQty" value="' + (item ? item.actualQty : 0) + '" min="0"></div></div>' +
    '<div class="form-row"><div class="form-group"><label>负责人</label><input class="input" id="spOwner" value="' + (item ? item.owner : '') + '"></div><div class="form-group"><label>状态</label><select class="select" id="spStatus"><option value="进行中">进行中</option><option value="已完成">已完成</option><option value="已取消">已取消</option></select></div></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="window._saveSalesPlan(\'' + (editId || '') + '\')">保存</button>');
};
window._saveSalesPlan = window._saveSalesPlan || function(editId) {
  var type = $('#spType').value; var cust = $('#spCustomer').value; var prod = $('#spProduct').value;
  var planQty = parseInt($('#spPlanQty').value); var actualQty = parseInt($('#spActualQty').value) || 0;
  if (!type || !cust || !prod || !planQty) { showToast('请填写必填字段', 'warning'); return; }
  var custObj = (scmData.masterData.customers || []).find(function(c) { return c.id === cust; });
  var prodObj = (scmData.masterData.products || []).find(function(p) { return p.id === prod; });
  if (editId) {
    var idx = scmData.salesPlans.findIndex(function(p) { return p.id === editId; });
    if (idx >= 0) { scmData.salesPlans[idx] = { id: editId, type: type, customerId: cust, customerName: custObj ? custObj.name : '', productId: prod, productName: prodObj ? prodObj.name : '', planQty: planQty, actualQty: actualQty, month: $('#spMonth').value, owner: $('#spOwner').value, status: $('#spStatus').value }; }
  } else {
    scmData.counters.salesPlan = scmData.counters.salesPlan || 6; var nid = 'SP' + String(scmData.counters.salesPlan).padStart(3, '0'); scmData.counters.salesPlan++;
    scmData.salesPlans.push({ id: nid, type: type, customerId: cust, customerName: custObj ? custObj.name : '', productId: prod, productName: prodObj ? prodObj.name : '', planQty: planQty, actualQty: actualQty, month: $('#spMonth').value, owner: $('#spOwner').value, status: $('#spStatus').value });
  }
  saveData(); closeModal(); if (currentModule === 'salesplan') renderSalesPlanModule();
};
window._editSalesPlan = window._editSalesPlan || function(id) { window._openSalesPlanForm(id); };
window._viewSalesPlan = window._viewSalesPlan || function(id) {
  var p = scmData.salesPlans.find(function(x) { return x.id === id; }); if (!p) return;
  var rate = p.planQty > 0 ? (p.actualQty / p.planQty * 100).toFixed(1) : '0.0';
  openModal('销售计划详情 - ' + p.id,
    '<div class="form-row"><div class="form-group"><label>计划号</label><input class="input" value="' + p.id + '" disabled></div><div class="form-group"><label>类型</label><input class="input" value="' + (p.type === 'scheduled' ? '定时计划' : '临时计划') + '" disabled></div></div>' +
    '<div class="form-row"><div class="form-group"><label>客户</label><input class="input" value="' + (p.customerName || '-') + '" disabled></div><div class="form-group"><label>产品</label><input class="input" value="' + (p.productName || '-') + '" disabled></div></div>' +
    '<div class="form-row"><div class="form-group"><label>月份</label><input class="input" value="' + (p.month || '-') + '" disabled></div><div class="form-group"><label>负责人</label><input class="input" value="' + (p.owner || '-') + '" disabled></div></div>' +
    '<div class="form-row"><div class="form-group"><label>计划量</label><input class="input" value="' + (p.planQty || 0).toLocaleString() + '" disabled></div><div class="form-group"><label>实际量</label><input class="input" value="' + (p.actualQty || 0).toLocaleString() + '" disabled></div></div>' +
    '<div class="form-row"><div class="form-group"><label>达成率</label><input class="input" value="' + rate + '%" disabled style="color:' + (parseFloat(rate) >= 90 ? 'var(--success)' : parseFloat(rate) >= 60 ? 'var(--warning)' : 'var(--danger)') + '"></div><div class="form-group"><label>状态</label><input class="input" value="' + (p.status || '进行中') + '" disabled></div></div>',
    '<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-outline" onclick="closeModal();window._editSalesPlan(\'' + id + '\')">编辑</button>');
};
window._deleteSalesPlan = window._deleteSalesPlan || function(id) {
  var p = scmData.salesPlans.find(function(x) { return x.id === id; }); if (!p) return;
  openModal('确认删除', '<p>确定删除销售计划「' + p.id + ' - ' + (p.productName || '') + '」吗？</p>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="scmData.salesPlans = scmData.salesPlans.filter(function(o) { return o.id !== \'' + id + '\'; }); saveData(); closeModal(); if (currentModule === \'salesplan\') renderSalesPlanModule(); showToast(\'已删除\', \'success\');">确认</button>');
};

window.confirmDeleteSupplier = confirmDeleteSupplier;
window.openPurchaseForm = openPurchaseForm;
window.savePurchase = savePurchase;
window.approvePurchase = approvePurchase;
window.viewPurchase = viewPurchase;
window.deletePurchase = deletePurchase;
window.confirmDeletePurchase = confirmDeletePurchase;
window.filterSupplierTable = filterSupplierTable;
window.filterPurchaseTable = filterPurchaseTable;
window.filterDemandTable = filterDemandTable;
window.openDemandForm = () => showToast('功能开发中', 'info');
window.editDemand = () => showToast('功能开发中', 'info');
window.deleteDemand = () => showToast('功能开发中', 'info');
window.showMasterTab = () => showToast('功能开发中', 'info');
window.closeModal = closeModal;
window.formatMoney = formatMoney;

// 组织架构函数
window.addOrgDept = addOrgDept;
window.saveOrgDept = saveOrgDept;
window.editOrgDept = editOrgDept;
window.updateOrgDept = updateOrgDept;
window.deleteOrgDept = deleteOrgDept;
window.addOrgRole = addOrgRole;
window.saveOrgRole = saveOrgRole;
window.editOrgRole = editOrgRole;
window.updateOrgRole = updateOrgRole;
window.deleteOrgRole = deleteOrgRole;
window.addOrgUser = addOrgUser;
window.saveOrgUser = saveOrgUser;
window.editOrgUser = editOrgUser;
window.updateOrgUser = updateOrgUser;
window.deleteOrgUser = deleteOrgUser;
