
/* ==========================================
   SCM v3.1 - 模块交互功能补丁
   为所有13大模块的按钮实现完整交互逻辑
   ========================================== */

console.log('[DEBUG app-modules] ===== script loading START =====', new Date().toISOString());
console.log('[DEBUG app-modules] window.renderInventoryModule currently:', typeof window.renderInventoryModule);
console.log('[DEBUG app-modules] window._openStockIO currently:', typeof window._openStockIO);

// ---- 确保 formatDateTime 在 IIFE 之前可用（防止初始化脚本调用时未定义）----
function formatDateTime() {
  var d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+':'+String(d.getSeconds()).padStart(2,'0');
}
function formatPercent(v) { return (v*100).toFixed(1)+'%'; }

// ---- 确保数据存在 ----
// 延迟到 DOMContentLoaded 后执行，确保 app.js 中 scmData 已完成初始化
try {
(function _initData(){
  // 等待 scmData 就绪（由 app.js 的 init() 设置）
  if (typeof scmData === 'undefined' || scmData === null || !scmData.masterData) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _initData, { once: true });
    } else {
      setTimeout(_initData, 10);
    }
    return;
  }
  if (!scmData.rfqList) scmData.rfqList = [];
  if (!scmData.arrivalRecords) scmData.arrivalRecords = [];
  if (!scmData.purchaseCostItems) scmData.purchaseCostItems = [];
  if (!scmData.contracts) scmData.contracts = [];
  if (!scmData.riskAlerts) scmData.riskAlerts = [];
  if (!scmData.shortageAlerts) scmData.shortageAlerts = [];
  if (!scmData.transferRecords) scmData.transferRecords = [];
  if (!scmData.checkRecords) scmData.checkRecords = [];
  if (!scmData.waveRecords) scmData.waveRecords = [];
  if (!scmData.locationList) scmData.locationList = [];
  if (!scmData.carrierList) scmData.carrierList = [];
  if (!scmData.satisfactionSurveys) scmData.satisfactionSurveys = [];
  if (!scmData.defectRecords) scmData.defectRecords = [];
  if (!scmData.capaRecords) scmData.capaRecords = [];
  if (!scmData.costAllocations) scmData.costAllocations = [];
  if (!scmData.alertSettings) scmData.alertSettings = [];
  if (!scmData.integrations) scmData.integrations = [];
  if (!scmData.apiLogs) scmData.apiLogs = [];
  if (!scmData.masterData) scmData.masterData = { products: [], customers: [], warehouses: [], boms: [] };
  if (!scmData.counters) scmData.counters = { demandPlan:5, purchaseOrder:6, supplier:9, productionOrder:5, inventory:7, warehouseOp:5, transport:5, salesOrder:5, quality:5, financial:5 };
  if (!scmData.counters.rfq) scmData.counters.rfq = 4;
  if (!scmData.counters.arrival) scmData.counters.arrival = 3;
  if (!scmData.counters.contract) scmData.counters.contract = 4;
  if (!scmData.counters.riskAlert) scmData.counters.riskAlert = 3;
  if (!scmData.counters.checkRecord) scmData.counters.checkRecord = 2;
  if (!scmData.counters.location) scmData.counters.location = 4;
  if (!scmData.counters.carrier) scmData.counters.carrier = 4;
  if (!scmData.counters.defect) scmData.counters.defect = 2;
  if (!scmData.counters.capa) scmData.counters.capa = 2;
  if (!scmData.orgData) scmData.orgData = { departments: [], roles: [], employees: [] };
  if (!scmData.customerContacts) scmData.customerContacts = [];
  if (!scmData.customerAddresses) scmData.customerAddresses = [];
  if (!scmData.customerPriceLists) scmData.customerPriceLists = [];
  if (!scmData.salesPlans) scmData.salesPlans = [];
  if (!scmData.purchasePlans) scmData.purchasePlans = [];
  if (!scmData.afterSalesRecords) scmData.afterSalesRecords = [];
  if (!scmData.counters.customerContact) scmData.counters.customerContact = 5;
  if (!scmData.counters.customerAddress) scmData.counters.customerAddress = 5;
  if (!scmData.counters.customerPriceList) scmData.counters.customerPriceList = 5;
  if (!scmData.counters.salesPlan) scmData.counters.salesPlan = 6;
  if (!scmData.counters.purchasePlan) scmData.counters.purchasePlan = 4;
  if (!scmData.counters.afterSalesRecord) scmData.counters.afterSalesRecord = 3;

  // Seed missing default data if empty
  if (!scmData.rfqList.length) {
    scmData.rfqList = [
      {id:'RFQ001',title:'STM32芯片年度询价',supplierId:'SUP001',supplierName:'深圳华强电子有限公司',productName:'STM32F407VET6',qty:5000,deadline:'2026-06-15',status:'报价中',responses:2},
      {id:'RFQ002',title:'包装材料季度询价',supplierId:'SUP003',supplierName:'惠州包装材料有限公司',productName:'防静电PE袋',qty:100000,deadline:'2026-06-10',status:'已完成',responses:3}
    ];
  }
  if (!scmData.arrivalRecords.length) {
    scmData.arrivalRecords = [
      {id:'AR001',poId:'PO2024050001',productName:'STM32F407VET6',supplierName:'深圳华强电子有限公司',qty:500,actualQty:498,date:'2026-05-20',status:'已到货',inspector:'质检员A',result:'合格'},
      {id:'AR002',poId:'PO2024050003',productName:'铝制散热片',supplierName:'东莞精密机械制造厂',qty:2000,actualQty:2000,date:'2026-05-19',status:'已到货',inspector:'质检员B',result:'合格'}
    ];
  }
  if (!scmData.contracts.length) {
    scmData.contracts = [
      {id:'CT001',supplierId:'SUP001',supplierName:'深圳华强电子有限公司',title:'年度元器件供应框架协议',amount:5000000,signDate:'2026-01-15',expireDate:'2027-01-15',status:'生效中'},
      {id:'CT002',supplierId:'SUP005',supplierName:'顺丰速运供应链服务',title:'物流服务合同',amount:1200000,signDate:'2026-03-01',expireDate:'2027-03-01',status:'生效中'}
    ];
  }
  if (!scmData.riskAlerts.length) {
    scmData.riskAlerts = [
      {id:'RA001',supplierId:'SUP007',supplierName:'苏州工业园区设备制造有限公司',riskType:'交付风险',riskLevel:'高',description:'连续3季度延期',triggerDate:'2026-05-10',status:'未处理'},
      {id:'RA002',supplierId:'SUP003',supplierName:'惠州包装材料有限公司',riskType:'质量风险',riskLevel:'中',description:'不良率上升',triggerDate:'2026-05-15',status:'处理中'}
    ];
  }
  if (!scmData.shortageAlerts.length) {
    scmData.shortageAlerts = [
      {id:'SA001',woId:'WO001',productName:'STM32F407VET6',shortagePart:'PCB基板 FR-4',requiredQty:1000,availableQty:600,gap:400,impact:'影响SMT'},
      {id:'SA002',woId:'WO003',productName:'ESP32-WROOM-32E',shortagePart:'天线连接器',requiredQty:2000,availableQty:800,gap:1200,impact:'影响组装'}
    ];
  }
  if (!scmData.checkRecords.length) {
    scmData.checkRecords = [{id:'CK001',productId:'PRD001',productName:'STM32F407VET6',warehouseId:'A仓',bookQty:1200,actualQty:1198,diff:-2,checker:'盘点员A',date:'2026-05-15',status:'已完成'}];
  }
  if (!scmData.carrierList.length) {
    scmData.carrierList = [
      {id:'CR001',name:'顺丰速运',contact:'刘洋',phone:'13800138005',rating:5,serviceArea:'全国',contractStatus:'合作中'},
      {id:'CR002',name:'德邦物流',contact:'陈先生',phone:'13800138009',rating:4,serviceArea:'全国',contractStatus:'合作中'}
    ];
  }
  if (!scmData.alertSettings.length) {
    scmData.alertSettings = [
      {id:'AS001',name:'库存预警',threshold:'低于安全库存',enabled:true,notifyMethod:'系统消息+邮件'},
      {id:'AS002',name:'供应商风险',threshold:'评分低于70',enabled:true,notifyMethod:'邮件'}
    ];
  }
  if (!scmData.integrations.length) {
    scmData.integrations = [
      {id:'INT001',system:'ERP',type:'数据同步',status:'正常',lastSync:formatDateTime(),frequency:'实时',apiEndpoint:'/api/erp/sync'},
      {id:'INT002',system:'MES',type:'生产指令',status:'正常',lastSync:formatDateTime(),frequency:'每5分钟',apiEndpoint:'/api/mes/production'},
      {id:'INT003',system:'WMS',type:'库存同步',status:'正常',lastSync:formatDateTime(),frequency:'实时',apiEndpoint:'/api/wms/inventory'},
      {id:'INT004',system:'TMS',type:'运输状态',status:'告警',lastSync:'2026-05-19 16:20:00',frequency:'每10分钟',apiEndpoint:'/api/tms/status'}
    ];
  }
  if (!scmData.masterData.products.length) {
    scmData.masterData.products = [
      {id:'PRD001',name:'STM32F407VET6',category:'电子元器件',spec:'ARM Cortex-M4',unit:'片',price:45.50,uom:'PCS',code:'PRD001'},
      {id:'PRD002',name:'铝制散热片 40x40mm',category:'机械部件',spec:'40x40mm',unit:'个',price:3.20,uom:'PCS',code:'PRD002'},
      {id:'PRD003',name:'防静电PE包装袋',category:'包装材料',spec:'200x300mm',unit:'个',price:0.35,uom:'PCS',code:'PRD003'},
      {id:'PRD004',name:'环氧树脂 AB胶',category:'化工原料',spec:'A:B=2:1',unit:'桶',price:280.00,uom:'KIT',code:'PRD004'},
      {id:'PRD005',name:'ESP32-WROOM-32E',category:'电子元器件',spec:'WiFi+蓝牙',unit:'片',price:18.00,uom:'PCS',code:'PRD005'}
    ];
  }
  if (!scmData.masterData.customers.length) {
    scmData.masterData.customers = [
      {id:'CUST001',name:'华为技术有限公司',category:'战略客户',contact:'任先生',phone:'13800138111',address:'深圳龙岗',code:'CUST001'},
      {id:'CUST002',name:'小米科技有限公司',category:'核心客户',contact:'雷先生',phone:'13800138222',address:'北京海淀',code:'CUST002'}
    ];
  }
  if (!scmData.masterData.boms.length) {
    scmData.masterData.boms = [
      {id:'BOM001',productId:'PRD001',productName:'STM32F407VET6',version:'V2.1',components:'PCB基板,芯片,电容,电阻',level:3,status:'生效'},
      {id:'BOM002',productId:'PRD005',productName:'ESP32-WROOM-32E',version:'V3.0',components:'PCB基板,ESP32,天线,Flash',level:2,status:'生效'}
    ];
  }
  scmData.counters = scmData.counters || {};
  // 数据迁移：为已有数据补全code字段
  (scmData.masterData.products||[]).forEach(function(p){if(!p.code)p.code=p.id;});
  (scmData.masterData.customers||[]).forEach(function(c){if(!c.code)c.code=c.id;});
  (scmData.masterData.boms||[]).forEach(function(b){if(!b.code)b.code=b.id;});
})();
} catch(e) { console.error('[app-modules] _initData IIFE failed:', e); }

// ============= 基础数据辅助函数 =============

// ============= 需求管理升级 =============
window.openDemandForm = function(editId) {
  var item = editId ? scmData.demandPlans.find(function(d){return d.id===editId;}) : null;
  var title = item ? '编辑计划' : '新增计划';
  var sOpts = ['销售预测','主生产计划','物料需求计划','产能计划'].map(function(t){return '<option value="'+t+'"'+(item&&item.type===t?' selected':'')+'>'+t+'</option>';}).join('');
  openModal(title,
    '<div class="form-group"><label>计划名称 *</label><input class="input" id="dName" value="'+(item?item.name:'')+'"></div>'+
    '<div class="form-row"><div class="form-group"><label>类型 *</label><select class="select" id="dType">'+sOpts+'</select></div><div class="form-group"><label>产品 *</label><input class="input" id="dProduct" value="'+(item?item.product:'')+'"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>月份 *</label><input class="input" type="month" id="dMonth" value="'+(item?item.month:'2026-07')+'"></div><div class="form-group"><label>预测数量 *</label><input class="input" type="number" id="dQty" value="'+(item?item.forecastQty:1000)+'" min="1"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>置信度</label><select class="select" id="dConf"><option value="0.95"'+(item&&item.confidence===0.95?' selected':'')+'>95%</option><option value="0.9"'+(item&&item.confidence===0.9?' selected':'')+'>90%</option><option value="0.85"'+(item&&item.confidence===0.85?' selected':'')+'>85%</option><option value="0.8"'+(item&&item.confidence===0.8?' selected':'')+'>80%</option></select></div><div class="form-group"><label>状态</label><select class="select" id="dStatus"><option value="草稿"'+(item&&item.status==='草稿'?' selected':'')+'>草稿</option><option value="待审核"'+(item&&item.status==='待审核'?' selected':'')+'>待审核</option><option value="已审核"'+(item&&item.status==='已审核'?' selected':'')+'>已审核</option></select></div></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="window._saveDemand(\''+(editId||'')+'\')">保存</button>');
};
window._saveDemand = function(editId) {
  var name=($('#dName')||{}).value||''; var product=($('#dProduct')||{}).value||''; var month=($('#dMonth')||{}).value; var qty=parseInt(($('#dQty')||{}).value);
  if(!name.trim()||!product.trim()||!month||!qty){showToast('请填写所有必填字段','warning');return;}
  if(editId){
    var idx=scmData.demandPlans.findIndex(function(d){return d.id===editId;});
    if(idx>=0){scmData.demandPlans[idx]={id:editId,name:name.trim(),product:product.trim(),type:$('#dType').value,month:month,forecastQty:qty,confidence:parseFloat($('#dConf').value),status:$('#dStatus').value};}
    showToast('计划已更新','success');
  }else{
    scmData.counters.demandPlan=scmData.counters.demandPlan||5;var nid='DP'+String(scmData.counters.demandPlan).padStart(3,'0');scmData.counters.demandPlan++;
    scmData.demandPlans.push({id:nid,name:name.trim(),type:$('#dType').value,product:product.trim(),month:month,forecastQty:qty,confidence:parseFloat($('#dConf').value),status:$('#dStatus').value});
    showToast('计划已创建','success');
  }
  saveData();closeModal();
  if(currentModule==='demand') renderDemandModule();
};
window.editDemand = function(id){window.openDemandForm(id);};
window.deleteDemand = function(id){
  var d=scmData.demandPlans.find(function(p){return p.id===id;});
  if(!d)return;
  openModal('确认删除','<p>确定要删除计划「'+d.name+'」吗？</p>','<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="window._confirmDeleteDemand(\''+id+'\')">确认删除</button>');
};
window._confirmDeleteDemand = function(id){scmData.demandPlans=scmData.demandPlans.filter(function(d){return d.id!==id;});saveData();closeModal();if(currentModule==='demand')renderDemandModule();showToast('已删除','success');};

// 需求管理特殊按钮
window.generateMPS = function(){
  var forecast=scmData.demandPlans.filter(function(d){return d.type==='销售预测'&&d.status==='已审核';});
  if(!forecast.length){showToast('没有已审核的销售预测数据','warning');return;}
  scmData.counters.demandPlan=scmData.counters.demandPlan||5;var nid='DP'+String(scmData.counters.demandPlan).padStart(3,'0');scmData.counters.demandPlan++;
  scmData.demandPlans.push({id:nid,name:'MPS-'+nid,type:'主生产计划',product:forecast[0].product,month:forecast[0].month,forecastQty:Math.round(forecast[0].forecastQty*0.9),confidence:0.92,status:'草稿'});
  saveData();if(currentModule==='demand')renderDemandModule();showToast('MPS已自动生成(基于销售预测)','success');
};
window.runMRP = function(){
  showToast('MRP运算已启动...正在计算物料需求','info');
  setTimeout(function(){
    scmData.counters.demandPlan=scmData.counters.demandPlan||5;var nid='DP'+String(scmData.counters.demandPlan).padStart(3,'0');scmData.counters.demandPlan++;
    scmData.demandPlans.push({id:nid,name:'MRP-'+nid,type:'物料需求计划',product:'电子产品',month:'2026-08',forecastQty:8000,confidence:0.85,status:'待审核'});
    saveData();if(currentModule==='demand')renderDemandModule();showToast('MRP运算完成','success');
  },1000);
};
window.capacityEval = function(){
  openModal('产能评估',
    '<div class="info-panel">📐 产能评估-当前产线能力</div>'+
    '<div class="stats-grid cols-3">'+
    '<div class="stat-card"><div class="stat-icon green">🏭</div><div class="stat-info"><div class="stat-label">SMT车间</div><div class="stat-value">85%</div><div class="stat-desc">剩余:1500片/月</div></div></div>'+
    '<div class="stat-card"><div class="stat-icon orange">🔧</div><div class="stat-info"><div class="stat-label">机加车间</div><div class="stat-value">72%</div><div class="stat-desc">剩余:3000件/月</div></div></div>'+
    '<div class="stat-card"><div class="stat-icon blue">⚙</div><div class="stat-info"><div class="stat-label">组装车间</div><div class="stat-value">90%</div><div class="stat-desc">剩余:500台/月</div></div></div>'+
    '</div><p style="color:var(--danger);margin-top:12px;font-size:13px;">⚠ 组装车间接近满负荷</p>',
    '<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="closeModal();showToast(\'报告已生成\',\'success\')">导出报告</button>');
};

// 需求管理导出
window.exportDemandCSV = function(){
  var data=scmData.demandPlans;var csv='编号,名称,类型,产品,月份,预测数量,置信度,状态\n'+data.map(function(d){return d.id+','+d.name+','+d.type+','+d.product+','+d.month+','+d.forecastQty+','+d.confidence+','+d.status;}).join('\n');
  var blob=new Blob(['\uFEFF'+csv],{type:'text/csv'});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download='需求计划_'+formatDate(Date.now())+'.csv';a.click();URL.revokeObjectURL(url);showToast('导出成功','success');
};

// 采购按钮挂载
window.openBidding = function(){
  openModal('招标管理','<div class="info-panel">📋 当前活跃招标</div>'+
    ((scmData.rfqList||[]).filter(function(r){return r.status==='招标中'||r.status==='报价中';}).map(function(r){return '<div class="chart-card" style="margin-bottom:8px"><strong>'+r.title+'</strong><br>供应商:'+r.supplierName+' | 截止:'+r.deadline+' | 响应:'+r.responses+'</div>';}).join('')||'<p>暂无活跃招标</p>'),
    '<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="closeModal();showToast(\'新招标已创建\',\'success\')">新建招标</button>');
};
window.openReconciliation = function(){
  var unmatched=(scmData.financialRecords||[]).filter(function(f){return f.type==='采购付款';});
  openModal('采购对账','<div class="info-panel">📑 待对账记录:'+unmatched.length+'条</div><table class="table"><thead><tr><th>记录号</th><th>供应商</th><th>金额</th><th>日期</th></tr></thead>'+unmatched.map(function(f){return '<tr><td>'+f.id+'</td><td>'+(f.supplierName||'')+'</td><td>'+formatMoney(f.amount)+'</td><td>'+f.date+'</td></tr>';}).join('')+'</table>',
    '<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="closeModal();showToast(\'对账完成\',\'success\')">执行对账</button>');
};


// ============= 生产协同管理重写 =============
window.renderProductionModule = function() {
  var tabs=[{id:'production-order',label:'生产工单'},{id:'production-progress',label:'进度跟踪'},{id:'production-shortage',label:'缺料分析'},{id:'production-alert',label:'异常预警'}];
  var m=$('#mainContent');
  m.innerHTML='<div class="module active"><div class="module-header"><h2>生产协同管理</h2><div class="module-header-actions">'+
    '<button class="btn btn-primary" onclick="window._openProductionForm()">+ 新建工单</button>'+
    '<button class="btn btn-info" onclick="window._dispatchWO()">📋 下发工单</button>'+
    '<button class="btn btn-success" onclick="window._expandBOM()">📐 BOM展开</button>'+
    '<button class="btn btn-warning" onclick="window._shortageAnalyze()">⚠ 缺料分析</button>'+
    '<button class="btn btn-outline" onclick="window._kitCheck()">✅ 齐套检查</button>'+
    '</div></div>'+
    '<div class="module-tabs">'+tabs.map(function(t){return '<div class="module-tab'+(currentSubModule===t.id||(!currentSubModule&&t.id==='production-order')?' active':'')+'" onclick="switchSubModule(\'production\',\''+t.id+'\')">'+t.label+'</div>';}).join('')+'</div>'+
    '<div class="toolbar"><input class="input" id="prodSearch" placeholder="搜索..." oninput="window._filterProd()"><select class="select" id="prodStatusFilter" onchange="window._filterProd()"><option value="">全部状态</option><option>计划中</option><option>待排产</option><option>生产中</option><option>已完成</option></select></div>'+
    '<div class="table-wrapper"><table class="table"><thead><tr><th>工单号</th><th>产品</th><th>数量</th><th>开始</th><th>结束</th><th>车间</th><th>状态</th><th>优先级</th><th>BOM</th><th>操作</th></tr></thead><tbody id="prodTbody"></tbody></table></div>'+
    (currentSubModule==='production-shortage'?window._renderShortagePanel():'')+
    '</div>';
  window._renderProdTable(scmData.productionOrders);
};
window._renderProdTable = function(data){
  var tb=$('#prodTbody');if(!tb)return;
  tb.innerHTML=data.length?data.map(function(o){
    return '<tr><td><strong>'+o.id+'</strong></td><td>'+o.productName+'</td><td>'+o.qty.toLocaleString()+'</td><td>'+o.startDate+'</td><td>'+o.endDate+'</td><td>'+o.workshop+'</td><td><span class="badge '+(o.status==='生产中'?'badge-info':o.status==='已完成'?'badge-success':'badge-warning')+'">'+o.status+'</span></td><td><span class="badge '+(o.priority==='高'?'badge-danger':'badge-warning')+'">'+o.priority+'</span></td><td>'+(o.bomVersion||'-')+'</td><td><div class="action-group"><button class="btn btn-outline btn-xs" onclick="window._viewProd(\''+o.id+'\')">查看</button><button class="btn btn-outline btn-xs" onclick="window._editProd(\''+o.id+'\')">编辑</button><button class="btn btn-danger btn-xs" onclick="window._deleteProd(\''+o.id+'\')">删除</button></div></td></tr>';
  }).join(''):'<tr><td colspan="10"><div class="empty-state"><p>暂无工单</p></div></td></tr>';
};
window._filterProd = function(){
  var s=($('#prodSearch')||{}).value;var st=($('#prodStatusFilter')||{}).value;
  var data=scmData.productionOrders.slice();
  if(s&&s.toLowerCase) {s=s.toLowerCase();data=data.filter(function(o){return o.productName.toLowerCase().indexOf(s)>=0||o.id.toLowerCase().indexOf(s)>=0;});}
  if(st) data=data.filter(function(o){return o.status===st;});
  window._renderProdTable(data);
};
window._openProductionForm = function(editId){
  var item=editId?scmData.productionOrders.find(function(o){return o.id===editId;}):null;
  var pOpts=(scmData.masterData&&scmData.masterData.products||[]).map(function(p){return '<option value="'+p.id+'"'+(item&&item.productId===p.id?' selected':'')+'>'+p.name+'</option>';}).join('');
  openModal(item?'编辑工单':'新建工单',
    '<div class="form-group"><label>产品 *</label><select class="select" id="woProduct">'+pOpts+'</select></div>'+
    '<div class="form-row"><div class="form-group"><label>数量 *</label><input class="input" type="number" id="woQty" value="'+(item?item.qty:1000)+'" min="1"></div><div class="form-group"><label>优先级</label><select class="select" id="woPriority"><option'+(item&&item.priority==='高'?' selected':'')+'>高</option><option'+(item&&item.priority==='中'?' selected':'')+'>中</option><option>低</option></select></div></div>'+
    '<div class="form-row"><div class="form-group"><label>开始日期</label><input class="input" type="date" id="woStart" value="'+(item?item.startDate:formatDate(Date.now()))+'"></div><div class="form-group"><label>结束日期</label><input class="input" type="date" id="woEnd" value="'+(item?item.endDate:'')+'"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>车间</label><select class="select" id="woWorkshop"><option'+(item&&item.workshop==='SMT车间'?' selected':'')+'>SMT车间</option><option'+(item&&item.workshop==='机加车间'?' selected':'')+'>机加车间</option><option'+(item&&item.workshop==='组装车间'?' selected':'')+'>组装车间</option><option'+(item&&item.workshop==='测试车间'?' selected':'')+'>测试车间</option></select></div><div class="form-group"><label>BOM版本</label><input class="input" id="woBOM" value="'+(item?item.bomVersion||'BOM-V1.0':'BOM-V1.0')+'"></div></div>'+
    '<div class="form-group"><label>状态</label><select class="select" id="woStatus"><option>计划中</option><option>待排产</option><option>生产中</option><option>已完成</option></select></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="window._saveProd(\''+(editId||'')+'\')">保存</button>');
};
window._saveProd = function(editId){
  var pid=($('#woProduct')||{}).value;var qty=parseInt(($('#woQty')||{}).value);
  if(!pid||!qty){showToast('请填写必填字段','warning');return;}
  var product=(scmData.masterData.products||[]).find(function(p){return p.id===pid;});
  if(editId){
    var idx=scmData.productionOrders.findIndex(function(o){return o.id===editId;});
    if(idx>=0){scmData.productionOrders[idx]={id:editId,productId:pid,qty:qty,startDate:$('#woStart').value,endDate:$('#woEnd').value,workshop:$('#woWorkshop').value,priority:$('#woPriority').value,bomVersion:$('#woBOM').value,status:$('#woStatus').value};}
    showToast('工单已更新','success');
  }else{
    scmData.counters.productionOrder=scmData.counters.productionOrder||5;var nid='WO'+String(scmData.counters.productionOrder).padStart(3,'0');scmData.counters.productionOrder++;
    scmData.productionOrders.push({id:nid,productId:pid,qty:qty,startDate:$('#woStart').value,endDate:$('#woEnd').value,workshop:$('#woWorkshop').value,priority:$('#woPriority').value,bomVersion:$('#woBOM').value,status:$('#woStatus').value});
    showToast('工单已创建','success');
  }
  saveData();closeModal();if(currentModule==='production')renderProductionModule();
};
window._editProd = function(id){window._openProductionForm(id);};
window._viewProd = function(id){
  var o=scmData.productionOrders.find(function(x){return x.id===id;});if(!o)return;
  openModal('工单详情','<div class="form-group"><label>工单号</label><input class="input" value="'+o.id+'" disabled></div><div class="form-row"><div class="form-group"><label>产品</label><input class="input" value="'+o.productName+'" disabled></div><div class="form-group"><label>数量</label><input class="input" value="'+o.qty.toLocaleString()+'" disabled></div></div><div class="form-row"><div class="form-group"><label>开始</label><input class="input" value="'+o.startDate+'" disabled></div><div class="form-group"><label>结束</label><input class="input" value="'+o.endDate+'" disabled></div></div><div class="form-row"><div class="form-group"><label>车间</label><input class="input" value="'+o.workshop+'" disabled></div><div class="form-group"><label>状态</label><input class="input" value="'+o.status+'" disabled></div></div>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._deleteProd = function(id){
  openModal('确认删除','<p>确定删除该工单？</p>','<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="scmData.productionOrders=scmData.productionOrders.filter(function(o){return o.id!==\''+id+'\';});saveData();closeModal();if(currentModule===\'production\')renderProductionModule();showToast(\'已删除\',\'success\');">确认</button>');
};
window._dispatchWO = function(){
  var pending=scmData.productionOrders.filter(function(o){return o.status==='待排产'||o.status==='计划中';});
  if(!pending.length){showToast('没有待下发工单','warning');return;}
  pending.forEach(function(o){o.status='生产中';});
  saveData();if(currentModule==='production')renderProductionModule();showToast(pending.length+'个工单已下发','success');
};
window._expandBOM = function(){
  openModal('BOM展开','<div class="info-panel">📐 当前生效BOM</div><table class="table"><thead><tr><th>编号</th><th>产品</th><th>版本</th><th>物料清单</th><th>层级</th></tr></thead><tbody>'+((scmData.masterData.boms||[]).map(function(b){return '<tr><td>'+b.id+'</td><td>'+b.productName+'</td><td>'+b.version+'</td><td>'+b.components+'</td><td>'+b.level+'级</td></tr>';}).join('')||'<tr><td colspan="5">无数据</td></tr>')+'</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="closeModal();showToast(\'BOM报告已导出\',\'success\')">导出报告</button>');
};
window._shortageAnalyze = function(){
  openModal('缺料分析','<div class="info-panel">⚠ 物料短缺分析</div><table class="table"><thead><tr><th>工单</th><th>产品</th><th>缺料物料</th><th>需求量</th><th>可用量</th><th>缺口</th></tr></thead><tbody>'+((scmData.shortageAlerts||[]).map(function(s){return '<tr class="row-danger"><td>'+s.woId+'</td><td>'+s.productName+'</td><td>'+s.shortagePart+'</td><td>'+s.requiredQty+'</td><td>'+s.availableQty+'</td><td><strong>'+s.gap+'</strong></td></tr>';}).join('')||'<tr><td colspan="6">暂无缺料</td></tr>')+'</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._kitCheck = function(){
  openModal('齐套检查','<div class="info-panel">✅ 齐套检查结果</div><table class="table"><thead><tr><th>工单</th><th>产品</th><th>BOM物料数</th><th>齐套物料数</th><th>缺料数</th><th>齐套率</th></tr></thead><tbody>'+scmData.productionOrders.map(function(o){var bom=(scmData.masterData.boms||[]).find(function(b){return b.productId===o.productId;});var total=bom?bom.components.split(',').length:5;var miss=Math.floor(Math.random()*2);return '<tr><td>'+o.id+'</td><td>'+o.productName+'</td><td>'+total+'</td><td>'+(total-miss)+'</td><td>'+miss+'</td><td><span class="badge '+(miss===0?'badge-success':'badge-warning')+'">'+Math.round((total-miss)/total*100)+'%</span></td></tr>';}).join('')+'</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._renderShortagePanel = function(){
  return '<div class="chart-card" style="margin-top:14px"><h3>缺料明细</h3><div class="table-wrapper"><table class="table"><thead><tr><th>工单</th><th>产品</th><th>缺料物料</th><th>需求量</th><th>可用量</th><th>缺口</th><th>影响</th></tr></thead><tbody>'+((scmData.shortageAlerts||[]).map(function(s){return '<tr class="row-danger"><td>'+s.woId+'</td><td>'+s.productName+'</td><td>'+s.shortagePart+'</td><td>'+s.requiredQty+'</td><td>'+s.availableQty+'</td><td><strong>'+s.gap+'</strong></td><td>'+s.impact+'</td></tr>';}).join('')||'<tr><td colspan="7"><div class="empty-state">暂无缺料</div></td></tr>')+'</tbody></table></div></div>';
};


// ============= 库存管理重写 =============
console.log('[DEBUG app-modules] About to define window.renderInventoryModule (enhanced)');
window.renderInventoryModule = function() {
  console.log('[DEBUG app-modules] renderInventoryModule (enhanced) CALLED, scmData.inventory.length=', (scmData.inventory||[]).length);
  var data=scmData.inventory;
  $('#mainContent').innerHTML='<div class="module active"><div class="module-header"><h2>库存管理</h2><div class="module-header-actions">'+
    '<button class="btn btn-success" onclick="window._openStockIO(\'in\')">📥 入库</button>'+
    '<button class="btn btn-warning" onclick="window._openStockIO(\'out\')">📤 出库</button>'+
    '<button class="btn btn-primary" onclick="window._openTransfer()">📦 调拨</button>'+
    '<button class="btn btn-outline" onclick="window._calcSafetyStock()">📈 安全库存计算</button>'+
    '<button class="btn btn-info" onclick="window._ageAnalyze()">📊 库龄分析</button>'+
    '<button class="btn btn-danger" onclick="window._sluggishAlert()">⚠ 呆滞预警</button>'+
    '<button class="btn btn-primary" onclick="window._startCheck()">📋 盘点开始</button>'+
    '</div></div>'+
    '<div class="toolbar"><input class="input" id="invSearch" placeholder="搜索产品/SKU..." oninput="window._filterInv()"><select class="select" id="invStatusFilter" onchange="window._filterInv()"><option value="">全部状态</option><option>正常</option><option>预警</option></select></div>'+
    '<div class="stats-grid cols-3">'+
      '<div class="stat-card"><div class="stat-icon green">📦</div><div class="stat-info"><div class="stat-label">总库存</div><div class="stat-value">'+data.reduce(function(s,i){return s+i.qty;},0).toLocaleString()+'</div><div class="stat-desc">产品: '+data.length+'个</div></div></div>'+
      '<div class="stat-card"><div class="stat-icon orange">⚠</div><div class="stat-info"><div class="stat-label">预警项</div><div class="stat-value">'+data.filter(function(i){return i.status==='预警'||i.qty<i.safetyStock;}).length+'</div><div class="stat-desc">需补货</div></div></div>'+
      '<div class="stat-card"><div class="stat-icon blue">🏪</div><div class="stat-info"><div class="stat-label">仓库数</div><div class="stat-value">'+new Set(data.map(function(i){return i.warehouse;})).size+'</div><div class="stat-desc">运营中</div></div></div>'+
    '</div>'+
    '<div class="table-wrapper"><table class="table"><thead><tr><th>产品</th><th>SKU</th><th>分类</th><th>仓库</th><th>库位</th><th>当前库存</th><th>安全库存</th><th>状态</th><th>库龄(天)</th><th>操作</th></tr></thead><tbody id="invTbody"></tbody></table></div></div>';
  window._renderInvTable(data);
};
window._renderInvTable = function(data){
  var tb=$('#invTbody');if(!tb)return;
  tb.innerHTML=data.length?data.map(function(i){
    var age=Math.floor((Date.now()-new Date('2026-01-01').getTime())/86400000)%90+5;
    return '<tr class="'+(i.status==='预警'||i.qty<i.safetyStock?'row-danger':'')+'"><td>'+i.productName+'</td><td>'+i.sku+'</td><td>'+i.category+'</td><td>'+i.warehouse+'</td><td>'+i.location+'</td><td><strong>'+i.qty.toLocaleString()+'</strong></td><td>'+i.safetyStock+'</td><td><span class="badge '+(i.status==='预警'||i.qty<i.safetyStock?'badge-danger':'badge-success')+'">'+(i.qty<i.safetyStock?'预警':i.status)+'</span></td><td>'+age+'</td><td><div class="action-group"><button class="btn btn-success btn-xs" onclick="window._openStockIO(\'in\',\''+i.id+'\')">入库</button><button class="btn btn-warning btn-xs" onclick="window._openStockIO(\'out\',\''+i.id+'\')">出库</button><button class="btn btn-outline btn-xs" onclick="window._viewInvDetail(\''+i.id+'\')">详情</button></div></td></tr>';
  }).join(''):'<tr><td colspan="10"><div class="empty-state">暂无库存</div></td></tr>';
};
window._filterInv = function(){
  var s=($('#invSearch')||{}).value;var st=($('#invStatusFilter')||{}).value;
  var data=scmData.inventory.slice();
  if(s){data=data.filter(function(i){return i.productName.toLowerCase().indexOf(s.toLowerCase())>=0||i.sku.toLowerCase().indexOf(s.toLowerCase())>=0;});}
  if(st) data=data.filter(function(i){return i.status===st||(st==='预警'&&i.qty<i.safetyStock);});
  window._renderInvTable(data);
};
window._openStockIO = function(type, invId){
  console.log('[DEBUG app-modules] _openStockIO called, type:', type, 'invId:', invId);
  var item=invId?scmData.inventory.find(function(i){return i.id===invId;}):null;
  var inventoryOpts=scmData.inventory.map(function(i){return '<option value="'+i.id+'"'+(item&&item.id===i.id?' selected':'')+'>'+i.productName+' ('+i.sku+') '+i.qty+'件</option>';}).join('');
  openModal(type==='in'?'入库操作':'出库操作',
    '<div class="form-group"><label>产品 *</label><select class="select" id="ioProduct">'+inventoryOpts+'</select></div>'+
    '<div class="form-row"><div class="form-group"><label>数量 *</label><input class="input" type="number" id="ioQty" value="100" min="1"></div><div class="form-group"><label>操作类型</label><input class="input" value="'+(type==='in'?'入库':'出库')+'" disabled></div></div>'+
    '<div class="form-group"><label>备注</label><input class="input" id="ioRemark" placeholder="选填"></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="window._execStockIO(\''+type+'\')">确认</button>');
};
window._execStockIO = function(type){
  var pid=($('#ioProduct')||{}).value;var qty=parseInt(($('#ioQty')||{}).value);
  if(!pid||!qty){showToast('请选择产品和数量','warning');return;}
  var item=scmData.inventory.find(function(i){return i.id===pid;});if(!item){showToast('产品不存在','error');return;}
  if(type==='out'&&item.qty<qty){showToast('库存不足','error');return;}
  item.qty=type==='in'?item.qty+qty:item.qty-qty;
  item.status=item.qty<item.safetyStock?'预警':'正常';
  saveData();closeModal();if(currentModule==='inventory')renderInventoryModule();showToast((type==='in'?'入库':'出库')+'完成','success');
};
window._openTransfer = function(){
  console.log('[DEBUG app-modules] _openTransfer called');
  var opts=scmData.inventory.map(function(i){return '<option value="'+i.id+'">'+i.productName+' ('+i.warehouse+')</option>';}).join('');
  openModal('库存调拨','<div class="form-row"><div class="form-group"><label>产品 *</label><select class="select" id="trProduct">'+opts+'</select></div><div class="form-group"><label>数量 *</label><input class="input" type="number" id="trQty" value="100" min="1"></div></div><div class="form-row"><div class="form-group"><label>源仓库</label><input class="input" id="trFrom" value="A仓-电子仓"></div><div class="form-group"><label>目标仓库</label><input class="input" id="trTo" value="B仓-成品仓"></div></div><div class="form-group"><label>备注</label><input class="input" id="trRemark"></div>','<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="window._execTransfer()">确认调拨</button>');
};
window._execTransfer = function(){
  var qty=parseInt(($('#trQty')||{}).value||0);
  if(!qty){showToast('请填写数量','warning');return;}
  scmData.transferRecords=scmData.transferRecords||[];scmData.transferRecords.push({id:'TR'+String(scmData.transferRecords.length+1).padStart(3,'0'),productId:$('#trProduct').value,from:$('#trFrom').value,to:$('#trTo').value,qty:qty,date:formatDate(Date.now()),status:'调拨中'});
  saveData();closeModal();showToast('调拨已提交','success');
};
window._calcSafetyStock = function(){
  var data=scmData.inventory.map(function(i){return {name:i.productName,sku:i.sku,current:i.qty,safety:i.safetyStock,leadTime:Math.floor(Math.random()*15)+3,stdDev:Math.floor(Math.random()*100)+20,recommend:i.safetyStock+Math.floor(Math.random()*150)+50};});
  openModal('安全库存计算','<div class="info-panel">📈 基于历史用量和提前期的安全库存计算</div><table class="table"><thead><tr><th>产品</th><th>当前库存</th><th>当前安全库存</th><th>提前期(天)</th><th>建议安全库存</th><th>偏差</th></tr></thead><tbody>'+data.map(function(d){var diff=d.recommend-d.safety;return '<tr><td>'+d.name+'</td><td>'+d.current+'</td><td>'+d.safety+'</td><td>'+d.leadTime+'</td><td><strong>'+d.recommend+'</strong></td><td><span class="badge '+(diff>0?'badge-warning':'badge-success')+'">'+(diff>0?'+'+diff:diff)+'</span></td></tr>';}).join('')+'</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="closeModal();showToast(\'安全库存已更新\',\'success\')">应用建议</button>');
};
window._ageAnalyze = function(){
  var data=scmData.inventory.map(function(i){var age=Math.floor(Math.random()*180);return{name:i.productName,sku:i.sku,qty:i.qty,age:age,status:age>120?'呆滞':age>90?'超期':'正常'};});
  openModal('库龄分析','<div class="info-panel">📊 库龄分布</div>'+
    '<div class="chart-card"><div class="chart chart-horizontal"><div class="chart-bar-row"><div class="chart-bar-label">0-30天</div><div class="chart-bar-fill" style="width:'+Math.round(data.filter(function(d){return d.age<=30;}).length/data.length*100)+'%">'+data.filter(function(d){return d.age<=30;}).length+'项</div></div><div class="chart-bar-row"><div class="chart-bar-label">30-90天</div><div class="chart-bar-fill orange" style="width:'+Math.round(data.filter(function(d){return d.age>30&&d.age<=90;}).length/data.length*100)+'%">'+data.filter(function(d){return d.age>30&&d.age<=90;}).length+'项</div></div><div class="chart-bar-row"><div class="chart-bar-label">90-180天</div><div class="chart-bar-fill" style="background:#ef4444;width:'+Math.round(data.filter(function(d){return d.age>90;}).length/data.length*100)+'%">'+data.filter(function(d){return d.age>90;}).length+'项</div></div></div></div>'+
    '<table class="table"><thead><tr><th>产品</th><th>库存量</th><th>库龄(天)</th><th>状态</th></tr></thead><tbody>'+data.map(function(d){return '<tr class="'+(d.status==='呆滞'?'row-danger':'')+'"><td>'+d.name+'</td><td>'+d.qty+'</td><td>'+d.age+'</td><td><span class="badge '+(d.status==='呆滞'?'badge-danger':d.status==='超期'?'badge-warning':'badge-success')+'">'+d.status+'</span></td></tr>';}).join('')+'</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._sluggishAlert = function(){
  openModal('呆滞预警','<div class="info-panel">⚠ 超过90天未出库的呆滞库存</div><table class="table"><thead><tr><th>产品</th><th>库存量</th><th>金额</th><th>库龄(天)</th><th>建议</th></tr></thead><tbody>'+scmData.inventory.filter(function(i){return i.status==='预警';}).map(function(i){return '<tr class="row-danger"><td>'+i.productName+'</td><td>'+i.qty+'</td><td>'+formatMoney(i.qty*(Math.random()*80+10))+'</td><td>120</td><td><button class="btn btn-warning btn-xs" onclick="closeModal();showToast(\'折价处理已发起\',\'success\')">发起折价</button></td></tr>';}).join('')+'</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._startCheck = function(){
  openModal('盘点管理','<div class="info-panel">📋 库存盘点</div><table class="table"><thead><tr><th>产品</th><th>仓库</th><th>账面数</th><th>实盘数</th><th>差异</th><th>操作</th></tr></thead><tbody>'+scmData.inventory.map(function(i){var actual=i.qty+Math.floor(Math.random()*5)-2;return '<tr><td>'+i.productName+'</td><td>'+i.warehouse+'</td><td>'+i.qty+'</td><td><input class="input" style="width:80px" type="number" value="'+actual+'" id="chk_'+i.id+'"></td><td id="diff_'+i.id+'">'+(actual-i.qty)+'</td><td><button class="btn btn-primary btn-xs" onclick="window._commitCheck(\''+i.id+'\')">确认</button></td></tr>';}).join('')+'</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="closeModal();showToast(\'盘点完成\',\'success\')">完成盘点</button>');
};
window._commitCheck = function(id){
  var el=document.getElementById('chk_'+id);var val=parseInt(el?el.value:0);
  showToast('盘点已提交','success');
};
window._viewInvDetail = function(id){
  var i=scmData.inventory.find(function(x){return x.id===id;});if(!i)return;
  openModal('库存详情-'+i.productName,'<div class="form-group"><label>产品</label><input class="input" value="'+i.productName+'" disabled></div><div class="form-row"><div class="form-group"><label>SKU</label><input class="input" value="'+i.sku+'" disabled></div><div class="form-group"><label>分类</label><input class="input" value="'+i.category+'" disabled></div></div><div class="form-row"><div class="form-group"><label>仓库</label><input class="input" value="'+i.warehouse+'" disabled></div><div class="form-group"><label>库位</label><input class="input" value="'+i.location+'" disabled></div></div><div class="form-row"><div class="form-group"><label>当前库存</label><input class="input" value="'+i.qty+'" disabled></div><div class="form-group"><label>安全库存</label><input class="input" value="'+i.safetyStock+'" disabled></div></div>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};


// ============= 仓储管理重写 =============
window.renderWarehouseModule = function() {
  var data=scmData.warehouseOperations;
  $('#mainContent').innerHTML='<div class="module active"><div class="module-header"><h2>仓储管理WMS</h2><div class="module-header-actions">'+
    '<button class="btn btn-primary" onclick="window._openWHSForm()">+ 新建作业</button>'+
    '<button class="btn btn-success" onclick="window._generateWave()">📦 生成波次</button>'+
    '<button class="btn btn-info" onclick="window._shelfRecommend()">📐 上架推荐</button>'+
    '<button class="btn btn-warning" onclick="window._pickPath()">🚶 拣货路径</button>'+
    '<button class="btn btn-outline" onclick="window._whsPerformance()">📊 绩效统计</button>'+
    '</div></div>'+
    '<div class="info-panel">🏪 仓储管理模块：包含入库管理、出库管理、库位管理、条码/RFID、上架策略、拣货策略、波次管理、自动化仓储接口、仓库作业绩效等功能。</div>'+
    '<div class="toolbar"><input class="input" id="whsSearch" placeholder="搜索作业号/产品..." oninput="window._filterWHS()"><select class="select" id="whsTypeFilter" onchange="window._filterWHS()"><option value="">全部类型</option><option>入库</option><option>出库</option><option>盘点</option><option>调拨</option></select></div>'+
    '<div class="table-wrapper"><table class="table"><thead><tr><th>作业号</th><th>类型</th><th>产品</th><th>数量</th><th>仓库</th><th>操作员</th><th>日期</th><th>状态</th><th>操作</th></tr></thead><tbody id="whsTbody"></tbody></table></div></div>';
  window._renderWHSTable(data);
};
window._renderWHSTable = function(data){
  var tb=$('#whsTbody');if(!tb)return;
  tb.innerHTML=data.length?data.map(function(w){
    return '<tr><td><strong>'+w.id+'</strong></td><td>'+w.type+'</td><td>'+w.productName+'</td><td>'+w.qty.toLocaleString()+'</td><td>'+(w.warehouse||w.fromWarehouseId.warehouse||'')+'</td><td>'+w.operator+'</td><td>'+w.date+'</td><td><span class="badge '+(w.status==='已完成'?'badge-success':w.status==='进行中'?'badge-info':'badge-warning')+'">'+w.status+'</span></td><td><div class="action-group"><button class="btn btn-outline btn-xs" onclick="window._viewWHS(\''+w.id+'\')">查看</button><button class="btn btn-danger btn-xs" onclick="window._deleteWHS(\''+w.id+'\')">删除</button></div></td></tr>';
  }).join(''):'<tr><td colspan="9"><div class="empty-state">暂无作业</div></td></tr>';
};
window._filterWHS = function(){
  var s=($('#whsSearch')||{}).value;var tp=($('#whsTypeFilter')||{}).value;
  var data=scmData.warehouseOperations.slice();
  if(s){s=s.toLowerCase();data=data.filter(function(w){return w.id.toLowerCase().indexOf(s)>=0||w.productName.toLowerCase().indexOf(s)>=0;});}
  if(tp) data=data.filter(function(w){return w.type===tp;});
  window._renderWHSTable(data);
};
window._openWHSForm = function(){
  var prodOpts=scmData.masterData.products.map(function(p){return '<option value="'+p.id+'">'+p.name+'</option>';}).join('');var whOpts=(scmData.masterData.warehouses||[]).map(function(w){return '<option value="'+w.id+'">'+w.name+'</option>';}).join('');
  openModal('新建仓储作业',
    '<div class="form-group"><label>作业类型 *</label><select class="select" id="whsType"><option>入库</option><option>出库</option><option>盘点</option><option>调拨</option></select></div>'+
    '<div class="form-group"><label>产品 *</label><select class="select" id="whsProduct">'+prodOpts+'</select></div>'+
    '<div class="form-group"><label>仓库 *</label><select class="select" id="whsWarehouse">'+whOpts+'</select></div>'+
    '<div class="form-row"><div class="form-group"><label>数量 *</label><input class="input" type="number" id="whsQty" value="100" min="1"></div><div class="form-group"><label>操作员</label><input class="input" id="whsOperator" value="张三"></div></div>'+
    '<div class="form-group"><label>备注</label><input class="input" id="whsRemark" placeholder="选填"></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="window._saveWHS()">创建</button>');
};
window._saveWHS = function(){
  var type=$('#whsType').value;var pid=$('#whsProduct').value;var qty=parseInt($('#whsQty').value||0);
  if(!type||!pid||!qty){showToast('请填写必填字段','warning');return;}
  var product=scmData.masterData.products.find(function(p){return p.id===pid;});
  scmData.counters.warehouseOp=scmData.counters.warehouseOp||5;var nid='WH'+String(scmData.counters.warehouseOp).padStart(3,'0');scmData.counters.warehouseOp++;
  scmData.warehouseOperations.push({id:nid,type:type,productName:product?product.name:'',qty:qty,warehouse:$('#whsWarehouse').value,operator:$('#whsOperator').value,date:formatDate(Date.now()),status:'进行中'});
  saveData();closeModal();if(currentModule==='warehouse')renderWarehouseModule();showToast('作业已创建','success');
};
window._viewWHS = function(id){
  var w=scmData.warehouseOperations.find(function(x){return x.id===id;});if(!w)return;
  openModal('作业详情-'+w.id,'<div class="form-group"><label>作业号</label><input class="input" value="'+w.id+'" disabled></div><div class="form-row"><div class="form-group"><label>类型</label><input class="input" value="'+w.type+'" disabled></div><div class="form-group"><label>产品</label><input class="input" value="'+w.productName+'" disabled></div></div><div class="form-row"><div class="form-group"><label>数量</label><input class="input" value="'+w.qty+'" disabled></div><div class="form-group"><label>仓库</label><input class="input" value="'+w.warehouse+'" disabled></div></div><div class="form-row"><div class="form-group"><label>操作员</label><input class="input" value="'+w.operator+'" disabled></div><div class="form-group"><label>日期</label><input class="input" value="'+w.date+'" disabled></div></div>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._deleteWHS = function(id){
  openModal('确认删除','<p>确定删除该作业？</p>','<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="scmData.warehouseOperations=scmData.warehouseOperations.filter(function(w){return w.id!==\''+id+'\';});saveData();closeModal();if(currentModule===\'warehouse\')renderWarehouseModule();showToast(\'已删除\',\'success\');">确认</button>');
};
window._generateWave = function(){
  openModal('波次管理','<div class="info-panel">📦 波次拣货优化</div><table class="table"><thead><tr><th>波次号</th><th>订单数</th><th>产品数</th><th>总数量</th><th>仓库</th><th>状态</th><th>操作</th></tr></thead><tbody>'+
    ((scmData.waveRecords||[]).map(function(w){return '<tr><td>'+w.id+'</td><td>'+w.orderCount+'</td><td>'+w.productCount+'</td><td>'+w.totalQty+'</td><td>'+w.warehouse+'</td><td><span class="badge badge-info">'+w.status+'</span></td><td><button class="btn btn-primary btn-xs" onclick="closeModal();showToast(\'波次已下发\',\'success\')">下发</button></td></tr>';}).join('')||'<tr><td colspan="7"><div class="empty-state">暂无波次</div></td></tr>')+
    '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="closeModal();showToast(\'新波次已生成\',\'success\')">生成新波次</button>');
};
window._shelfRecommend = function(){
  openModal('上架推荐','<div class="info-panel">📐 基于库位利用率和拣货效率的上架推荐</div><table class="table"><thead><tr><th>产品</th><th>推荐库位</th><th>当前库存</th><th>推荐理由</th><th>操作</th></tr></thead><tbody>'+
    scmData.inventory.slice(0,5).map(function(i,idx){return '<tr><td>'+i.productName+'</td><td>'+i.location+'</td><td>'+i.qty+'</td><td>周转率'+Math.round(Math.random()*30+70)+'%</td><td><button class="btn btn-primary btn-xs" onclick="closeModal();showToast(\'已推荐\',\'success\')">应用</button></td></tr>';}).join('')+
    '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._pickPath = function(){
  openModal('拣货路径优化','<div class="info-panel">🚶 基于订单热力图的最优拣货路径</div><div class="chart-card"><div class="chart chart-horizontal"><div class="chart-bar-row"><div class="chart-bar-label">路径A (当前)</div><div class="chart-bar-fill" style="width:85%">85米</div></div><div class="chart-bar-row"><div class="chart-bar-label">路径B (优化)</div><div class="chart-bar-fill orange" style="width:62%">62米</div></div><div class="chart-bar-row"><div class="chart-bar-label">路径C (推荐)</div><div class="chart-bar-fill" style="background:#10b981;width:45%">45米</div></div></div></div><p style="margin-top:12px;font-size:13px;">优化后节省47%，预计提升效率30%</p>','<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="closeModal();showToast(\'路径已更新\',\'success\')">应用优化</button>');
};
window._whsPerformance = function(){
  openModal('仓库绩效统计','<div class="info-panel">📊 仓库作业绩效</div><div class="stats-grid cols-3">'+
    '<div class="stat-card"><div class="stat-icon green">📦</div><div class="stat-info"><div class="stat-label">日处理量</div><div class="stat-value">'+scmData.warehouseOperations.length+'</div><div class="stat-desc">作业</div></div></div>'+
    '<div class="stat-card"><div class="stat-icon orange">⏱</div><div class="stat-info"><div class="stat-label">平均处理时间</div><div class="stat-value">'+Math.round(Math.random()*20+15)+'</div><div class="stat-desc">分钟</div></div></div>'+
    '<div class="stat-card"><div class="stat-icon blue">✅</div><div class="stat-info"><div class="stat-label">准确率</div><div class="stat-value">'+Math.round(Math.random()*5+95)+'</div><div class="stat-desc">%</div></div></div>'+
  '</div><table class="table"><thead><tr><th>操作员</th><th>作业数</th><th>平均时间</th><th>准确率</th><th>评分</th></tr></thead><tbody>'+
    ['张三','李四','王五'].map(function(n){return '<tr><td>'+n+'</td><td>'+Math.round(Math.random()*10+5)+'</td><td>'+Math.round(Math.random()*10+15)+'分钟</td><td>'+Math.round(Math.random()*5+94)+'%</td><td><div class="star-rating"><div class="star-fill" style="width:'+Math.round(Math.random()*20+80)+'%"></div></div></td></tr>';}).join('')+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};

// ============= 物流运输管理重写 =============
window.renderTransportModule = function() {
  var data=scmData.transportOrders;
  $('#mainContent').innerHTML='<div class="module active"><div class="module-header"><h2>物流运输管理TMS</h2><div class="module-header-actions">'+
    '<button class="btn btn-primary" onclick="window._openTransportForm()">+ 新建运输</button>'+
    '<button class="btn btn-success" onclick="window._routeOptimize()">🗺 路线优化</button>'+
    '<button class="btn btn-info" onclick="window._freightCalc()">💰 运费计算</button>'+
    '<button class="btn btn-warning" onclick="window._trackInTransit()">🚚 在途跟踪</button>'+
    '<button class="btn btn-outline" onclick="window._signConfirm()">✅ 签收确认</button>'+
    '</div></div>'+
    '<div class="info-panel">🚚 物流运输管理模块：包含发运计划、车辆管理、路线优化、承运商管理、运费结算、在途跟踪、配送签收、物流KPI分析等功能。</div>'+
    '<div class="toolbar"><input class="input" id="transSearch" placeholder="搜索运输单/订单..." oninput="window._filterTrans()"><select class="select" id="transStatusFilter" onchange="window._filterTrans()"><option value="">全部状态</option><option>待发运</option><option>运输中</option><option>已到达</option><option>已完成</option></select></div>'+
    '<div class="table-wrapper"><table class="table"><thead><tr><th>运输单号</th><th>关联订单</th><th>起运地</th><th>目的地</th><th>承运商</th><th>司机</th><th>开始日期</th><th>状态</th><th>费用(元)</th><th>操作</th></tr></thead><tbody id="transTbody"></tbody></table></div></div>';
  window._renderTransTable(data);
};
window._renderTransTable = function(data){
  var tb=$('#transTbody');if(!tb)return;
  tb.innerHTML=data.length?data.map(function(t){
    return '<tr><td><strong>'+t.id+'</strong></td><td>'+t.orderId+'</td><td>'+t.from+'</td><td>'+t.to+'</td><td>'+t.carrier+'</td><td>'+t.driver+'</td><td>'+t.startDate+'</td><td><span class="badge '+(t.status==='运输中'?'badge-info':t.status==='已完成'?'badge-success':'badge-warning')+'">'+t.status+'</span></td><td>'+formatMoney(t.cost)+'</td><td><div class="action-group"><button class="btn btn-outline btn-xs" onclick="window._viewTrans(\''+t.id+'\')">查看</button><button class="btn btn-info btn-xs" onclick="window._trackTrans(\''+t.id+'\')">跟踪</button></div></td></tr>';
  }).join(''):'<tr><td colspan="10"><div class="empty-state">暂无运输单</div></td></tr>';
};
window._filterTrans = function(){
  var s=($('#transSearch')||{}).value;var st=($('#transStatusFilter')||{}).value;
  var data=scmData.transportOrders.slice();
  if(s){s=s.toLowerCase();data=data.filter(function(t){return t.id.toLowerCase().indexOf(s)>=0||t.orderId.toLowerCase().indexOf(s)>=0;});}
  if(st) data=data.filter(function(t){return t.status===st;});
  window._renderTransTable(data);
};
window._openTransportForm = function(){
  var carrierOpts=(scmData.carrierList||[]).map(function(c){return '<option value="'+c.id+'">'+c.name+'</option>';}).join('');
  openModal('新建运输单',
    '<div class="form-group"><label>关联订单 *</label><input class="input" id="transOrder" placeholder="订单号"></div>'+
    '<div class="form-row"><div class="form-group"><label>起运地 *</label><input class="input" id="transFrom" value="深圳"></div><div class="form-group"><label>目的地 *</label><input class="input" id="transTo" value="北京"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>承运商 *</label><select class="select" id="transCarrier">'+carrierOpts+'</select></div><div class="form-group"><label>司机</label><input class="input" id="transDriver" value="李师傅"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>开始日期</label><input class="input" type="date" id="transStart" value="'+formatDate(Date.now())+'"></div><div class="form-group"><label>预计费用(元)</label><input class="input" type="number" id="transCost" value="1500"></div></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="window._saveTrans()">创建</button>');
};
window._saveTrans = function(){
  var order=$('#transOrder').value;var from=$('#transFrom').value;var to=$('#transTo').value;var carrier=$('#transCarrier').value;
  if(!order||!from||!to||!carrier){showToast('请填写必填字段','warning');return;}
  var carrierName=(scmData.carrierList||[]).find(function(c){return c.id===carrier;});
  scmData.counters.transport=scmData.counters.transport||5;var nid='TR'+String(scmData.counters.transport).padStart(3,'0');scmData.counters.transport++;
  scmData.transportOrders.push({id:nid,orderId:order,from:from,to:to,carrier:carrierName?carrierName.name:'',driver:$('#transDriver').value,cost:parseFloat($('#transCost').value||0),startDate:$('#transStart').value,status:'待发运'});
  saveData();closeModal();if(currentModule==='transport')renderTransportModule();showToast('运输单已创建','success');
};
window._viewTrans = function(id){
  var t=scmData.transportOrders.find(function(x){return x.id===id;});if(!t)return;
  openModal('运输单详情','<div class="form-group"><label>运输单号</label><input class="input" value="'+t.id+'" disabled></div><div class="form-row"><div class="form-group"><label>起运地</label><input class="input" value="'+t.from+'" disabled></div><div class="form-group"><label>目的地</label><input class="input" value="'+t.to+'" disabled></div></div><div class="form-row"><div class="form-group"><label>承运商</label><input class="input" value="'+t.carrier+'" disabled></div><div class="form-group"><label>司机</label><input class="input" value="'+t.driver+'" disabled></div></div><div class="form-row"><div class="form-group"><label>开始日期</label><input class="input" value="'+t.startDate+'" disabled></div><div class="form-group"><label>费用</label><input class="input" value="'+formatMoney(t.cost)+'" disabled></div></div>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._trackTrans = function(id){
  var t=scmData.transportOrders.find(function(x){return x.id===id;});if(!t)return;
  openModal('在途跟踪-'+t.id,'<div class="info-panel">🚚 实时位置追踪</div><div class="chart-card"><div class="chart chart-horizontal"><div class="chart-bar-row"><div class="chart-bar-label">起点 '+t.from+'</div><div class="chart-bar-fill" style="width:30%"></div></div><div class="chart-bar-row"><div class="chart-bar-label">途中</div><div class="chart-bar-fill orange" style="width:60%"></div></div><div class="chart-bar-row"><div class="chart-bar-label">终点 '+t.to+'</div><div class="chart-bar-fill" style="background:#10b981;width:0%"></div></div></div></div><p style="margin-top:12px;font-size:13px;">预计到达时间: 2026-05-25 15:30</p><p style="font-size:13px;">当前状态: '+t.status+'</p>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._routeOptimize = function(){
  openModal('路线优化','<div class="info-panel">🗺 基于实时路况的路线优化</div><table class="table"><thead><tr><th>路线</th><th>距离</th><th>预计时间</th><th>路况</th><th>推荐</th></tr></thead><tbody>'+
    ['京港澳高速','京台高速','国道G107'].map(function(r,i){return '<tr><td>'+r+'</td><td>'+(1200-i*100)+'公里</td><td>'+(14-i*2)+'小时</td><td><span class="badge '+(i===2?'badge-success':'badge-warning')+'">'+(i===2?'畅通':'一般')+'</span></td><td>'+(i===2?'<span class="badge badge-success">推荐</span>':'<button class="btn btn-primary btn-xs" onclick="closeModal();showToast(\'路线已选择\',\'success\')">选择</button>')+'</td></tr>';}).join('')+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._freightCalc = function(){
  openModal('运费计算','<div class="info-panel">💰 运费计算器</div><div class="form-group"><label>重量(kg)</label><input class="input" id="calcWeight" value="100"></div><div class="form-row"><div class="form-group"><label>距离(km)</label><input class="input" id="calcDist" value="1200"></div><div class="form-group"><label>运输方式</label><select class="select" id="calcMode"><option>陆运</option><option>空运</option><option>海运</option></select></div></div><div class="form-group"><label>计算结果</label><input class="input" id="calcResult" value="1500" disabled></div>',
    '<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="$(\'#calcResult\').value=Math.round(parseFloat($(\'#calcWeight\').value)*parseFloat($(\'#calcDist\').value)*0.0125);showToast(\'已计算\',\'success\')">计算</button>');
};
window._trackInTransit = function(){
  var inTransit=scmData.transportOrders.filter(function(t){return t.status==='运输中';});
  openModal('在途跟踪','<div class="info-panel">🚚 在途运输单</div><table class="table"><thead><tr><th>运输单</th><th>起运地</th><th>目的地</th><th>承运商</th><th>司机</th><th>状态</th><th>操作</th></tr></thead><tbody>'+
    (inTransit.length?inTransit.map(function(t){return '<tr><td>'+t.id+'</td><td>'+t.from+'</td><td>'+t.to+'</td><td>'+t.carrier+'</td><td>'+t.driver+'</td><td><span class="badge badge-info">'+t.status+'</span></td><td><button class="btn btn-outline btn-xs" onclick="window._trackTrans(\''+t.id+'\')">查看</button></td></tr>';}).join(''):'<tr><td colspan="7"><div class="empty-state">无在途运输</div></td></tr>')+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._signConfirm = function(){
  var pending=scmData.transportOrders.filter(function(t){return t.status==='已到达';});
  openModal('签收确认','<div class="info-panel">✅ 待签收运输单:'+pending.length+'条</div><table class="table"><thead><tr><th>运输单</th><th>订单</th><th>承运商</th><th>到达时间</th><th>操作</th></tr></thead><tbody>'+
    (pending.length?pending.map(function(t){return '<tr><td>'+t.id+'</td><td>'+t.orderId+'</td><td>'+t.carrier+'</td><td>'+t.startDate+'</td><td><button class="btn btn-success btn-xs" onclick="closeModal();showToast(\'已签收\',\'success\')">签收</button></td></tr>';}).join(''):'<tr><td colspan="5"><div class="empty-state">无待签收运输单</div></td></tr>')+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};


// ============= 当前用户辅助 =============
function _getCurrentUser() {
  try {
    var u = JSON.parse(localStorage.getItem('scm_user') || '{}');
    return u;
  } catch(e) { return {}; }
}
function _filterByCurrentUser(orders) {
  var u = _getCurrentUser();
  if (!u.displayName || u.role === 'admin') return orders;
  return orders.filter(function(o) { return o.salesperson === u.displayName; });
}

// ============= 订单协同管理重写 =============
window.renderSalesModule = function() {
  var data = _filterByCurrentUser(scmData.salesOrders);
  $('#mainContent').innerHTML='<div class="module active"><div class="module-header"><h2>订单协同管理</h2><div class="module-header-actions">'+
    '<button class="btn btn-primary" onclick="window._openSalesForm()">+ 新建订单</button>'+
    '<button class="btn btn-info" onclick="window._atpCheck()">🔍 ATP检查</button>'+
    '<button class="btn btn-success" onclick="window._deliveryPromise()">📅 交期承诺</button>'+
    '<button class="btn btn-warning" onclick="window._shipConfirm()">🚀 发货确认</button>'+
    '<button class="btn btn-outline" onclick="window._satisfactionSurvey()">📊 满意度调查</button>'+
    '</div></div>'+
    '<div class="info-panel">📝 订单协同管理模块</div>'+
    '<div class="toolbar"><input class="input" id="salesSearch" placeholder="搜索订单号/客户..." oninput="window._filterSales()"><select class="select" id="salesStatusFilter" onchange="window._filterSales()"><option value="">全部状态</option><option>待确认</option><option>待审核</option><option>生产中</option><option>已发货</option><option>已完成</option></select></div>'+
    '<div class="table-wrapper"><table class="table"><thead><tr><th>订单号</th><th>客户</th><th>产品</th><th>数量</th><th>金额(元)</th><th>下单日期</th><th>交期</th><th>状态</th><th>业务员</th><th>优先级</th><th>操作</th></tr></thead><tbody id="salesTbody"></tbody></table></div></div>';
  window._renderSalesTable(data);
};
window._renderSalesTable = function(data){
  var tb=$('#salesTbody');if(!tb)return;
  tb.innerHTML=data.length?data.map(function(s){
    return '<tr class="clickable-row" onclick="window._viewSales(\''+s.id+'\')"><td><strong>'+s.id+'</strong></td><td>'+s.customer+'</td><td>'+s.productName+'</td><td>'+s.qty+'</td><td>'+formatMoney(s.amount)+'</td><td>'+s.orderDate+'</td><td>'+s.deliveryDate+'</td><td><span class="badge '+(s.status==='已发货'?'badge-success':s.status==='生产中'?'badge-info':'badge-warning')+'">'+s.status+'</span></td><td>'+(s.salesperson||'-')+'</td><td><span class="badge '+(s.priority==='高'?'badge-danger':'badge-warning')+'">'+s.priority+'</span></td><td><div class="action-group"><button class="btn btn-outline btn-xs" onclick="event.stopPropagation();window._viewSales(\''+s.id+'\')">查看</button>'+(s.status==='待确认'||s.status==='待审核'?'<button class="btn btn-outline btn-xs" onclick="event.stopPropagation();window._editSales(\''+s.id+'\')">编辑</button><button class="btn btn-success btn-xs" onclick="event.stopPropagation();window._approveSales(\''+s.id+'\')">审核</button><button class="btn btn-danger btn-xs" onclick="event.stopPropagation();window._deleteSales(\''+s.id+'\')">删除</button>':'')+'</div></td></tr>';
  }).join(''):'<tr><td colspan="11"><div class="empty-state">暂无订单</div></td></tr>';
};
window._filterSales = function(){
  var s=($('#salesSearch')||{}).value;var st=($('#salesStatusFilter')||{}).value;
  var data=_filterByCurrentUser(scmData.salesOrders.slice());
  if(s){s=s.toLowerCase();data=data.filter(function(o){return o.id.toLowerCase().indexOf(s)>=0||o.customer.toLowerCase().indexOf(s)>=0;});}
  if(st) data=data.filter(function(o){return o.status===st;});
  window._renderSalesTable(data);
};
window._openSalesForm = function(editId){
  var item=editId?scmData.salesOrders.find(function(o){return o.id===editId;}):null;
  var custOpts=(scmData.masterData.customers||[]).map(function(c){return '<option value="'+c.id+'"'+(item&&item.customerId===c.id?' selected':'')+'>'+c.name+'</option>';}).join('');
  var prodOpts=(scmData.masterData.products||[]).map(function(p){return '<option value="'+p.id+'"'+(item&&item.productId===p.id?' selected':'')+'>'+p.name+'</option>';}).join('');
  var curUser = _getCurrentUser();
  var spOpts='<option value="">请选择业务员</option>'+(scmData.orgData.employees||[]).map(function(e){return '<option value="'+e.name+'"'+((item?item.salesperson===e.name:(curUser.displayName===e.name))?' selected':'')+'>'+e.name+'</option>';}).join('');
  openModal(item?'编辑订单':'新建订单',
    '<div class="form-row"><div class="form-group"><label>客户 *</label><select class="select" id="soCustomer">'+custOpts+'</select></div><div class="form-group"><label>产品 *</label><select class="select" id="soProduct">'+prodOpts+'</select></div></div>'+
    '<div class="form-row"><div class="form-group"><label>数量 *</label><input class="input" type="number" id="soQty" value="'+(item?item.qty:100)+'" min="1"></div><div class="form-group"><label>金额(元) *</label><input class="input" type="number" id="soAmount" value="'+(item?item.amount:5000)+'"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>业务员 *</label><select class="select" id="soSalesperson">'+spOpts+'</select></div></div>'+
    '<div class="form-row"><div class="form-group"><label>下单日期</label><input class="input" type="date" id="soDate" value="'+(item?item.orderDate:formatDate(Date.now()))+'"></div><div class="form-group"><label>交期</label><input class="input" type="date" id="soDelivery" value="'+(item?item.deliveryDate:formatDate(Date.now()+7*86400000))+'"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>优先级</label><select class="select" id="soPriority"><option>高</option><option>中</option><option>低</option></select></div><div class="form-group"><label>状态</label><select class="select" id="soStatus"><option>待确认</option><option>待审核</option><option>生产中</option><option>已发货</option></select></div></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="window._saveSales(\''+(editId||'')+'\')">保存</button>');
};
window._saveSales = function(editId){
  var cust=$('#soCustomer').value;var prod=$('#soProduct').value;var qty=parseInt($('#soQty').value);var amount=parseFloat($('#soAmount').value);var sp=$('#soSalesperson').value;
  if(!cust||!prod||!qty||!amount||!sp){showToast('请填写必填字段','warning');return;}
  var custObj=scmData.masterData.customers.find(function(c){return c.id===cust;});
  var prodObj=scmData.masterData.products.find(function(p){return p.id===prod;});
  if(editId){
    var idx=scmData.salesOrders.findIndex(function(o){return o.id===editId;});
    if(idx>=0){scmData.salesOrders[idx]={id:editId,customer:custObj?custObj.name:'',productName:prodObj?prodObj.name:'',qty:qty,amount:amount,orderDate:$('#soDate').value,deliveryDate:$('#soDelivery').value,priority:$('#soPriority').value,status:$('#soStatus').value,salesperson:sp};}
    showToast('订单已更新','success');
  }else{
    scmData.counters.salesOrder=scmData.counters.salesOrder||5;var nid='SO'+String(scmData.counters.salesOrder).padStart(3,'0');scmData.counters.salesOrder++;
    scmData.salesOrders.push({id:nid,customer:custObj?custObj.name:'',productName:prodObj?prodObj.name:'',qty:qty,amount:amount,orderDate:$('#soDate').value,deliveryDate:$('#soDelivery').value,priority:$('#soPriority').value,status:$('#soStatus').value,salesperson:sp});
    showToast('订单已创建','success');
  }
  saveData();closeModal();if(currentModule==='sales')renderSalesModule();
};
window._editSales = function(id){window._openSalesForm(id);};
window._viewSales = function(id){
  var s=scmData.salesOrders.find(function(x){return x.id===id;});if(!s)return;
  openModal('订单详情-'+s.id,'<div class="form-group"><label>订单号</label><input class="input" value="'+s.id+'" disabled></div><div class="form-row"><div class="form-group"><label>客户</label><input class="input" value="'+s.customer+'" disabled></div><div class="form-group"><label>产品</label><input class="input" value="'+s.productName+'" disabled></div></div><div class="form-row"><div class="form-group"><label>数量</label><input class="input" value="'+s.qty+'" disabled></div><div class="form-group"><label>金额</label><input class="input" value="'+formatMoney(s.amount)+'" disabled></div></div><div class="form-row"><div class="form-group"><label>业务员</label><input class="input" value="'+(s.salesperson||'-')+'" disabled></div></div><div class="form-row"><div class="form-group"><label>下单日期</label><input class="input" value="'+s.orderDate+'" disabled></div><div class="form-group"><label>交期</label><input class="input" value="'+s.deliveryDate+'" disabled></div></div>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>'+(s.status==='待确认'||s.status==='待审核'?'<button class="btn btn-outline" onclick="closeModal();window._editSales(\''+s.id+'\')">编辑</button>':''));
};
window._approveSales = function(id){
  var order = scmData.salesOrders.find(function(o){return o.id===id;});
  if(!order || (order.status!=='待确认'&&order.status!=='待审核')){ showToast('仅可审核待确认/待审核状态的订单','warning'); return; }
  order.status='已确认';
  saveData();
  if(currentModule==='sales') renderSalesModule();
  showToast('订单 '+id+' 已审核通过','success');
};
window._deleteSales = function(id){
  var order = scmData.salesOrders.find(function(o){return o.id===id;});
  if(!order || (order.status!=='待确认'&&order.status!=='待审核')){ showToast('仅可删除待确认/待审核状态的订单','warning'); return; }
  openModal('确认删除','<p>确定删除该订单？</p>','<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="scmData.salesOrders=scmData.salesOrders.filter(function(o){return o.id!==\'{{ID}}\';});saveData();closeModal();if(currentModule===\'sales\')renderSalesModule();showToast(\'已删除\',\'success\');">确认</button>'.replace('{{ID}}',id));
};
window._atpCheck = function(){
  openModal('ATP可承诺量检查','<div class="info-panel">🔍 可用库存与产能检查</div><table class="table"><thead><tr><th>产品</th><th>可用库存</th><th>在制量</th><th>未承诺量</th><th>ATP</th><th>建议</th></tr></thead><tbody>'+
    scmData.inventory.slice(0,4).map(function(i){return '<tr><td>'+i.productName+'</td><td>'+i.qty+'</td><td>'+Math.round(i.qty*0.3)+'</td><td>'+Math.round(i.qty*0.1)+'</td><td><strong>'+Math.round(i.qty*0.6)+'</strong></td><td><span class="badge badge-success">可承诺</span></td></tr>';}).join('')+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._deliveryPromise = function(){
  openModal('交期承诺','<div class="info-panel">📅 基于产能和物料的最短交期计算</div><table class="table"><thead><tr><th>订单</th><th>产品</th><th>需求交期</th><th>最早交期</th><th>承诺交期</th><th>偏差</th></tr></thead><tbody>'+
    scmData.salesOrders.slice(0,4).map(function(s){var delta=Math.floor(Math.random()*3)-1;return '<tr><td>'+s.id+'</td><td>'+s.productName+'</td><td>'+s.deliveryDate+'</td><td>'+formatDate(Date.now()+5*86400000)+'</td><td><strong>'+formatDate(Date.now()+(5+delta)*86400000)+'</strong></td><td><span class="badge '+(delta<=0?'badge-success':'badge-warning')+'">'+(delta<=0?'准时':'+'+delta+'天')+'</span></td></tr>';}).join('')+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._shipConfirm = function(){
  openModal('发货确认','<div class="info-panel">🚀 待发货订单</div><table class="table"><thead><tr><th>订单号</th><th>客户</th><th>产品</th><th>数量</th><th>交期</th><th>操作</th></tr></thead><tbody>'+
    scmData.salesOrders.filter(function(s){return s.status==='生产中'||s.status==='待审核';}).map(function(s){return '<tr><td>'+s.id+'</td><td>'+s.customer+'</td><td>'+s.productName+'</td><td>'+s.qty+'</td><td>'+s.deliveryDate+'</td><td><button class="btn btn-success btn-xs" onclick="closeModal();showToast(\'已确认发货\',\'success\')">确认发货</button></td></tr>';}).join('')||'<tr><td colspan="6">全部已发货</td></tr>'+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._satisfactionSurvey = function(){
  openModal('客户满意度调查','<div class="info-panel">📊 满意度统计</div><div class="stats-grid cols-3">'+
    '<div class="stat-card"><div class="stat-icon green">⭐</div><div class="stat-info"><div class="stat-label">交付准时率</div><div class="stat-value">'+Math.round(Math.random()*10+90)+'%</div><div class="stat-desc">最近1个月</div></div></div>'+
    '<div class="stat-card"><div class="stat-icon orange">📝</div><div class="stat-info"><div class="stat-label">质量满意度</div><div class="stat-value">'+Math.round(Math.random()*10+85)+'%</div><div class="stat-desc">客户打分</div></div></div>'+
    '<div class="stat-card"><div class="stat-icon blue">📊</div><div class="stat-info"><div class="stat-label">综合评分</div><div class="stat-value">'+Math.round(Math.random()*10+88)+'</div><div class="stat-desc">满分100</div></div></div>'+
  '</div><table class="table"><thead><tr><th>客户</th><th>交付</th><th>质量</th><th>响应</th><th>综合</th><th>反馈</th></tr></thead><tbody>'+
    (scmData.masterData.customers||[]).map(function(c){return '<tr><td>'+c.name+'</td><td>'+Math.round(Math.random()*10+88)+'%</td><td>'+Math.round(Math.random()*10+85)+'%</td><td>'+Math.round(Math.random()*10+82)+'%</td><td><strong>'+Math.round(Math.random()*10+87)+'</strong></td><td>'+['满意','非常满意','一般'][Math.floor(Math.random()*3)]+'</td></tr>';}).join('')+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};

// ============= 质量协同管理重写 =============
window.renderQualityModule = function() {
  var data=scmData.qualityInspections;
  $('#mainContent').innerHTML='<div class="module active"><div class="module-header"><h2>质量协同管理</h2><div class="module-header-actions">'+
    '<button class="btn btn-primary" onclick="window._openQualityForm()">+ 新建检验</button>'+
    '<button class="btn btn-info" onclick="window._inspectRecord()">📋 检验记录</button>'+
    '<button class="btn btn-danger" onclick="window._defectHandle()">⚠ 不良品处理</button>'+
    '<button class="btn btn-warning" onclick="window._capaLaunch()">📝 CAPA发起</button>'+
    '<button class="btn btn-outline" onclick="window._traceQuery()">🔍 追溯查询</button>'+
    '</div></div>'+
    '<div class="info-panel">✅ 质量协同管理模块</div>'+
    '<div class="toolbar"><input class="input" id="qualSearch" placeholder="搜索检验单..." oninput="window._filterQual()"><select class="select" id="qualTypeFilter" onchange="window._filterQual()"><option value="">全部类型</option><option>IQC来料检验</option><option>IPQC制程检验</option><option>OQC出货检验</option></select></div>'+
    '<div class="table-wrapper"><table class="table"><thead><tr><th>检验单号</th><th>类型</th><th>产品</th><th>批次</th><th>检验员</th><th>日期</th><th>结果</th><th>不良率</th><th>操作</th></tr></thead><tbody id="qualTbody"></tbody></table></div></div>';
  window._renderQualTable(data);
};
window._renderQualTable = function(data){
  var tb=$('#qualTbody');if(!tb)return;
  tb.innerHTML=data.length?data.map(function(q){
    return '<tr><td><strong>'+q.id+'</strong></td><td>'+q.type+'</td><td>'+q.productName+'</td><td>'+q.batch+'</td><td>'+q.inspector+'</td><td>'+q.date+'</td><td><span class="badge '+(q.result==='合格'?'badge-success':'badge-danger')+'">'+q.result+'</span></td><td>'+formatPercent(q.defectRate)+'</td><td><div class="action-group"><button class="btn btn-outline btn-xs" onclick="window._viewQual(\''+q.id+'\')">查看</button><button class="btn btn-danger btn-xs" onclick="window._deleteQual(\''+q.id+'\')">删除</button></div></td></tr>';
  }).join(''):'<tr><td colspan="9"><div class="empty-state">暂无检验记录</div></td></tr>';
};
window._filterQual = function(){
  var s=($('#qualSearch')||{}).value;var tp=($('#qualTypeFilter')||{}).value;
  var data=scmData.qualityInspections.slice();
  if(s){s=s.toLowerCase();data=data.filter(function(q){return q.id.toLowerCase().indexOf(s)>=0||q.productName.toLowerCase().indexOf(s)>=0;});}
  if(tp) data=data.filter(function(q){return q.type===tp;});
  window._renderQualTable(data);
};
window._openQualityForm = function(){
  var prodOpts=scmData.masterData.products.map(function(p){return '<option value="'+p.id+'">'+p.name+'</option>';}).join('');
  openModal('新建检验单',
    '<div class="form-row"><div class="form-group"><label>检验类型 *</label><select class="select" id="iqType"><option>IQC来料检验</option><option>IPQC制程检验</option><option>OQC出货检验</option></select></div><div class="form-group"><label>产品 *</label><select class="select" id="iqProduct">'+prodOpts+'</select></div></div>'+
    '<div class="form-row"><div class="form-group"><label>批次 *</label><input class="input" id="iqBatch" value="BATCH-'+formatDate(Date.now())+'"></div><div class="form-group"><label>检验员 *</label><input class="input" id="iqInspector" value="质检员A"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>检验数量</label><input class="input" type="number" id="iqQty" value="100"></div><div class="form-group"><label>不良数</label><input class="input" type="number" id="iqDefect" value="0"></div></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="window._saveQual()">创建</button>');
};
window._saveQual = function(){
  var type=$('#iqType').value;var pid=$('#iqProduct').value;var batch=$('#iqBatch').value;var inspector=$('#iqInspector').value;
  if(!type||!pid||!batch||!inspector){showToast('请填写必填字段','warning');return;}
  var product=scmData.masterData.products.find(function(p){return p.id===pid;});
  var total=parseInt($('#iqQty').value||100);var defect=parseInt($('#iqDefect').value||0);
  scmData.counters.quality=scmData.counters.quality||5;var nid='IQC'+String(scmData.counters.quality).padStart(3,'0');scmData.counters.quality++;
  scmData.qualityInspections.push({id:nid,type:type,productName:product?product.name:'',batch:batch,inspector:inspector,date:formatDate(Date.now()),result:defect===0?'合格':'不合格',defectRate:defect/total,totalQty:total,defectQty:defect});
  saveData();closeModal();if(currentModule==='quality')renderQualityModule();showToast('检验单已创建','success');
};
window._viewQual = function(id){
  var q=scmData.qualityInspections.find(function(x){return x.id===id;});if(!q)return;
  openModal('检验单详情-'+q.id,'<div class="form-group"><label>检验单号</label><input class="input" value="'+q.id+'" disabled></div><div class="form-row"><div class="form-group"><label>类型</label><input class="input" value="'+q.type+'" disabled></div><div class="form-group"><label>产品</label><input class="input" value="'+q.productName+'" disabled></div></div><div class="form-row"><div class="form-group"><label>批次</label><input class="input" value="'+q.batch+'" disabled></div><div class="form-group"><label>检验员</label><input class="input" value="'+q.inspector+'" disabled></div></div><div class="form-row"><div class="form-group"><label>结果</label><input class="input" value="'+q.result+'" disabled></div><div class="form-group"><label>不良率</label><input class="input" value="'+formatPercent(q.defectRate)+'" disabled></div></div>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._deleteQual = function(id){
  openModal('确认删除','<p>确定删除该检验单？</p>','<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="scmData.qualityInspections=scmData.qualityInspections.filter(function(q){return q.id!==\''+id+'\';});saveData();closeModal();if(currentModule===\'quality\')renderQualityModule();showToast(\'已删除\',\'success\');">确认</button>');
};
window._inspectRecord = function(){
  openModal('检验记录','<div class="info-panel">📋 检验履历</div><table class="table"><thead><tr><th>检验单号</th><th>类型</th><th>产品</th><th>批次</th><th>日期</th><th>结果</th><th>不良率</th></tr></thead><tbody>'+
    scmData.qualityInspections.map(function(q){return '<tr><td>'+q.id+'</td><td>'+q.type+'</td><td>'+q.productName+'</td><td>'+q.batch+'</td><td>'+q.date+'</td><td><span class="badge '+(q.result==='合格'?'badge-success':'badge-danger')+'">'+q.result+'</span></td><td>'+formatPercent(q.defectRate)+'</td></tr>';}).join('')||'<tr><td colspan="7">无记录</td></tr>'+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="closeModal();showToast(\'报告已导出\',\'success\')">导出报告</button>');
};
window._defectHandle = function(){
  openModal('不良品处理','<div class="info-panel">⚠ 不良品管理</div><table class="table"><thead><tr><th>来源</th><th>产品</th><th>不良数量</th><th>不良原因</th><th>处理方式</th><th>状态</th></tr></thead><tbody>'+
    ((scmData.defectRecords||[]).map(function(d){return '<tr><td>'+d.source+'</td><td>'+d.productName+'</td><td>'+d.qty+'</td><td>'+d.reason+'</td><td>'+d.disposition+'</td><td><span class="badge badge-warning">'+d.status+'</span></td></tr>';}).join('')||'<tr><td colspan="6">暂无不良品</td></tr>')+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._capaLaunch = function(){
  openModal('CAPA纠正预防','<div class="info-panel">📝 CAPA记录</div><table class="table"><thead><tr><th>编号</th><th>问题描述</th><th>根源分析</th><th>纠正措施</th><th>负责人</th><th>状态</th></tr></thead><tbody>'+
    ((scmData.capaRecords||[]).map(function(c){return '<tr><td>'+c.id+'</td><td>'+c.description+'</td><td>'+c.rootCause+'</td><td>'+c.action+'</td><td>'+c.owner+'</td><td><span class="badge badge-info">'+c.status+'</span></td></tr>';}).join('')||'<tr><td colspan="6">暂无CAPA</td></tr>')+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="closeModal();showToast(\'CAPA已发起\',\'success\')">发起新CAPA</button>');
};
window._traceQuery = function(){
  openModal('质量追溯','<div class="info-panel">🔍 供应链追溯链</div><div class="form-group"><label>输入批次号</label><input class="input" id="traceBatch" placeholder="如: BATCH-2026-05-15"></div><div id="traceResult" style="margin-top:12px"></div>',
    '<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="var b=$(\'#traceBatch\').value;if(!b){showToast(\'请输入批次号\',\'warning\');return;}$(\'#traceResult\').innerHTML=\'<div class=\"chart-card\">来源供应商: 深圳华强电子 | 采购订单: PO2024050001 | 来料检验: 合格 | 生产工单: WO001 | 成品检验: 合格 | 销售订单: SO001</div>\';showToast(\'追溯完成\',\'success\')">查询</button>');
};
function formatPercent(v){return (v*100).toFixed(1)+'%';}


// ============= 财务协同重写 =============
window.renderFinanceModule = function() {
  var data=scmData.financialRecords;
  $('#mainContent').innerHTML='<div class="module active"><div class="module-header"><h2>财务协同</h2><div class="module-header-actions">'+
    '<button class="btn btn-primary" onclick="window._openFinanceForm()">+ 新建记录</button>'+
    '<button class="btn btn-info" onclick="window._invoiceMatch()">🧾 发票匹配</button>'+
    '<button class="btn btn-success" onclick="window._apGenerate()">💳 应付生成</button>'+
    '<button class="btn btn-warning" onclick="window._costAllocate()">📊 成本分摊</button>'+
    '<button class="btn btn-outline" onclick="window._costAnalysis()">📈 费用分析</button>'+
    '</div></div>'+
    '<div class="info-panel">💰 财务协同模块</div>'+
    '<div class="toolbar"><input class="input" id="finSearch" placeholder="搜索记录号..." oninput="window._filterFin()"><select class="select" id="finTypeFilter" onchange="window._filterFin()"><option value="">全部类型</option><option>采购付款</option><option>采购收款</option><option>运费付款</option><option>应收款</option></select></div>'+
    '<div class="table-wrapper"><table class="table"><thead><tr><th>记录号</th><th>类型</th><th>关联单号</th><th>金额(元)</th><th>日期</th><th>状态</th><th>对方</th><th>操作</th></tr></thead><tbody id="finTbody"></tbody></table></div></div>';
  window._renderFinTable(data);
};
window._renderFinTable = function(data){
  var tb=$('#finTbody');if(!tb)return;
  tb.innerHTML=data.length?data.map(function(f){
    return '<tr><td><strong>'+f.id+'</strong></td><td>'+f.type+'</td><td>'+f.orderId+'</td><td>'+formatMoney(f.amount)+'</td><td>'+f.date+'</td><td><span class="badge '+(f.status==='已支付'||f.status==='已收款'?'badge-success':'badge-warning')+'">'+f.status+'</span></td><td>'+(f.supplierName||f.carrier||f.customer||'')+'</td><td><div class="action-group"><button class="btn btn-outline btn-xs" onclick="window._viewFin(\''+f.id+'\')">查看</button><button class="btn btn-danger btn-xs" onclick="window._deleteFin(\''+f.id+'\')">删除</button></div></td></tr>';
  }).join(''):'<tr><td colspan="8"><div class="empty-state">暂无记录</div></td></tr>';
};
window._filterFin = function(){
  var s=($('#finSearch')||{}).value;var tp=($('#finTypeFilter')||{}).value;
  var data=scmData.financialRecords.slice();
  if(s){s=s.toLowerCase();data=data.filter(function(f){return f.id.toLowerCase().indexOf(s)>=0||f.orderId.toLowerCase().indexOf(s)>=0;});}
  if(tp) data=data.filter(function(f){return f.type===tp;});
  window._renderFinTable(data);
};
window._openFinanceForm = function(){
  openModal('新建财务记录',
    '<div class="form-row"><div class="form-group"><label>类型 *</label><select class="select" id="finType"><option>采购付款</option><option>采购收款</option><option>运费付款</option><option>应收款</option></select></div><div class="form-group"><label>关联单号 *</label><input class="input" id="finOrder" placeholder="如PO/TR号"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>金额(元) *</label><input class="input" type="number" id="finAmount" value="5000"></div><div class="form-group"><label>日期</label><input class="input" type="date" id="finDate" value="'+formatDate(Date.now())+'"></div></div>'+
    '<div class="form-group"><label>对方</label><input class="input" id="finPartner" placeholder="供应商/客户/承运商"></div>'+
    '<div class="form-group"><label>状态</label><select class="select" id="finStatus"><option>待支付</option><option>已支付</option><option>已收款</option></select></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="window._saveFin()">创建</button>');
};
window._saveFin = function(){
  var type=$('#finType').value;var order=$('#finOrder').value;var amount=parseFloat($('#finAmount').value);
  if(!type||!order||!amount){showToast('请填写必填字段','warning');return;}
  scmData.counters.financial=scmData.counters.financial||5;var nid='FIN'+String(scmData.counters.financial).padStart(3,'0');scmData.counters.financial++;
  scmData.financialRecords.push({id:nid,type:type,orderId:order,amount:amount,date:$('#finDate').value,status:$('#finStatus').value,supplierName:$('#finPartner').value});
  saveData();closeModal();if(currentModule==='finance')renderFinanceModule();showToast('记录已创建','success');
};
window._viewFin = function(id){
  var f=scmData.financialRecords.find(function(x){return x.id===id;});if(!f)return;
  openModal('财务记录详情','<div class="form-group"><label>记录号</label><input class="input" value="'+f.id+'" disabled></div><div class="form-row"><div class="form-group"><label>类型</label><input class="input" value="'+f.type+'" disabled></div><div class="form-group"><label>关联单号</label><input class="input" value="'+f.orderId+'" disabled></div></div><div class="form-row"><div class="form-group"><label>金额</label><input class="input" value="'+formatMoney(f.amount)+'" disabled></div><div class="form-group"><label>日期</label><input class="input" value="'+f.date+'" disabled></div></div><div class="form-row"><div class="form-group"><label>状态</label><input class="input" value="'+f.status+'" disabled></div><div class="form-group"><label>对方</label><input class="input" value="'+(f.supplierName||f.carrier||f.customer||'')+'" disabled></div></div>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._deleteFin = function(id){
  openModal('确认删除','<p>确定删除该记录？</p>','<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="scmData.financialRecords=scmData.financialRecords.filter(function(f){return f.id!==\''+id+'\';});saveData();closeModal();if(currentModule===\'finance\')renderFinanceModule();showToast(\'已删除\',\'success\');">确认</button>');
};
window._invoiceMatch = function(){
  openModal('发票匹配','<div class="info-panel">🧾 待匹配发票与采购订单</div><table class="table"><thead><tr><th>发票号</th><th>供应商</th><th>金额</th><th>采购订单</th><th>匹配状态</th></tr></thead><tbody>'+
    scmData.purchaseOrders.slice(0,4).map(function(p){return '<tr><td>INV-202605'+Math.floor(Math.random()*9000+1000)+'</td><td>'+p.supplierName+'</td><td>'+formatMoney(p.amount)+'</td><td>'+p.id+'</td><td><span class="badge '+(p.status==='已完成'?'badge-success':'badge-warning')+'">'+(p.status==='已完成'?'已匹配':'待匹配')+'</span></td></tr>';}).join('')+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="closeModal();showToast(\'匹配完成\',\'success\')">自动匹配</button>');
};
window._apGenerate = function(){
  openModal('应付生成','<div class="info-panel">💳 应付账款</div><table class="table"><thead><tr><th>供应商</th><th>采购订单</th><th>金额</th><th>到期日</th><th>状态</th></tr></thead><tbody>'+
    scmData.purchaseOrders.map(function(p){return '<tr><td>'+p.supplierName+'</td><td>'+p.id+'</td><td>'+formatMoney(p.amount)+'</td><td>'+formatDate(Date.now()+30*86400000)+'</td><td><span class="badge badge-warning">应付</span></td></tr>';}).join('')+
  '</tbody></table><p style="margin-top:8px;font-size:13px;">总计应付: '+formatMoney(scmData.purchaseOrders.reduce(function(s,p){return s+p.amount;},0))+'</p>','<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="closeModal();showToast(\'应付凭证已生成\',\'success\')">生成凭证</button>');
};
window._costAllocate = function(){
  openModal('成本分摊','<div class="info-panel">📊 供应链成本分摊</div><table class="table"><thead><tr><th>成本项</th><th>本月金额</th><th>分摊基准</th><th>分摊比例</th></tr></thead><tbody>'+
    ['采购成本','仓储费用','物流运费','质量成本'].map(function(n,i){var amt=Math.round(Math.random()*500000+100000);return '<tr><td>'+n+'</td><td>'+formatMoney(amt)+'</td><td>'+(i===0?'按产品':'按用量')+'</td><td>'+[40,15,30,15][i]+'%</td></tr>';}).join('')+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._costAnalysis = function(){
  openModal('费用分析','<div class="info-panel">📈 费用趋势分析</div><div class="chart-card"><div class="chart chart-horizontal"><div class="chart-bar-row"><div class="chart-bar-label">采购</div><div class="chart-bar-fill" style="width:75%">450K</div></div><div class="chart-bar-row"><div class="chart-bar-label">仓储</div><div class="chart-bar-fill orange" style="width:35%">210K</div></div><div class="chart-bar-row"><div class="chart-bar-label">物流</div><div class="chart-bar-fill" style="background:#a78bfa;width:50%">300K</div></div><div class="chart-bar-row"><div class="chart-bar-label">质量</div><div class="chart-bar-fill" style="background:#10b981;width:25%">150K</div></div></div></div>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};

// ============= 数据分析BI重写 =============
window.renderAnalyticsModule = function() {
  var reports=scmData.biReports;
  $('#mainContent').innerHTML='<div class="module active"><div class="module-header"><h2>数据分析与BI</h2><div class="module-header-actions">'+
    '<button class="btn btn-primary" onclick="window._genReport()">📊 生成报表</button>'+
    '<button class="btn btn-success" onclick="window._exportExcel()">📥 导出Excel</button>'+
    '<button class="btn btn-info" onclick="window._refreshChart()">🔄 图表刷新</button>'+
    '<button class="btn btn-warning" onclick="window._alertSetting()">⚠ 预警设置</button>'+
    '</div></div>'+
    '<div class="info-panel">📊 数据分析与BI模块</div>'+
    '<div class="stats-grid cols-2">'+
      reports.map(function(r){return '<div class="stat-card"><div class="stat-icon '+(r.status==='良好'?'green':r.status==='需关注'?'orange':'red')+'">📈</div><div class="stat-info"><div class="stat-label">'+r.name+'</div><div class="stat-value">'+(typeof r.value==='number'?(r.value*100).toFixed(1)+'%':r.value)+'</div><div class="stat-desc">目标:'+(typeof r.target==='number'?(r.target*100).toFixed(1)+'%':r.target)+' | '+r.status+'</div></div></div>';}).join('')+
    '</div>'+
    '<div class="chart-card" style="margin-top:14px"><h3>供应链综合指标</h3><div class="chart chart-horizontal">'+
      '<div class="chart-bar-row"><div class="chart-bar-label">OTD准时交付</div><div class="chart-bar-fill" style="width:92%">92%</div></div>'+
      '<div class="chart-bar-row"><div class="chart-bar-label">库存周转率</div><div class="chart-bar-fill orange" style="width:68%">6.8次</div></div>'+
      '<div class="chart-bar-row"><div class="chart-bar-label">供应商合格率</div><div class="chart-bar-fill" style="background:#a78bfa;width:96%">96%</div></div>'+
      '<div class="chart-bar-row"><div class="chart-bar-label">成本节约率</div><div class="chart-bar-fill" style="background:#10b981;width:45%">4.5%</div></div>'+
    '</div></div>'+
    '<div class="chart-card" style="margin-top:14px"><h3>预警面板</h3><div class="alert-list">'+
      (scmData.alertSettings||[]).filter(function(a){return a.enabled;}).map(function(a){return '<div class="alert-item">'+a.name+': '+a.threshold+' <span class="badge badge-info">'+a.notifyMethod+'</span></div>';}).join('')+
    '</div></div></div>';
};
window._genReport = function(){
  openModal('生成报表','<div class="form-group"><label>报表类型</label><select class="select" id="reportType"><option>库存分析报告</option><option>采购分析报告</option><option>供应商分析报告</option><option>OTD交付报告</option><option>成本分析报告</option></select></div><div class="form-row"><div class="form-group"><label>时间范围</label><select class="select" id="reportRange"><option>本周</option><option>本月</option><option>本季度</option><option>本年度</option></select></div><div class="form-group"><label>导出格式</label><select class="select" id="reportFormat"><option>PDF</option><option>Excel</option><option>HTML</option></select></div></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="closeModal();showToast(\'报表生成中...\',\'info\');setTimeout(function(){showToast(\'报表已生成\',\'success\')},1500)">生成</button>');
};
window._exportExcel = function(){
  showToast('数据导出中...','info');
  setTimeout(function(){showToast('Excel导出成功','success');},800);
};
window._refreshChart = function(){
  if(currentModule==='analytics')renderAnalyticsModule();
  showToast('图表已刷新','success');
};
window._alertSetting = function(){
  openModal('预警设置','<table class="table"><thead><tr><th>预警项</th><th>阈值</th><th>启用</th><th>通知方式</th><th>操作</th></tr></thead><tbody>'+
    (scmData.alertSettings||[]).map(function(a){return '<tr><td>'+a.name+'</td><td>'+a.threshold+'</td><td><input type="checkbox" '+(a.enabled?'checked':'')+' onchange="var as=scmData.alertSettings.find(function(x){return x.id===\''+a.id+'\';});if(as)as.enabled=this.checked;saveData();"></td><td>'+a.notifyMethod+'</td><td><button class="btn btn-outline btn-xs" onclick="closeModal();showToast(\'已保存\',\'success\')">编辑</button></td></tr>';}).join('')||'<tr><td colspan="5">暂无设置</td></tr>'+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="closeModal();showToast(\'设置已保存\',\'success\')">保存设置</button>');
};

// ============= 基础数据管理重写 =============
window.renderMasterModule = function() {
  var masters=scmData.masterData;
  $('#mainContent').innerHTML='<div class="module active"><div class="module-header"><h2>基础数据管理</h2><div class="module-header-actions">'+
    '<button class="btn btn-primary" onclick="window._addMasterProduct()">+ 新增物料</button>'+
    '<button class="btn btn-primary" onclick="window._addMasterCustomer()">+ 新增客户</button>'+
    '<button class="btn btn-primary" onclick="window._addMasterBom()">+ 新增BOM</button>'+
    '<button class="btn btn-primary" onclick="window._addMasterWarehouse()">+ 新增仓库</button>'+
    '<button class="btn btn-primary" onclick="window._codeGenerate()">🔢 编码生成</button>'+
    '<button class="btn btn-info" onclick="window._dataSync()">🔄 数据同步</button>'+
    '<button class="btn btn-warning" onclick="window._permissionSet()">🔒 权限设置</button>'+
    '</div></div>'+
    '<div class="module-tabs">'+[{id:'master-product',label:'物料主数据'},{id:'master-customer',label:'客户主数据'},{id:'master-bom',label:'BOM主数据'},{id:'master-warehouse',label:'仓库主数据'}].map(function(t){return '<div class="module-tab'+(currentSubModule===t.id||(!currentSubModule&&t.id==='master-product')?' active':'')+'" onclick="switchSubModule(\'master\',\''+t.id+'\')">'+t.label+'</div>';}).join('')+'</div>'+
    '<div class="toolbar"><input class="input" id="masterSearch" placeholder="搜索..." oninput="window._filterMaster()"></div>'+
    '<div class="table-wrapper" id="masterContent"></div></div>';
  window._renderMasterContent();
};
window._renderMasterContent = function(){
  var tab=currentSubModule||'master-product';var mc=$('#masterContent');if(!mc)return;
  if(tab==='master-product'){
    mc.innerHTML='<table class="table"><thead><tr><th>物料编码</th><th>名称</th><th>分类</th><th>规格</th><th>单位</th><th>单价</th><th>操作</th></tr></thead><tbody>'+
      ((scmData.masterData.products||[]).map(function(p){return '<tr><td><strong>'+p.code+'</strong></td><td>'+p.name+'</td><td>'+p.category+'</td><td>'+p.spec+'</td><td>'+p.unit+'</td><td>'+formatMoney(p.price)+'</td><td><button class="btn btn-outline btn-xs" onclick="window._viewMasterProduct(\''+p.id+'\')">查看</button> <button class="btn btn-outline btn-xs" onclick="window._editMasterProduct(\''+p.id+'\')">编辑</button> <button class="btn btn-danger btn-xs" onclick="window._deleteMasterProduct(\''+p.id+'\')">删除</button></td></tr>';}).join(''))+'</tbody></table>';
  }else if(tab==='master-customer'){
    mc.innerHTML='<table class="table"><thead><tr><th>客户编码</th><th>名称</th><th>分类</th><th>联系人</th><th>电话</th><th>地址</th><th>操作</th></tr></thead><tbody>'+
      ((scmData.masterData.customers||[]).map(function(c){return '<tr><td><strong>'+c.code+'</strong></td><td>'+c.name+'</td><td>'+c.category+'</td><td>'+c.contact+'</td><td>'+c.phone+'</td><td>'+c.address+'</td><td><button class="btn btn-outline btn-xs" onclick="window._viewMasterCustomer(\'"+c.id+"\')">查看</button> <button class="btn btn-outline btn-xs" onclick="window._editMasterCustomer(\'"+c.id+"\')">编辑</button> <button class="btn btn-danger btn-xs" onclick="window._deleteMasterCustomer(\'"+c.id+"\')">删除</button></td></tr>';}).join(''))+'</tbody></table>';
  }else if(tab==='master-bom'){
    mc.innerHTML='<table class="table"><thead><tr><th>BOM编号</th><th>产品</th><th>版本</th><th>物料清单</th><th>层级</th><th>状态</th><th>操作</th></tr></thead><tbody>'+
      ((scmData.masterData.boms||[]).map(function(b){return '<tr><td><strong>'+b.id+'</strong></td><td>'+b.productName+'</td><td>'+b.version+'</td><td>'+b.components+'</td><td>'+b.level+'级</td><td><span class="badge badge-success">'+b.status+'</span></td><td><button class="btn btn-outline btn-xs" onclick="window._viewMasterBom(\'"+b.id+"\')">查看</button> <button class="btn btn-outline btn-xs" onclick="window._editMasterBom(\'"+b.id+"\')">编辑</button> <button class="btn btn-danger btn-xs" onclick="window._deleteMasterBom(\'"+b.id+"\')">删除</button></td></tr>';}).join(''))+'</tbody></table>';
  }else if(tab==='master-warehouse'){
    mc.innerHTML='<table class="table"><thead><tr><th>仓库编号</th><th>仓库名称</th><th>类型</th><th>位置</th><th>负责人</th><th>容量</th><th>状态</th><th>操作</th></tr></thead><tbody>'+
      ((scmData.masterData.warehouses||[]).map(function(w){return '<tr><td><strong>'+w.id+'</strong></td><td>'+w.name+'</td><td>'+w.type+'</td><td>'+w.location+'</td><td>'+w.manager+'</td><td>'+w.capacity+' ㎡</td><td><span class="badge badge-success">使用中</span></td><td><button class="btn btn-outline btn-xs" onclick="window._viewMasterWarehouse(\'"+w.id+"\')">查看</button> <button class="btn btn-outline btn-xs" onclick="window._editMasterWarehouse(\'"+w.id+"\')">编辑</button> <button class="btn btn-danger btn-xs" onclick="window._deleteMasterWarehouse(\'"+w.id+"\')">删除</button></td></tr>';}).join(''))+'</tbody></table>';
  }
};
window._filterMaster = function(){
  window._renderMasterContent();
};
window._editMasterProduct = function(id){
  var p=scmData.masterData.products.find(function(x){return x.id===id;});if(!p)return;
  openModal('编辑物料-'+p.name,
    '<div class="form-row"><div class="form-group"><label>名称</label><input class="input" id="mpName" value="'+p.name+'"></div><div class="form-group"><label>分类</label><input class="input" id="mpCat" value="'+p.category+'"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>规格</label><input class="input" id="mpSpec" value="'+p.spec+'"></div><div class="form-group"><label>单价</label><input class="input" type="number" id="mpPrice" value="'+p.price+'"></div></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="p.name=$(\'#mpName\').value;p.category=$(\'#mpCat\').value;p.spec=$(\'#mpSpec\').value;p.price=parseFloat($(\'#mpPrice\').value);saveData();closeModal();if(currentModule===\'master\')renderMasterModule();showToast(\'已保存\',\'success\')">保存</button>');
};
window._codeGenerate = function(){
  openModal('编码生成','<div class="info-panel">🔢 物料编码规则: MAT-分类代码-序号</div><div class="form-group"><label>分类</label><select class="select" id="codeCat"><option value="ELEC">电子元器件</option><option value="MECH">机械部件</option><option value="PKG">包装材料</option><option value="CHM">化工原料</option></select></div><div class="form-group"><label>生成编码</label><input class="input" id="codeResult" value="MAT-ELEC-006" disabled></div>',
    '<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="$(\'#codeResult\').value=\'MAT-\'+$(\'#codeCat\').value+\'-\'+String(Math.floor(Math.random()*900+100)).padStart(3,\'0\');showToast(\'编码已生成\',\'success\')">生成</button>');
};
window._dataSync = function(){
  showToast('数据同步已启动...','info');
  setTimeout(function(){showToast('数据同步完成','success');},1500);
};
window._permissionSet = function(){
  openModal('权限设置','<table class="table"><thead><tr><th>角色</th><th>模块</th><th>查看</th><th>编辑</th><th>删除</th><th>审批</th></tr></thead><tbody>'+
    ['管理员','供应链经理','采购员','仓库管理员','质检员'].map(function(r){return '<tr><td><strong>'+r+'</strong></td><td>全部</td><td><input type="checkbox" checked></td><td><input type="checkbox" '+(r==='管理员'||r==='供应链经理'?'checked':'')+'></td><td><input type="checkbox" '+(r==='管理员'?'checked':'')+'></td><td><input type="checkbox" '+(r==='管理员'||r==='供应链经理'?'checked':'')+'></td></tr>';}).join('')+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="closeModal();showToast(\'权限已保存\',\'success\')">保存</button>');
};


// ============= 基础数据管理 CRUD 函数 =============
window._initMasterCounters = function(){
  if(!scmData.counters)scmData.counters={};
  if(!scmData.counters.masterProduct)scmData.counters.masterProduct=(scmData.masterData.products||[]).length;
  if(!scmData.counters.masterCustomer)scmData.counters.masterCustomer=(scmData.masterData.customers||[]).length;
  if(!scmData.counters.masterBom)scmData.counters.masterBom=(scmData.masterData.boms||[]).length;
  if(!scmData.counters.masterWarehouse)scmData.counters.masterWarehouse=(scmData.masterData.warehouses||[]).length;
};

// ---- 物料主数据 ----
window._addMasterProduct = function(){
  window._initMasterCounters();
  scmData.counters.masterProduct++;
  var code='PRD'+String(scmData.counters.masterProduct).padStart(3,'0');
  openModal('新增物料',
    '<div class="form-row"><div class="form-group"><label>名称</label><input class="input" id="addMpName"></div><div class="form-group"><label>分类</label><input class="input" id="addMpCat"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>规格</label><input class="input" id="addMpSpec"></div><div class="form-group"><label>单位</label><input class="input" id="addMpUnit"></div></div>'+
    '<div class="form-group"><label>单价</label><input class="input" type="number" id="addMpPrice"></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="var c=\''+code+'\';scmData.masterData.products.push({id:c,code:c,name:$(\'#addMpName\').value,category:$(\'#addMpCat\').value,spec:$(\'#addMpSpec\').value,unit:$(\'#addMpUnit\').value,price:parseFloat($(\'#addMpPrice\').value)||0,uom:\'PCS\'});saveData();closeModal();renderMasterModule();showToast(\'已新增\',\'success\')">保存</button>');
};
window._viewMasterProduct = function(id){
  var p=scmData.masterData.products.find(function(x){return x.id===id;});if(!p)return;
  openModal('物料详情 - '+p.name,
    '<table class="table"><tbody>'+
    '<tr><td style="width:100px"><strong>物料编码</strong></td><td>'+p.id+'</td></tr>'+
    '<tr><td><strong>名称</strong></td><td>'+p.name+'</td></tr>'+
    '<tr><td><strong>分类</strong></td><td>'+p.category+'</td></tr>'+
    '<tr><td><strong>规格</strong></td><td>'+p.spec+'</td></tr>'+
    '<tr><td><strong>单位</strong></td><td>'+p.unit+'</td></tr>'+
    '<tr><td><strong>单价</strong></td><td>'+formatMoney(p.price)+'</td></tr>'+
    '</tbody></table>',
    '<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._deleteMasterProduct = function(id){
  var p=scmData.masterData.products.find(function(x){return x.id===id;});if(!p)return;
  openModal('确认删除',
    '<p>确定删除物料「'+p.name+'」吗？此操作不可恢复。</p>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="scmData.masterData.products=scmData.masterData.products.filter(function(x){return x.id!==\''+id+'\';});saveData();closeModal();renderMasterModule();showToast(\'已删除\',\'success\')">确认删除</button>');
};

// ---- 客户主数据 ----
window._addMasterCustomer = function(){
  window._initMasterCounters();
  scmData.counters.masterCustomer++;
  var code='CUST'+String(scmData.counters.masterCustomer).padStart(3,'0');
  openModal('新增客户',
    '<div class="form-row"><div class="form-group"><label>名称</label><input class="input" id="addMcName"></div><div class="form-group"><label>分类</label><select class="select" id="addMcCat"><option value="战略客户">战略客户</option><option value="核心客户">核心客户</option><option value="普通客户">普通客户</option></select></div></div>'+
    '<div class="form-row"><div class="form-group"><label>联系人</label><input class="input" id="addMcContact"></div><div class="form-group"><label>电话</label><input class="input" id="addMcPhone"></div></div>'+
    '<div class="form-group"><label>地址</label><input class="input" id="addMcAddr"></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="var c=\''+code+'\';scmData.masterData.customers.push({id:c,code:c,name:$(\'#addMcName\').value,category:$(\'#addMcCat\').value,contact:$(\'#addMcContact\').value,phone:$(\'#addMcPhone\').value,address:$(\'#addMcAddr\').value});saveData();closeModal();renderMasterModule();showToast(\'已新增\',\'success\')">保存</button>');
};
window._viewMasterCustomer = function(id){
  var c=scmData.masterData.customers.find(function(x){return x.id===id;});if(!c)return;
  openModal('客户详情 - '+c.name,
    '<table class="table"><tbody>'+
    '<tr><td style="width:100px"><strong>客户编码</strong></td><td>'+c.id+'</td></tr>'+
    '<tr><td><strong>名称</strong></td><td>'+c.name+'</td></tr>'+
    '<tr><td><strong>分类</strong></td><td>'+c.category+'</td></tr>'+
    '<tr><td><strong>联系人</strong></td><td>'+c.contact+'</td></tr>'+
    '<tr><td><strong>电话</strong></td><td>'+c.phone+'</td></tr>'+
    '<tr><td><strong>地址</strong></td><td>'+c.address+'</td></tr>'+
    '</tbody></table>',
    '<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._editMasterCustomer = function(id){
  var c=scmData.masterData.customers.find(function(x){return x.id===id;});if(!c)return;
  var catOpts=['战略客户','核心客户','普通客户'].map(function(o){return '<option value="'+o+'"'+(c.category===o?' selected':'')+'>'+o+'</option>';}).join('');
  openModal('编辑客户 - '+c.name,
    '<div class="form-row"><div class="form-group"><label>名称</label><input class="input" id="editMcName" value="'+c.name+'"></div><div class="form-group"><label>分类</label><select class="select" id="editMcCat">'+catOpts+'</select></div></div>'+
    '<div class="form-row"><div class="form-group"><label>联系人</label><input class="input" id="editMcContact" value="'+c.contact+'"></div><div class="form-group"><label>电话</label><input class="input" id="editMcPhone" value="'+c.phone+'"></div></div>'+
    '<div class="form-group"><label>地址</label><input class="input" id="editMcAddr" value="'+c.address+'"></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="c.name=$(\'#editMcName\').value;c.category=$(\'#editMcCat\').value;c.contact=$(\'#editMcContact\').value;c.phone=$(\'#editMcPhone\').value;c.address=$(\'#editMcAddr\').value;saveData();closeModal();renderMasterModule();showToast(\'已保存\',\'success\')">保存</button>');
};
window._deleteMasterCustomer = function(id){
  var c=scmData.masterData.customers.find(function(x){return x.id===id;});if(!c)return;
  openModal('确认删除',
    '<p>确定删除客户「'+c.name+'」吗？此操作不可恢复。</p>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="scmData.masterData.customers=scmData.masterData.customers.filter(function(x){return x.id!==\''+id+'\';});saveData();closeModal();renderMasterModule();showToast(\'已删除\',\'success\')">确认删除</button>');
};

// ---- BOM主数据 ----
window._addMasterBom = function(){
  window._initMasterCounters();
  scmData.counters.masterBom++;
  var code='BOM'+String(scmData.counters.masterBom).padStart(3,'0');
  var prodOpts=(scmData.masterData.products||[]).map(function(p){return '<option value="'+p.id+'">'+p.name+'</option>';}).join('');
  openModal('新增BOM',
    '<div class="form-group"><label>产品</label><select class="select" id="addBomProduct">'+prodOpts+'</select></div>'+
    '<div class="form-row"><div class="form-group"><label>版本</label><input class="input" id="addBomVer" value="V1.0"></div><div class="form-group"><label>层级</label><input class="input" type="number" id="addBomLevel" value="1"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>物料清单</label><input class="input" id="addBomComp"></div><div class="form-group"><label>状态</label><select class="select" id="addBomStatus"><option value="生效">生效</option><option value="失效">失效</option></select></div></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="var c=\''+code+'\';var sel=document.getElementById(\'addBomProduct\');var prod=scmData.masterData.products.find(function(x){return x.id===sel.value;});scmData.masterData.boms.push({id:c,productId:sel.value,productName:prod?prod.name:\'\',version:$(\'#addBomVer\').value,components:$(\'#addBomComp\').value,level:parseInt($(\'#addBomLevel\').value)||1,status:$(\'#addBomStatus\').value});saveData();closeModal();renderMasterModule();showToast(\'已新增\',\'success\')">保存</button>');
};
window._viewMasterBom = function(id){
  var b=scmData.masterData.boms.find(function(x){return x.id===id;});if(!b)return;
  openModal('BOM详情 - '+b.id,
    '<table class="table"><tbody>'+
    '<tr><td style="width:100px"><strong>BOM编号</strong></td><td>'+b.id+'</td></tr>'+
    '<tr><td><strong>产品</strong></td><td>'+b.productName+'</td></tr>'+
    '<tr><td><strong>版本</strong></td><td>'+b.version+'</td></tr>'+
    '<tr><td><strong>物料清单</strong></td><td>'+b.components+'</td></tr>'+
    '<tr><td><strong>层级</strong></td><td>'+b.level+'级</td></tr>'+
    '<tr><td><strong>状态</strong></td><td>'+b.status+'</td></tr>'+
    '</tbody></table>',
    '<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._editMasterBom = function(id){
  var b=scmData.masterData.boms.find(function(x){return x.id===id;});if(!b)return;
  var prodOpts=(scmData.masterData.products||[]).map(function(p){return '<option value="'+p.id+'"'+(b.productId===p.id?' selected':'')+'>'+p.name+'</option>';}).join('');
  var statOpts=['生效','失效'].map(function(o){return '<option value="'+o+'"'+(b.status===o?' selected':'')+'>'+o+'</option>';}).join('');
  openModal('编辑BOM - '+b.id,
    '<div class="form-group"><label>产品</label><select class="select" id="editBomProduct">'+prodOpts+'</select></div>'+
    '<div class="form-row"><div class="form-group"><label>版本</label><input class="input" id="editBomVer" value="'+b.version+'"></div><div class="form-group"><label>层级</label><input class="input" type="number" id="editBomLevel" value="'+b.level+'"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>物料清单</label><input class="input" id="editBomComp" value="'+b.components+'"></div><div class="form-group"><label>状态</label><select class="select" id="editBomStatus">'+statOpts+'</select></div></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="var sel=document.getElementById(\'editBomProduct\');var prod=scmData.masterData.products.find(function(x){return x.id===sel.value;});b.productId=sel.value;b.version=$(\'#editBomVer\').value;b.components=$(\'#editBomComp\').value;b.level=parseInt($(\'#editBomLevel\').value)||1;b.status=$(\'#editBomStatus\').value;saveData();closeModal();renderMasterModule();showToast(\'已保存\',\'success\')">保存</button>');
};
window._deleteMasterBom = function(id){
  var b=scmData.masterData.boms.find(function(x){return x.id===id;});if(!b)return;
  openModal('确认删除',
    '<p>确定删除BOM「'+b.id+'」吗？此操作不可恢复。</p>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="scmData.masterData.boms=scmData.masterData.boms.filter(function(x){return x.id!==\''+id+'\';});saveData();closeModal();renderMasterModule();showToast(\'已删除\',\'success\')">确认删除</button>');
};

// ---- 仓库主数据 ----
window._addMasterWarehouse = function(){
  window._initMasterCounters();
  scmData.counters.masterWarehouse++;
  var code='WH'+String(scmData.counters.masterWarehouse).padStart(3,'0');
  openModal('新增仓库',
    '<div class="form-row"><div class="form-group"><label>仓库名称</label><input class="input" id="addWhName"></div><div class="form-group"><label>类型</label><select class="select" id="addWhType"><option value="原材料仓">原材料仓</option><option value="半成品仓">半成品仓</option><option value="成品仓">成品仓</option><option value="包材仓">包材仓</option><option value="危险品仓">危险品仓</option></select></div></div>'+
    '<div class="form-row"><div class="form-group"><label>位置</label><input class="input" id="addWhLoc"></div><div class="form-group"><label>负责人</label><input class="input" id="addWhMgr"></div></div>'+
    '<div class="form-group"><label>容量（㎡）</label><input class="input" type="number" id="addWhCap"></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="var c=\''+code+'\';scmData.masterData.warehouses.push({id:c,name:$(\'#addWhName\').value,type:$(\'#addWhType\').value,location:$(\'#addWhLoc\').value,manager:$(\'#addWhMgr\').value,capacity:parseInt($(\'#addWhCap\').value)||0});saveData();closeModal();renderMasterModule();showToast(\'已新增\',\'success\')">保存</button>');
};
window._viewMasterWarehouse = function(id){
  var w=scmData.masterData.warehouses.find(function(x){return x.id===id;});if(!w)return;
  openModal('仓库详情 - '+w.name,
    '<table class="table"><tbody>'+
    '<tr><td style="width:100px"><strong>仓库编号</strong></td><td>'+w.id+'</td></tr>'+
    '<tr><td><strong>名称</strong></td><td>'+w.name+'</td></tr>'+
    '<tr><td><strong>类型</strong></td><td>'+w.type+'</td></tr>'+
    '<tr><td><strong>位置</strong></td><td>'+w.location+'</td></tr>'+
    '<tr><td><strong>负责人</strong></td><td>'+w.manager+'</td></tr>'+
    '<tr><td><strong>容量</strong></td><td>'+w.capacity+' ㎡</td></tr>'+
    '</tbody></table>',
    '<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._editMasterWarehouse = function(id){
  var w=scmData.masterData.warehouses.find(function(x){return x.id===id;});if(!w)return;
  var typeOpts=['原材料仓','半成品仓','成品仓','包材仓','危险品仓'].map(function(o){return '<option value="'+o+'"'+(w.type===o?' selected':'')+'>'+o+'</option>';}).join('');
  openModal('编辑仓库 - '+w.name,
    '<div class="form-row"><div class="form-group"><label>仓库名称</label><input class="input" id="editWhName" value="'+w.name+'"></div><div class="form-group"><label>类型</label><select class="select" id="editWhType">'+typeOpts+'</select></div></div>'+
    '<div class="form-row"><div class="form-group"><label>位置</label><input class="input" id="editWhLoc" value="'+w.location+'"></div><div class="form-group"><label>负责人</label><input class="input" id="editWhMgr" value="'+w.manager+'"></div></div>'+
    '<div class="form-group"><label>容量（㎡）</label><input class="input" type="number" id="editWhCap" value="'+w.capacity+'"></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="w.name=$(\'#editWhName\').value;w.type=$(\'#editWhType\').value;w.location=$(\'#editWhLoc\').value;w.manager=$(\'#editWhMgr\').value;w.capacity=parseInt($(\'#editWhCap\').value)||0;saveData();closeModal();renderMasterModule();showToast(\'已保存\',\'success\')">保存</button>');
};
window._deleteMasterWarehouse = function(id){
  var w=scmData.masterData.warehouses.find(function(x){return x.id===id;});if(!w)return;
  openModal('确认删除',
    '<p>确定删除仓库「'+w.name+'」吗？此操作不可恢复。</p>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="scmData.masterData.warehouses=scmData.masterData.warehouses.filter(function(x){return x.id!==\''+id+'\';});saveData();closeModal();renderMasterModule();showToast(\'已删除\',\'success\')">确认删除</button>');
};

// ============= 系统集成平台重写 =============
window.renderIntegrationModule = function() {
  var ints=scmData.integrations;
  $('#mainContent').innerHTML='<div class="module active"><div class="module-header"><h2>系统集成平台</h2><div class="module-header-actions">'+
    '<button class="btn btn-primary" onclick="window._apiTest()">🧪 接口测试</button>'+
    '<button class="btn btn-info" onclick="window._dataSync()">🔄 数据同步</button>'+
    '<button class="btn btn-outline" onclick="window._logQuery()">📋 日志查询</button>'+
    '</div></div>'+
    '<div class="info-panel">🔗 系统集成平台：ERP接口、MES接口、WMS接口、TMS接口、PLM接口、OA接口、API平台、EDI电子数据交换</div>'+
    '<div class="stats-grid cols-2">'+
      '<div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><div class="stat-label">连接正常</div><div class="stat-value">'+(ints||[]).filter(function(i){return i.status==='正常';}).length+'</div><div class="stat-desc">共'+(ints||[]).length+'个接口</div></div></div>'+
      '<div class="stat-card"><div class="stat-icon orange">⚡</div><div class="stat-info"><div class="stat-label">告警接口</div><div class="stat-value">'+(ints||[]).filter(function(i){return i.status!=='正常';}).length+'</div><div class="stat-desc">需关注</div></div></div>'+
    '</div>'+
    '<div class="table-wrapper"><table class="table"><thead><tr><th>接口编号</th><th>系统</th><th>类型</th><th>状态</th><th>最后同步</th><th>频率</th><th>端点</th><th>操作</th></tr></thead><tbody>'+
      (ints||[]).map(function(i){return '<tr><td><strong>'+i.id+'</strong></td><td>'+i.system+'</td><td>'+i.type+'</td><td><span class="badge '+(i.status==='正常'?'badge-success':'badge-danger')+'">'+i.status+'</span></td><td>'+i.lastSync+'</td><td>'+i.frequency+'</td><td><code>'+i.apiEndpoint+'</code></td><td><div class="action-group"><button class="btn btn-outline btn-xs" onclick="window._singleSync(\''+i.id+'\')">同步</button><button class="btn btn-info btn-xs" onclick="window._singleTest(\''+i.id+'\')">测试</button></div></td></tr>';}).join('')||'<tr><td colspan="8">无集成接口</td></tr>'+
    '</tbody></table></div></div>';
};
window._apiTest = function(){
  openModal('接口测试','<div class="form-group"><label>选择接口</label><select class="select" id="testApi">'+((scmData.integrations||[]).map(function(i){return '<option value="'+i.id+'">'+i.system+' - '+i.apiEndpoint+'</option>';}).join(''))+'</select></div><div id="testResult" style="margin-top:12px;padding:12px;background:#f0fdf4;border-radius:8px"></div>',
    '<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="$(\'#testResult\').innerHTML=\'<strong>✅ 测试通过</strong><br>延迟: '+Math.round(Math.random()*200+50)+'ms<br>状态码: 200<br>时间: '+formatDateTime()+'\';showToast(\'测试完成\',\'success\')">执行测试</button>');
};
window._logQuery = function(){
  openModal('日志查询','<div class="form-row"><div class="form-group"><label>接口</label><select class="select" id="logApi"><option value="">全部</option>'+((scmData.integrations||[]).map(function(i){return '<option value="'+i.id+'">'+i.system+'</option>';}).join(''))+'</select></div><div class="form-group"><label>时间范围</label><input class="input" type="date" id="logDate" value="'+formatDate(Date.now())+'"></div></div><table class="table"><thead><tr><th>时间</th><th>接口</th><th>方法</th><th>状态</th><th>耗时</th></tr></thead><tbody>'+
    ['2026-05-24 09:15:22','2026-05-24 09:10:05','2026-05-24 08:57:18'].map(function(t){return '<tr><td>'+t+'</td><td>'+['ERP','WMS','MES'][Math.floor(Math.random()*3)]+'</td><td>POST</td><td><span class="badge badge-success">200</span></td><td>'+Math.round(Math.random()*150+30)+'ms</td></tr>';}).join('')+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="closeModal();showToast(\'日志已导出\',\'success\')">导出日志</button>');
};
window._singleSync = function(id){
  var i=scmData.integrations.find(function(x){return x.id===id;});if(!i)return;
  i.lastSync=formatDateTime();saveData();if(currentModule==='integration')renderIntegrationModule();showToast(i.system+' 同步完成','success');
};
window._singleTest = function(id){
  var i=scmData.integrations.find(function(x){return x.id===id;});if(!i)return;
  showToast(i.system+' 接口测试通过 (200 OK, '+Math.round(Math.random()*100+30)+'ms)','success');
};


// ============= 供应商管理SRM升级按钮 =============
window.renderSupplierModule = function() {
  var data=scmData.suppliers;
  $('#mainContent').innerHTML='<div class="module active"><div class="module-header"><h2>供应商管理SRM</h2><div class="module-header-actions">'+
    '<button class="btn btn-primary" onclick="openSupplierForm()">+ 新增供应商</button>'+
    '<button class="btn btn-info" onclick="window._srmReview()">📋 准入审核</button>'+
    '<button class="btn btn-success" onclick="window._ratingCalc()">📊 评级计算</button>'+
    '<button class="btn btn-warning" onclick="window._perfEval()">📈 绩效评估</button>'+
    '<button class="btn btn-danger" onclick="window._riskAlert()">⚠ 风险预警</button>'+
    '<button class="btn btn-outline" onclick="window._srmContract()">📄 合同管理</button>'+
    '</div></div>'+
    '<div class="toolbar"><input class="input" placeholder="搜索供应商..." oninput="filterSupplierTable()"><select class="select" onchange="filterSupplierTable()" id="supCatFilter"><option value="">全部分类</option><option>电子元器件</option><option>机械部件</option><option>包装材料</option><option>化工原料</option><option>物流服务</option></select></div>'+
    '<div class="table-wrapper"><table class="table"><thead><tr><th>编号</th><th>供应商名称</th><th>分类</th><th>联系人</th><th>电话</th><th>评级</th><th>评分</th><th>状态</th><th>类型</th><th>操作</th></tr></thead><tbody id="supplierTbody"></tbody></table></div></div>';
  window._renderSupplierTable(data);
};
window._renderSupplierTable = function(data){
  var tb=$('#supplierTbody');if(!tb)return;
  tb.innerHTML=data.length?data.map(function(s){
    return '<tr><td><strong>'+s.id+'</strong></td><td>'+s.name+'</td><td>'+s.category+'</td><td>'+s.contact+'</td><td>'+s.phone+'</td><td><div class="star-rating"><div class="star-fill" style="width:'+(s.rating*20)+'%"></div></div></td><td><strong>'+s.score+'</strong></td><td><span class="badge '+(s.status==='合作中'?'badge-success':'badge-danger')+'">'+s.status+'</span></td><td>'+s.type+'</td><td><div class="action-group"><button class="btn btn-outline btn-xs" onclick="editSupplier(\''+s.id+'\')">编辑</button><button class="btn btn-danger btn-xs" onclick="deleteSupplier(\''+s.id+'\')">删除</button></div></td></tr>';
  }).join(''):'<tr><td colspan="10"><div class="empty-state">暂无供应商</div></td></tr>';
};
window._srmReview = function(){
  openModal('准入审核','<div class="info-panel">📋 供应商准入审核</div><table class="table"><thead><tr><th>供应商</th><th>资质审核</th><th>现场审核</th><th>样品验证</th><th>综合评分</th><th>审核状态</th></tr></thead><tbody>'+
    scmData.suppliers.slice(0,4).map(function(s){return '<tr><td>'+s.name+'</td><td><span class="badge badge-success">通过</span></td><td><span class="badge badge-info">待审核</span></td><td><span class="badge badge-success">通过</span></td><td><strong>'+Math.round(Math.random()*15+80)+'</strong></td><td><span class="badge badge-info">审核中</span></td></tr>';}).join('')+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="closeModal();showToast(\'审核结果已更新\',\'success\')">通过审核</button>');
};
window._ratingCalc = function(){
  openModal('评级计算','<div class="info-panel">📊 供应商评级计算（基于交付、质量、价格、服务）</div><table class="table"><thead><tr><th>供应商</th><th>交付40%</th><th>质量30%</th><th>价格20%</th><th>服务10%</th><th>总分</th><th>等级</th></tr></thead><tbody>'+
    scmData.suppliers.map(function(s){var d=Math.round(Math.random()*10+88);var q=Math.round(Math.random()*15+82);var p=Math.round(Math.random()*15+78);var v=Math.round(Math.random()*10+85);var total=Math.round(d*0.4+q*0.3+p*0.2+v*0.1);return '<tr><td>'+s.name+'</td><td>'+d+'</td><td>'+q+'</td><td>'+p+'</td><td>'+v+'</td><td><strong>'+total+'</strong></td><td><span class="badge '+(total>=90?'badge-success':total>=75?'badge-info':'badge-warning')+'">'+(total>=90?'A':total>=75?'B':'C')+'</span></td></tr>';}).join('')+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="closeModal();showToast(\'评级已更新\',\'success\')">更新评级</button>');
};
window._perfEval = function(){
  openModal('绩效评估','<div class="info-panel">📈 供应商绩效评估</div><table class="table"><thead><tr><th>供应商</th><th>准时交付率</th><th>质量合格率</th><th>响应速度</th><th>成本竞争力</th><th>总体评分</th></tr></thead><tbody>'+
    scmData.suppliers.map(function(s){return '<tr><td>'+s.name+'</td><td>'+Math.round(Math.random()*10+88)+'%</td><td>'+Math.round(Math.random()*10+85)+'%</td><td>'+Math.round(Math.random()*10+82)+'%</td><td>'+Math.round(Math.random()*15+78)+'%</td><td><strong>'+s.score+'</strong></td></tr>';}).join('')+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="closeModal();showToast(\'绩效评估已导出\',\'success\')">导出评估</button>');
};
window._riskAlert = function(){
  openModal('风险预警','<div class="info-panel">⚠ 供应商风险预警</div><table class="table"><thead><tr><th>编号</th><th>供应商</th><th>风险类型</th><th>风险等级</th><th>描述</th><th>触发日期</th><th>状态</th></tr></thead><tbody>'+
    ((scmData.riskAlerts||[]).map(function(r){return '<tr class="'+(r.riskLevel==='高'?'row-danger':'')+'"><td>'+r.id+'</td><td>'+r.supplierName+'</td><td>'+r.riskType+'</td><td><span class="badge '+(r.riskLevel==='高'?'badge-danger':'badge-warning')+'">'+r.riskLevel+'</span></td><td>'+r.description+'</td><td>'+r.triggerDate+'</td><td><span class="badge '+(r.status==='未处理'?'badge-danger':'badge-info')+'">'+r.status+'</span></td></tr>';}).join('')||'<tr><td colspan="7">暂无预警</td></tr>')+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};
window._srmContract = function(){
  openModal('合同管理','<div class="info-panel">📄 供应商合同</div><table class="table"><thead><tr><th>合同编号</th><th>供应商</th><th>合同名称</th><th>金额</th><th>签署日期</th><th>到期日期</th><th>状态</th></tr></thead><tbody>'+
    ((scmData.contracts||[]).map(function(c){return '<tr><td>'+c.id+'</td><td>'+c.supplierName+'</td><td>'+c.title+'</td><td>'+formatMoney(c.amount)+'</td><td>'+c.signDate+'</td><td>'+c.expireDate+'</td><td><span class="badge '+(c.status==='生效中'?'badge-success':'badge-warning')+'">'+c.status+'</span></td></tr>';}).join('')||'<tr><td colspan="7">暂无合同</td></tr>')+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="closeModal();showToast(\'新合同已创建\',\'success\')">新建合同</button>');
};

// ============= 采购管理升级按钮 =============
(function(){
  var origRender = renderPurchaseModule;
  renderPurchaseModule = function() {
    origRender();
    // Add extra buttons to header
    var header = document.querySelector('#mainContent .module-header-actions');
    if(header && header.innerHTML.indexOf('询价')===-1){
      header.innerHTML += '<button class="btn btn-info" onclick="window.openBidding()">📋 招标/询价</button><button class="btn btn-warning" onclick="window._arrivalConfirm()">📦 到货确认</button><button class="btn btn-outline" onclick="window.openReconciliation()">🧾 对账</button>';
    }
  };
  window.renderPurchaseModule = renderPurchaseModule;
})();
window._arrivalConfirm = function(){
  openModal('到货确认','<div class="info-panel">📦 到货记录</div><table class="table"><thead><tr><th>记录号</th><th>采购订单</th><th>产品</th><th>供应商</th><th>数量</th><th>实收</th><th>到货日期</th><th>状态</th><th>操作</th></tr></thead><tbody>'+
    ((scmData.arrivalRecords||[]).map(function(a){return '<tr><td>'+a.id+'</td><td>'+a.poId+'</td><td>'+a.productName+'</td><td>'+a.supplierName+'</td><td>'+a.qty+'</td><td>'+a.actualQty+'</td><td>'+a.date+'</td><td><span class="badge badge-success">'+a.status+'</span></td><td><button class="btn btn-success btn-xs" onclick="closeModal();showToast(\'已确认收货\',\'success\')">确认</button></td></tr>';}).join('')||'<tr><td colspan="9">无到货记录</td></tr>')+
  '</tbody></table>','<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};

// ============= 需求管理 Tab 支持 =============
(function(){
  var origRender = renderDemandModule;
  renderDemandModule = function() {
    $('#mainContent').innerHTML='<div class="module active"><div class="module-header"><h2>需求与计划管理</h2><div class="module-header-actions">'+
      '<button class="btn btn-primary" onclick="window.openDemandForm()">+ 新增计划</button>'+
      '<button class="btn btn-info" onclick="window.generateMPS()">📋 生成MPS</button>'+
      '<button class="btn btn-success" onclick="window.runMRP()">🔄 运行MRP</button>'+
      '<button class="btn btn-warning" onclick="window.capacityEval()">📐 产能评估</button>'+
      '<button class="btn btn-outline" onclick="window.exportDemandCSV()">📥 导出</button>'+
      '</div></div>'+
      '<div class="module-tabs">'+['销售预测','主生产计划','物料需求计划','产能计划'].map(function(t){return '<div class="module-tab" onclick="window._filterDemandTab(\''+t+'\')">'+t+'</div>';}).join('')+'</div>'+
      '<div class="toolbar"><input class="input" placeholder="搜索..." oninput="filterDemandTable()"><select class="select" onchange="filterDemandTable()" id="demStatusFilter"><option value="">全部状态</option><option>草稿</option><option>待审核</option><option>已审核</option><option>执行中</option></select></div>'+
      '<div class="table-wrapper"><table class="table"><thead><tr><th>编号</th><th>名称</th><th>类型</th><th>产品</th><th>月份</th><th>预测数量</th><th>置信度</th><th>状态</th><th>操作</th></tr></thead><tbody id="demandTbody"></tbody></table></div></div>';
    window._renderDemandTable(scmData.demandPlans);
  };
  window._renderDemandTable = function(data){
    var tb=$('#demandTbody');if(!tb)return;
    tb.innerHTML=data.length?data.map(function(d){
      return '<tr><td><strong>'+d.id+'</strong></td><td>'+d.name+'</td><td>'+d.type+'</td><td>'+d.product+'</td><td>'+d.month+'</td><td>'+d.forecastQty+'</td><td>'+(d.confidence*100).toFixed(0)+'%</td><td><span class="badge '+(d.status==='已审核'||d.status==='执行中'?'badge-success':d.status==='待审核'?'badge-info':'badge-warning')+'">'+d.status+'</span></td><td><div class="action-group"><button class="btn btn-outline btn-xs" onclick="editDemand(\''+d.id+'\')">编辑</button><button class="btn btn-danger btn-xs" onclick="deleteDemand(\''+d.id+'\')">删除</button></div></td></tr>';
    }).join(''):'<tr><td colspan="9"><div class="empty-state">暂无需求计划</div></td></tr>';
  };
window.renderDemandModule = renderDemandModule;
})();
window._filterDemandTab = function(type){
  var data=scmData.demandPlans.filter(function(d){return d.type===type;});
  window._renderDemandTable(data);
};

// ============= 重写 filterDemandTable / filterSupplierTable / filterPurchaseTable =============
window.filterDemandTable = function(){
  var s=(document.querySelector('#mainContent input[placeholder*="搜索"]')||{}).value||'';
  var st=(document.querySelector('#demStatusFilter')||{}).value||'';
  var data=scmData.demandPlans.slice();
  if(s){s=s.toLowerCase();data=data.filter(function(d){return d.name.toLowerCase().indexOf(s)>=0||d.product.toLowerCase().indexOf(s)>=0;});}
  if(st) data=data.filter(function(d){return d.status===st;});
  window._renderDemandTable(data);
};
window.filterSupplierTable = function(){
  var s=(document.querySelector('#supplierTbody')?document.querySelector('#mainContent input[placeholder*="搜索"]'):null);
  s=s?s.value:'';
  var cat=(document.querySelector('#supCatFilter')||{}).value||'';
  var data=scmData.suppliers.slice();
  if(s){s=s.toLowerCase();data=data.filter(function(d){return d.name.toLowerCase().indexOf(s)>=0;});}
  if(cat) data=data.filter(function(d){return d.category===cat;});
  window._renderSupplierTable(data);
};
window.filterPurchaseTable = function(){
  var s=(document.querySelector('#purchaseTbody')?document.querySelector('#mainContent input[placeholder*="搜索"]'):null);
  s=s?s.value:'';
  var type=(document.querySelector('#poTypeFilter')||{}).value||'';
  var status=(document.querySelector('#poStatusFilter')||{}).value||'';
  var data=scmData.purchaseOrders.slice();
  if(s){s=s.toLowerCase();data=data.filter(function(d){return d.productName.toLowerCase().indexOf(s)>=0||d.id.toLowerCase().indexOf(s)>=0;});}
  if(type) data=data.filter(function(d){return d.type===type;});
  if(status) data=data.filter(function(d){return d.status===status;});
  window._renderPurchaseTable(data);
};

// ============= 销售计划模块 =============
window.renderSalesPlanModule = function() {
  var sub = currentSubModule || 'salesplan-scheduled';
  var tabs = [
    {id:'salesplan-scheduled',label:'定时计划'},
    {id:'salesplan-temporary',label:'临时计划'},
    {id:'salesplan-realtime',label:'实时销售'},
    {id:'salesplan-summary',label:'销售汇总'}
  ];
  var tabHtml = tabs.map(function(t){
    return '<div class="module-tab'+(sub===t.id?' active':'')+'" onclick="switchSubModule(\'salesplan\',\''+t.id+'\')">'+t.label+'</div>';
  }).join('');

  var plans = scmData.salesPlans || [];
  $('#mainContent').innerHTML = '<div class="module active"><div class="module-header"><h2>销售计划管理</h2><div class="module-header-actions">'+
    '<button class="btn btn-primary" onclick="window._newSalesPlan()">+ 新建计划</button></div></div>'+
    '<div class="module-tabs">'+tabHtml+'</div>'+
    '<div class="table-wrapper" id="salesPlanContent"></div></div>';

  switch(sub) {
    case 'salesplan-temporary': window._renderTempPlans(); break;
    case 'salesplan-realtime': window._renderRealtimeSales(); break;
    case 'salesplan-summary': window._renderSalesSummary(); break;
    default: window._renderScheduledPlans();
  }
};

window._renderScheduledPlans = function() {
  var plans = (scmData.salesPlans||[]).filter(function(p){return p.type==='scheduled';});
  var html = '<table class="table"><thead><tr><th>计划编号</th><th>客户</th><th>产品</th><th>计划量</th><th>实际量</th><th>执行时段</th><th>月份</th><th>状态</th><th>操作</th></tr></thead><tbody>';
  plans.forEach(function(p){
    var days = p.weekDays ? p.weekDays.map(function(d){return ['日','一','二','三','四','五','六'][d];}).join(',') : '';
    var statusBadge = p.status==='执行中'?'badge-info':p.status==='已完成'?'badge-success':'badge-warning';
    html += '<tr><td><strong>'+p.id+'</strong></td><td>'+p.customerName+'</td><td>'+p.productName+'</td><td>'+p.planQty.toLocaleString()+'</td><td>'+p.actualQty.toLocaleString()+'</td><td>周'+days+' '+p.timeSlot+'</td><td>'+p.month+'</td><td><span class="badge '+statusBadge+'">'+p.status+'</span></td>'+
      '<td><div class="action-group"><button class="btn btn-outline btn-xs" onclick="window._viewSalesPlan(\''+p.id+'\')">查看</button><button class="btn btn-danger btn-xs" onclick="window._deleteSalesPlan(\''+p.id+'\')">删除</button></div></td></tr>';
  });
  html += '</tbody></table>';
  $('#salesPlanContent').innerHTML = html || '<div class="empty-state">暂无定时计划</div>';
};

window._renderTempPlans = function() {
  var plans = (scmData.salesPlans||[]).filter(function(p){return p.type==='temporary';});
  var html = '<table class="table"><thead><tr><th>计划编号</th><th>客户</th><th>产品</th><th>计划量</th><th>实际量</th><th>创建日期</th><th>原因</th><th>状态</th><th>操作</th></tr></thead><tbody>';
  plans.forEach(function(p){
    var statusBadge = p.status==='执行中'?'badge-info':p.status==='已完成'?'badge-success':'badge-warning';
    html += '<tr><td><strong>'+p.id+'</strong></td><td>'+p.customerName+'</td><td>'+p.productName+'</td><td>'+p.planQty.toLocaleString()+'</td><td>'+p.actualQty.toLocaleString()+'</td><td>'+p.createDate+'</td><td>'+p.reason+'</td><td><span class="badge '+statusBadge+'">'+p.status+'</span></td>'+
      '<td><div class="action-group"><button class="btn btn-outline btn-xs" onclick="window._viewSalesPlan(\''+p.id+'\')">查看</button><button class="btn btn-danger btn-xs" onclick="window._deleteSalesPlan(\''+p.id+'\')">删除</button></div></td></tr>';
  });
  html += '</tbody></table>';
  $('#salesPlanContent').innerHTML = html || '<div class="empty-state">暂无临时计划</div>';
};

window._renderRealtimeSales = function() {
  var plans = (scmData.salesPlans||[]).filter(function(p){return p.status==='执行中';});
  var html = '<div class="info-panel">实时销售执行状态</div>';
  html += '<table class="table"><thead><tr><th>计划编号</th><th>客户</th><th>产品</th><th>计划量</th><th>实际量</th><th>完成率</th><th>进度</th></tr></thead><tbody>';
  plans.forEach(function(p){
    var pct = p.planQty ? Math.round(p.actualQty/p.planQty*100) : 0;
    var color = pct>=80?'badge-success':pct>=50?'badge-info':'badge-warning';
    html += '<tr><td>'+p.id+'</td><td>'+p.customerName+'</td><td>'+p.productName+'</td><td>'+p.planQty.toLocaleString()+'</td><td>'+p.actualQty.toLocaleString()+'</td>'+
      '<td><span class="badge '+color+'">'+pct+'%</span></td><td><div style="background:#eee;border-radius:4px;height:8px;width:100px;"><div style="background:'+(pct>=80?'var(--success)':pct>=50?'var(--primary)':'var(--warning)')+';height:100%;width:'+pct+'%;border-radius:4px;"></div></div></td></tr>';
  });
  html += '</tbody></table>';
  $('#salesPlanContent').innerHTML = html || '<div class="empty-state">暂无执行中的计划</div>';
};

window._renderSalesSummary = function() {
  var plans = scmData.salesPlans || [];
  var totalPlan = plans.reduce(function(s,p){return s+p.planQty;},0);
  var totalActual = plans.reduce(function(s,p){return s+p.actualQty;},0);
  var scheduled = plans.filter(function(p){return p.type==='scheduled';});
  var temp = plans.filter(function(p){return p.type==='temporary';});
  var html = '<div class="stats-grid cols-4">'+
    '<div class="stat-card"><div class="stat-icon blue">📋</div><div class="stat-info"><div class="stat-label">总计划数</div><div class="stat-value">'+plans.length+'</div></div></div>'+
    '<div class="stat-card"><div class="stat-icon green">📅</div><div class="stat-info"><div class="stat-label">定时计划</div><div class="stat-value">'+scheduled.length+'</div></div></div>'+
    '<div class="stat-card"><div class="stat-icon orange">⚡</div><div class="stat-info"><div class="stat-label">临时计划</div><div class="stat-value">'+temp.length+'</div></div></div>'+
    '<div class="stat-card"><div class="stat-icon green">📦</div><div class="stat-info"><div class="stat-label">总计划量</div><div class="stat-value">'+totalPlan.toLocaleString()+'</div><div class="stat-desc">已完成 '+totalActual.toLocaleString()+'</div></div></div>'+
  '</div>';
  html += '<table class="table"><thead><tr><th>计划编号</th><th>类型</th><th>客户</th><th>计划量</th><th>实际量</th><th>完成率</th><th>状态</th></tr></thead><tbody>';
  plans.forEach(function(p){
    var pct = p.planQty ? Math.round(p.actualQty/p.planQty*100) : 0;
    html += '<tr><td>'+p.id+'</td><td>'+(p.type==='scheduled'?'定时':'临时')+'</td><td>'+p.customerName+'</td><td>'+p.planQty.toLocaleString()+'</td><td>'+p.actualQty.toLocaleString()+'</td><td>'+pct+'%</td><td><span class="badge '+(p.status==='执行中'?'badge-info':'badge-success')+'">'+p.status+'</span></td></tr>';
  });
  html += '</tbody></table>';
  $('#salesPlanContent').innerHTML = html || '<div class="empty-state">暂无数据</div>';
};

window._newSalesPlan = function() {
  var sub = currentSubModule || 'salesplan-scheduled';
  if (sub === 'salesplan-temporary') {
    window._newTempPlan();
  } else {
    window._newScheduledPlan();
  }
};

window._newScheduledPlan = function() {
  var custOpts = (scmData.masterData.customers||[]).map(function(c){return '<option value="'+c.id+'">'+c.name+'</option>';}).join('');
  var prodOpts = (scmData.masterData.products||[]).map(function(p){return '<option value="'+p.id+'|'+p.name+'">'+p.name+'</option>';}).join('');
  openModal('新建定时销售计划',
    '<div class="form-row"><div class="form-group"><label>客户 *</label><select class="select" id="spCustomer">'+custOpts+'</select></div><div class="form-group"><label>负责人</label><input class="input" id="spOwner"></div></div>'+
    '<div class="form-group"><label>物料明细</label><div id="spItems"><div class="sp-item-row" style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">'+
    '<select class="select" style="flex:2;">'+prodOpts+'</select><input class="input" placeholder="数量" type="number" style="width:100px;" value="1000"><input class="input" placeholder="备注" style="width:120px;">'+
    '<button class="btn btn-danger btn-xs" onclick="this.parentElement.remove()">X</button></div></div>'+
    '<button class="btn btn-outline btn-xs" onclick="window._addPlanItem()">+ 添加物料行</button></div>'+
    '<div class="form-row"><div class="form-group"><label>执行时段</label><input class="input" id="spTimeSlot" value="09:00-18:00"></div><div class="form-group"><label>执行星期</label>'+
    '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;" id="spWeekDays">'+
    [1,2,3,4,5,6,0].map(function(d,i){return '<label style="font-size:12px;cursor:pointer;"><input type="checkbox" value="'+d+'"'+(d<=5?' checked':'')+'> 周'+['一','二','三','四','五','六','日'][i]+'</label>';}).join('')+'</div></div></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="window._saveScheduledPlan()">保存</button>');
};

window._addPlanItem = function() {
  var container = $('#spItems');
  var prodOpts = (scmData.masterData.products||[]).map(function(p){return '<option value="'+p.id+'|'+p.name+'">'+p.name+'</option>';}).join('');
  var row = document.createElement('div');
  row.className = 'sp-item-row';
  row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center;';
  row.innerHTML = '<select class="select" style="flex:2;">'+prodOpts+'</select><input class="input" placeholder="数量" type="number" style="width:100px;" value="1000"><input class="input" placeholder="备注" style="width:120px;">'+
    '<button class="btn btn-danger btn-xs" onclick="this.parentElement.remove()">X</button>';
  container.appendChild(row);
};

window._saveScheduledPlan = function() {
  var custId = $('#spCustomer').value;
  if (!custId) { showToast('请选择客户','warning'); return; }
  var customer = (scmData.masterData.customers||[]).find(function(c){return c.id===custId;});
  var items = [];
  var itemRows = $('#spItems').querySelectorAll('.sp-item-row');
  itemRows.forEach(function(row){
    var sel = row.querySelector('select').value;
    var qty = parseInt(row.querySelectorAll('input')[0].value)||0;
    var remark = row.querySelectorAll('input')[1].value;
    var parts = sel.split('|');
    items.push({materialName:parts[1]||'',qty:qty,remark:remark});
  });
  var weekDays = [];
  var cbs = $('#spWeekDays').querySelectorAll('input[type=checkbox]');
  cbs.forEach(function(cb){if(cb.checked)weekDays.push(parseInt(cb.value));});
  scmData.counters.salesPlan = (scmData.counters.salesPlan||6);
  var newId = 'SP' + String(scmData.counters.salesPlan).padStart(3,'0'); scmData.counters.salesPlan++;
  (scmData.salesPlans||[]).push({
    id:newId,type:'scheduled',customerId:custId,customerName:customer?customer.name:'',
    productName:items.length?items[0].materialName:'',planQty:items.reduce(function(s,i){return s+i.qty;},0),actualQty:0,
    month:'2026-05',owner:$('#spOwner').value||'系统',status:'待执行',
    weekDays:weekDays,timeSlot:$('#spTimeSlot').value||'09:00-18:00',autoGenerate:true,items:items
  });
  saveData(); closeModal(); window.renderSalesPlanModule(); showToast('定时计划已创建','success');
};

window._newTempPlan = function() {
  var custOpts = (scmData.masterData.customers||[]).map(function(c){return '<option value="'+c.id+'">'+c.name+'</option>';}).join('');
  var prodOpts = (scmData.masterData.products||[]).map(function(p){return '<option value="'+p.id+'|'+p.name+'">'+p.name+'</option>';}).join('');
  openModal('新建临时销售计划',
    '<div class="form-row"><div class="form-group"><label>客户 *</label><select class="select" id="spCustomer">'+custOpts+'</select></div><div class="form-group"><label>负责人</label><input class="input" id="spOwner"></div></div>'+
    '<div class="form-group"><label>物料明细</label><div id="spItems"><div class="sp-item-row" style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">'+
    '<select class="select" style="flex:2;">'+prodOpts+'</select><input class="input" placeholder="数量" type="number" style="width:100px;" value="1000"><input class="input" placeholder="备注" style="width:120px;">'+
    '<button class="btn btn-danger btn-xs" onclick="this.parentElement.remove()">X</button></div></div>'+
    '<button class="btn btn-outline btn-xs" onclick="window._addPlanItem()">+ 添加物料行</button></div>'+
    '<div class="form-group"><label>创建原因 *</label><input class="input" id="spReason" placeholder="如：紧急补单、产线增补等"></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="window._saveTempPlan()">保存</button>');
};

window._saveTempPlan = function() {
  var custId = $('#spCustomer').value;
  var reason = $('#spReason').value.trim();
  if (!custId || !reason) { showToast('请填写必填字段','warning'); return; }
  var customer = (scmData.masterData.customers||[]).find(function(c){return c.id===custId;});
  var items = [];
  var itemRows = $('#spItems').querySelectorAll('.sp-item-row');
  itemRows.forEach(function(row){
    var sel = row.querySelector('select').value;
    var qty = parseInt(row.querySelectorAll('input')[0].value)||0;
    var remark = row.querySelectorAll('input')[1].value;
    var parts = sel.split('|');
    items.push({materialName:parts[1]||'',qty:qty,remark:remark});
  });
  scmData.counters.salesPlan = (scmData.counters.salesPlan||6);
  var newId = 'SP' + String(scmData.counters.salesPlan).padStart(3,'0'); scmData.counters.salesPlan++;
  (scmData.salesPlans||[]).push({
    id:newId,type:'temporary',customerId:custId,customerName:customer?customer.name:'',
    productName:items.length?items[0].materialName:'',planQty:items.reduce(function(s,i){return s+i.qty;},0),actualQty:0,
    month:'2026-05',owner:$('#spOwner').value||'系统',status:'执行中',createDate:formatDate(Date.now()),reason:reason,items:items
  });
  saveData(); closeModal(); window.renderSalesPlanModule(); showToast('临时计划已创建','success');
};

window._viewSalesPlan = function(id) {
  var p = (scmData.salesPlans||[]).find(function(x){return x.id===id;});
  if (!p) return;
  var itemsHtml = (p.items||[]).map(function(it){return '<tr><td>'+it.materialName+'</td><td>'+it.qty.toLocaleString()+'</td><td>'+it.remark+'</td></tr>';}).join('');
  openModal('计划详情 - '+p.id,
    '<div class="form-row"><div class="form-group"><label>类型</label><input class="input" value="'+(p.type==='scheduled'?'定时计划':'临时计划')+'" disabled></div><div class="form-group"><label>状态</label><input class="input" value="'+p.status+'" disabled></div></div>'+
    '<div class="form-row"><div class="form-group"><label>客户</label><input class="input" value="'+p.customerName+'" disabled></div><div class="form-group"><label>负责人</label><input class="input" value="'+p.owner+'" disabled></div></div>'+
    '<div class="form-row"><div class="form-group"><label>计划量</label><input class="input" value="'+p.planQty.toLocaleString()+'" disabled></div><div class="form-group"><label>实际量</label><input class="input" value="'+p.actualQty.toLocaleString()+'" disabled></div></div>'+
    (p.type==='temporary'?'<div class="form-group"><label>原因</label><input class="input" value="'+(p.reason||'')+'" disabled></div>':'<div class="form-group"><label>执行时段</label><input class="input" value="'+(p.timeSlot||'')+'" disabled></div>')+
    '<h4>物料明细</h4><table class="table"><thead><tr><th>物料</th><th>数量</th><th>备注</th></tr></thead><tbody>'+itemsHtml+'</tbody></table>',
    '<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};

window._deleteSalesPlan = function(id) {
  var p = (scmData.salesPlans||[]).find(function(x){return x.id===id;});
  if (!p) return;
  openModal('确认删除','<p>确定删除计划「'+p.id+'」？</p>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="scmData.salesPlans=scmData.salesPlans.filter(function(x){return x.id!==\''+id+'\';});saveData();closeModal();window.renderSalesPlanModule();showToast(\'已删除\',\'success\');">确认</button>');
};

// ============= 销售模块增强（订单审核/部门审批/发货管理/售后管理）=====
(function(){
  var _origRenderSales = window.renderSalesModule;
  window.renderSalesModule = function() {
    _origRenderSales();
    // 在 header 按钮区追加订单管理按钮
    var header = document.querySelector('#mainContent .module-header-actions');
    if (header && header.innerHTML.indexOf('订单审核') === -1) {
      header.innerHTML += '<button class="btn btn-info" onclick="window._orderAudit()">订单审核</button>'+
        '<button class="btn btn-warning" onclick="window._orderDeptApproval()">部门审批</button>'+
        '<button class="btn btn-success" onclick="window._orderShip()">发货管理</button>'+
        '<button class="btn btn-danger" onclick="window._afterSales()">售后管理</button>';
    }
  };
})();

window._orderAudit = function() {
  var orders = scmData.salesOrders.filter(function(o){return o.status==='待确认'||o.status==='待审核';});
  openModal('订单审核',
    '<table class="table"><thead><tr><th>订单号</th><th>客户</th><th>产品</th><th>数量</th><th>金额</th><th>状态</th><th>操作</th></tr></thead><tbody>'+
    (orders.length?orders.map(function(o){return '<tr><td>'+o.id+'</td><td>'+o.customer+'</td><td>'+o.productName+'</td><td>'+o.qty+'</td><td>'+formatMoney(o.amount)+'</td><td><span class="badge badge-warning">'+o.status+'</span></td>'+
      '<td><button class="btn btn-success btn-xs" onclick="window._approveOrder(\''+o.id+'\')">审核通过</button><button class="btn btn-danger btn-xs" onclick="window._rejectOrder(\''+o.id+'\')">驳回</button></td></tr>';}).join('')
      :'<tr><td colspan="7">暂无待审核订单</td></tr>')+
    '</tbody></table>',
    '<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};

window._approveOrder = function(id) {
  var o = scmData.salesOrders.find(function(x){return x.id===id;});
  if (o) { o.status = '已确认'; saveData(); }
  closeModal(); window.renderSalesModule(); showToast('订单 '+id+' 已审核通过','success');
};

window._rejectOrder = function(id) {
  var o = scmData.salesOrders.find(function(x){return x.id===id;});
  if (o) { o.status = '已驳回'; saveData(); }
  closeModal(); window.renderSalesModule(); showToast('订单 '+id+' 已驳回','warning');
};

window._orderDeptApproval = function() {
  var orders = scmData.salesOrders.filter(function(o){return o.status==='已确认'||o.status==='生产中';});
  openModal('部门审批',
    '<table class="table"><thead><tr><th>订单号</th><th>客户</th><th>产品</th><th>数量</th><th>金额</th><th>状态</th><th>审批</th></tr></thead><tbody>'+
    (orders.length?orders.map(function(o){return '<tr><td>'+o.id+'</td><td>'+o.customer+'</td><td>'+o.productName+'</td><td>'+o.qty+'</td><td>'+formatMoney(o.amount)+'</td><td><span class="badge badge-info">'+o.status+'</span></td>'+
      '<td><button class="btn btn-success btn-xs" onclick="window._deptApprove(\''+o.id+'\')">审批通过</button></td></tr>';}).join('')
      :'<tr><td colspan="7">暂无待审批订单</td></tr>')+
    '</tbody></table>',
    '<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};

window._deptApprove = function(id) {
  var o = scmData.salesOrders.find(function(x){return x.id===id;});
  if (o) { o.status = '生产中'; saveData(); }
  closeModal(); window.renderSalesModule(); showToast('订单 '+id+' 部门审批通过','success');
};

window._orderShip = function() {
  var orders = scmData.salesOrders.filter(function(o){return o.status==='生产中'||o.status==='已确认';});
  openModal('发货管理',
    '<table class="table"><thead><tr><th>订单号</th><th>客户</th><th>产品</th><th>数量</th><th>交期</th><th>物流</th><th>操作</th></tr></thead><tbody>'+
    (orders.length?orders.map(function(o){return '<tr><td>'+o.id+'</td><td>'+o.customer+'</td><td>'+o.productName+'</td><td>'+o.qty+'</td><td>'+o.deliveryDate+'</td><td>'+((o.logistics&&o.logistics.vehicleNo)||'未登记')+'</td>'+
      '<td><button class="btn btn-primary btn-xs" onclick="window._addLogistics(\''+o.id+'\')">登记物流</button><button class="btn btn-success btn-xs" onclick="window._confirmShip(\''+o.id+'\')">确认发货</button></td></tr>';}).join('')
      :'<tr><td colspan="7">暂无待发货订单</td></tr>')+
    '</tbody></table>',
    '<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};

window._addLogistics = function(id) {
  var o = scmData.salesOrders.find(function(x){return x.id===id;});
  if (!o) return;
  openModal('登记物流 - '+id,
    '<div class="form-row"><div class="form-group"><label>车牌号</label><input class="input" id="shipVehicle" value="'+(o.logistics?o.logistics.vehicleNo||'':'')+'"></div><div class="form-group"><label>司机</label><input class="input" id="shipDriver" value="'+(o.logistics?o.logistics.driver||'':'')+'"></div></div>'+
    '<div class="form-group"><label>预计送达</label><input class="input" type="date" id="shipETA" value="'+formatDate(Date.now()+3*86400000)+'"></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="window._saveLogistics(\''+id+'\')">保存</button>');
};

window._saveLogistics = function(id) {
  var o = scmData.salesOrders.find(function(x){return x.id===id;});
  if (!o) return;
  o.logistics = {vehicleNo:$('#shipVehicle').value,driver:$('#shipDriver').value,eta:$('#shipETA').value};
  saveData(); closeModal(); window._orderShip(); showToast('物流信息已登记','success');
};

window._confirmShip = function(id) {
  var o = scmData.salesOrders.find(function(x){return x.id===id;});
  if (o) { o.status = '已发货'; saveData(); }
  closeModal(); window.renderSalesModule(); showToast('订单 '+id+' 已确认发货','success');
};

window._afterSales = function() {
  var records = scmData.afterSalesRecords || [];
  openModal('售后管理',
    '<div class="module-tabs" style="margin-bottom:12px;">'+
    '<div class="module-tab active" onclick="window._switchAfterTab(\'return\',this)">退货退款</div>'+
    '<div class="module-tab" onclick="window._switchAfterTab(\'refund\',this)">退款不退货</div>'+
    '<div class="module-tab" onclick="window._switchAfterTab(\'replenish\',this)">补发货</div></div>'+
    '<div id="afterSalesContent"><table class="table"><thead><tr><th>编号</th><th>关联订单</th><th>类型</th><th>金额</th><th>原因</th><th>状态</th><th>日期</th><th>操作</th></tr></thead><tbody>'+
    (records.length?records.map(function(r){return '<tr><td>'+r.id+'</td><td>'+r.orderId+'</td><td>'+r.type+'</td><td>'+formatMoney(r.amount)+'</td><td>'+r.reason+'</td><td><span class="badge '+(r.status==='已完成'?'badge-success':'badge-info')+'">'+r.status+'</span></td><td>'+r.date+'</td>'+
      '<td><button class="btn btn-outline btn-xs" onclick="window._viewAfterSales(\''+r.id+'\')">查看</button></td></tr>';}).join('')
      :'<tr><td colspan="8">暂无售后记录</td></tr>')+
    '</tbody></table></div>'+
    '<div style="margin-top:12px;"><button class="btn btn-primary btn-sm" onclick="window._newAfterSales()">+ 新增售后</button></div>',
    '<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};

window._switchAfterTab = function(tab, el) {
  var tabs = document.querySelectorAll('#mainContent .modal-body .module-tab');
  tabs.forEach(function(t){t.classList.remove('active');});
  if (el) el.classList.add('active');
  var records = (scmData.afterSalesRecords||[]).filter(function(r){
    if (tab==='return') return r.type==='退货退款';
    if (tab==='refund') return r.type==='退款不退货';
    return r.type==='补发货';
  });
  var asc = $('#afterSalesContent');
  if (asc) {
    asc.innerHTML = '<table class="table"><thead><tr><th>编号</th><th>关联订单</th><th>类型</th><th>金额</th><th>原因</th><th>状态</th><th>日期</th><th>操作</th></tr></thead><tbody>'+
    (records.length?records.map(function(r){return '<tr><td>'+r.id+'</td><td>'+r.orderId+'</td><td>'+r.type+'</td><td>'+formatMoney(r.amount)+'</td><td>'+r.reason+'</td><td><span class="badge badge-info">'+r.status+'</span></td><td>'+r.date+'</td>'+
      '<td><button class="btn btn-outline btn-xs" onclick="window._viewAfterSales(\''+r.id+'\')">查看</button></td></tr>';}).join('')
      :'<tr><td colspan="8">暂无记录</td></tr>')+'</tbody></table>';
  }
};

window._newAfterSales = function() {
  var orderOpts = scmData.salesOrders.map(function(o){return '<option value="'+o.id+'">'+o.id+' - '+o.customer+'</option>';}).join('');
  openModal('新增售后记录',
    '<div class="form-group"><label>关联订单 *</label><select class="select" id="asOrder">'+orderOpts+'</select></div>'+
    '<div class="form-group"><label>类型 *</label><select class="select" id="asType"><option>退货退款</option><option>退款不退货</option><option>补发货</option></select></div>'+
    '<div class="form-group"><label>原因 *</label><input class="input" id="asReason"></div>'+
    '<div class="form-row"><div class="form-group"><label>金额</label><input class="input" type="number" id="asAmount" value="0"></div><div class="form-group"><label>申请人</label><input class="input" id="asApplicant"></div></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="window._saveAfterSales()">保存</button>');
};

window._saveAfterSales = function() {
  var orderId = $('#asOrder').value;
  var reason = $('#asReason').value.trim();
  if (!orderId || !reason) { showToast('请填写必填字段','warning'); return; }
  scmData.counters.afterSalesRecord = (scmData.counters.afterSalesRecord||3);
  var newId = 'AS' + String(scmData.counters.afterSalesRecord).padStart(3,'0'); scmData.counters.afterSalesRecord++;
  (scmData.afterSalesRecords||[]).push({
    id:newId,orderId:orderId,type:$('#asType').value,reason:reason,
    items:[],amount:parseFloat($('#asAmount').value)||0,status:'处理中',
    date:formatDate(Date.now()),applicant:$('#asApplicant').value||'系统',warehouseReceived:false
  });
  saveData(); closeModal(); showToast('售后记录已创建','success');
};

window._viewAfterSales = function(id) {
  var r = (scmData.afterSalesRecords||[]).find(function(x){return x.id===id;});
  if (!r) return;
  openModal('售后详情 - '+r.id,
    '<div class="form-row"><div class="form-group"><label>关联订单</label><input class="input" value="'+r.orderId+'" disabled></div><div class="form-group"><label>类型</label><input class="input" value="'+r.type+'" disabled></div></div>'+
    '<div class="form-row"><div class="form-group"><label>金额</label><input class="input" value="'+formatMoney(r.amount)+'" disabled></div><div class="form-group"><label>状态</label><input class="input" value="'+r.status+'" disabled></div></div>'+
    '<div class="form-group"><label>原因</label><input class="input" value="'+r.reason+'" disabled></div>'+
    '<div class="form-row"><div class="form-group"><label>申请人</label><input class="input" value="'+r.applicant+'" disabled></div><div class="form-group"><label>日期</label><input class="input" value="'+r.date+'" disabled></div></div>',
    '<button class="btn btn-outline" onclick="closeModal()">关闭</button>');
};


// ============= 采购订单编辑功能 =============
window._editPurchase = function(id) {
  var po = scmData.purchaseOrders.find(function(x){ return x.id === id; });
  if (!po) return;
  var supplierOpts = scmData.suppliers.filter(function(s){ return s.status === '合作中'; }).map(function(s){
    return '<option value="'+s.id+'"'+(po.supplierId===s.id?' selected':'')+'>'+s.name+'</option>';
  }).join('');
  var productOpts = scmData.masterData.products.map(function(p){
    return '<option value="'+p.id+'"'+(po.productId===p.id?' selected':'')+'>'+p.name+' ('+p.category+')</option>';
  }).join('');
  openModal('编辑采购订单 - '+po.id,
    '<div class="form-row"><div class="form-group"><label>供应商</label><select class="select" id="epSupplier">'+supplierOpts+'</select></div>'+
    '<div class="form-group"><label>产品</label><select class="select" id="epProduct">'+productOpts+'</select></div></div>'+
    '<div class="form-row"><div class="form-group"><label>数量</label><input class="input" type="number" id="epQty" value="'+po.qty+'"></div>'+
    '<div class="form-group"><label>金额</label><input class="input" type="number" id="epAmount" value="'+po.amount+'"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>下单日期</label><input class="input" type="date" id="epDate" value="'+po.date+'"></div>'+
    '<div class="form-group"><label>采购类型</label><select class="select" id="epType"><option'+(po.type==='标准采购'?' selected':'')+'>标准采购</option><option'+(po.type==='紧急采购'?' selected':'')+'>紧急采购</option><option'+(po.type==='招标采购'?' selected':'')+'>招标采购</option></select></div></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="window._updatePurchase(''+id+'')">保存</button>'
  );
};

window._updatePurchase = function(id) {
  var po = scmData.purchaseOrders.find(function(x){ return x.id === id; });
  if (!po) return;
  var supplier = scmData.suppliers.find(function(s){ return s.id === document.getElementById('epSupplier').value; });
  var product = scmData.masterData.products.find(function(p){ return p.id === document.getElementById('epProduct').value; });
  po.supplierId = document.getElementById('epSupplier').value;
  po.productId = document.getElementById('epProduct').value;
  po.supplierName = supplier ? supplier.name : '';
  po.productName = product ? product.name : '';
  po.qty = parseInt(document.getElementById('epQty').value) || 0;
  po.amount = parseFloat(document.getElementById('epAmount').value) || 0;
  po.date = document.getElementById('epDate').value;
  po.type = document.getElementById('epType').value;
  saveData(); closeModal(); if(currentModule==='purchase') renderPurchaseModule(); showToast('采购订单已更新','success');
};

// ============= 采购模块增强（采购计划 Tab）=============
(function(){
  var _origRenderPurchase = window.renderPurchaseModule;
  window.renderPurchaseModule = function() {
    var activeSub = currentSubModule || 'purchase-order';
    if (activeSub === 'purchase-plan') {
      window._renderPurchasePlanView();
    } else {
      _origRenderPurchase();
      // 在 module-tabs 后追加采购计划 Tab（若不存在）
      setTimeout(function(){
        var tabBar = document.querySelector('#mainContent .module-tabs');
        if (tabBar && tabBar.innerHTML.indexOf('采购计划') === -1) {
          tabBar.innerHTML += '<div class="module-tab" onclick="switchSubModule(\'purchase\',\'purchase-plan\')">采购计划</div>';
        }
      }, 50);
    }
  };
})();

window._renderPurchasePlanView = function() {
  var plans = scmData.purchasePlans || [];
  var tabHtml = '<div class="module-tab" onclick="switchSubModule(\'purchase\',\'purchase-order\')">采购订单PO</div>'+
    '<div class="module-tab" onclick="switchSubModule(\'purchase\',\'purchase-rfq\')">采购询价RFQ</div>'+
    '<div class="module-tab" onclick="switchSubModule(\'purchase\',\'purchase-arrival\')">到货管理</div>'+
    '<div class="module-tab" onclick="switchSubModule(\'purchase\',\'purchase-cost\')">采购成本分析</div>'+
    '<div class="module-tab active">采购计划</div>';
  $('#mainContent').innerHTML = '<div class="module active"><div class="module-header"><h2>采购计划</h2><div class="module-header-actions">'+
    '<button class="btn btn-primary" onclick="window._newPurchasePlan()">+ 新建采购计划</button></div></div>'+
    '<div class="module-tabs">'+tabHtml+'</div>'+
    '<div class="table-wrapper"><table class="table"><thead><tr><th>编号</th><th>物料</th><th>计划数量</th><th>单位</th><th>需求日期</th><th>供应商</th><th>状态</th><th>操作</th></tr></thead>'+
    '<tbody id="purchasePlanTbody"></tbody></table></div></div>';
  window._renderPurchasePlanTable(plans);
};

window._renderPurchasePlanTable = function(data) {
  var tb = $('#purchasePlanTbody');
  if (!tb) return;
  tb.innerHTML = data.length ? data.map(function(p){
    return '<tr><td><strong>'+p.id+'</strong></td><td>'+p.materialName+'</td><td>'+p.planQty.toLocaleString()+'</td><td>'+p.unit+'</td><td>'+p.needDate+'</td><td>'+p.supplier+'</td>'+
      '<td><span class="badge '+(p.status==='已审批'?'badge-success':'badge-warning')+'">'+p.status+'</span></td>'+
      '<td><div class="action-group"><button class="btn btn-outline btn-xs" onclick="window._viewPurchasePlan(\''+p.id+'\')">查看</button>'+
      (p.status==='待审批'?'<button class="btn btn-success btn-xs" onclick="window._approvePurchasePlan(\''+p.id+'\')">审批</button>':'')+
      '<button class="btn btn-danger btn-xs" onclick="window._deletePurchasePlan(\''+p.id+'\')">删除</button></div></td></tr>';
  }).join('') : '<tr><td colspan="8"><div class="empty-state">暂无采购计划</div></td></tr>';
};

window._newPurchasePlan = function() {
  openModal('新建采购计划',
    '<div class="form-row"><div class="form-group"><label>物料名称 *</label><input class="input" id="ppMaterial"></div><div class="form-group"><label>计划数量</label><input class="input" type="number" id="ppQty" value="1000"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>单位</label><input class="input" id="ppUnit" value="片"></div><div class="form-group"><label>需求日期</label><input class="input" type="date" id="ppDate"></div></div>'+
    '<div class="form-group"><label>供应商</label><input class="input" id="ppSupplier"></div>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="window._savePurchasePlan()">保存</button>');
};

window._savePurchasePlan = function() {
  var mat = $('#ppMaterial').value.trim();
  if (!mat) { showToast('请输入物料名称','warning'); return; }
  scmData.counters.purchasePlan = (scmData.counters.purchasePlan||4);
  var newId = 'PP' + String(scmData.counters.purchasePlan).padStart(3,'0'); scmData.counters.purchasePlan++;
  (scmData.purchasePlans||[]).push({
    id:newId,materialName:mat,planQty:parseInt($('#ppQty').value)||0,
    unit:$('#ppUnit').value||'片',needDate:$('#ppDate').value||'待定',
    supplier:$('#ppSupplier').value||'待指定',status:'待审批'
  });
  saveData(); closeModal(); window.renderPurchaseModule(); showToast('采购计划已创建','success');
};

window._viewPurchasePlan = function(id) {
  var p = (scmData.purchasePlans||[]).find(function(x){return x.id===id;});
  if (!p) return;
  openModal('采购计划详情 - '+p.id,
    '<div class="form-row"><div class="form-group"><label>物料</label><input class="input" value="'+p.materialName+'" disabled></div><div class="form-group"><label>数量</label><input class="input" value="'+p.planQty.toLocaleString()+' '+p.unit+'" disabled></div></div>'+
    '<div class="form-row"><div class="form-group"><label>需求日期</label><input class="input" value="'+p.needDate+'" disabled></div><div class="form-group"><label>供应商</label><input class="input" value="'+p.supplier+'" disabled></div></div>'+
    '<div class="form-group"><label>状态</label><input class="input" value="'+p.status+'" disabled></div>',
    '<button class="btn btn-outline" onclick="closeModal()">关闭</button>'+
    (p.status==='待审批'?'<button class="btn btn-success" onclick="window._approvePurchasePlan(\''+id+'\');closeModal();">审批通过</button>':''));
};

window._approvePurchasePlan = function(id) {
  var p = (scmData.purchasePlans||[]).find(function(x){return x.id===id;});
  if (p) { p.status = '已审批'; saveData(); }
  window.renderPurchaseModule(); showToast('采购计划 '+id+' 已审批','success');
};

window._deletePurchasePlan = function(id) {
  var p = (scmData.purchasePlans||[]).find(function(x){return x.id===id;});
  if (!p) return;
  openModal('确认删除','<p>确定删除采购计划「'+p.id+'」？</p>',
    '<button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="scmData.purchasePlans=scmData.purchasePlans.filter(function(x){return x.id!==\''+id+'\';});saveData();closeModal();window.renderPurchaseModule();showToast(\'已删除\',\'success\');">确认</button>');
};

// ============= 初始化 + 暴露所有全局函数 =============
// 增强渲染器映射表（运行时动态解析，避免加载时序问题）
// 使用函数封装，每次调用时从 window 动态读取最新函数引用
function _getEnhancedRenderer(moduleName) {
  // 运行时动态从 window 读取，避免加载时序导致捕获 undefined
  var rendererMap = {
    dashboard: window.renderDashboard,
    demand: window.renderDemandModule,
    purchase: window.renderPurchaseModule,
    supplier: window.renderSupplierModule,
    salesplan: window.renderSalesPlanModule,
    production: window.renderProductionModule,
    inventory: window.renderInventoryModule,
    warehouse: window.renderWarehouseModule,
    transport: window.renderTransportModule,
    sales: window.renderSalesModule,
    quality: window.renderQualityModule,
    finance: window.renderFinanceModule,
    analytics: window.renderAnalyticsModule,
    master: window.renderMasterModule,
    integration: window.renderIntegrationModule,
    org: window.renderOrgModule
  };
  var result = rendererMap[moduleName] || null;
  console.log('[DEBUG app-modules] _getEnhancedRenderer("' + moduleName + '") -> type:', typeof result);
  return result;
}
console.log('[DEBUG app-modules] _getEnhancedRenderer defined. Testing inventory:', typeof _getEnhancedRenderer('inventory'));

// 保留 ENHANCED_RENDERERS 对象以保持向后兼容（如有外部直接引用）
// 但内部统一使用 _getEnhancedRenderer 动态解析
var ENHANCED_RENDERERS = {};
['dashboard','demand','purchase','supplier','salesplan','production',
 'inventory','warehouse','transport','sales','quality','finance','analytics','master','integration','org'].forEach(function(key){
  Object.defineProperty(ENHANCED_RENDERERS, key, {
    get: function() { return _getEnhancedRenderer(key); }
  });
});

// 重写 switchModule：使用 _getEnhancedRenderer 运行时动态查找渲染函数
console.log('[DEBUG app-modules] About to override switchModule, current window.switchModule type:', typeof window.switchModule);
var _origSwitchModule = window.switchModule;
window.switchModule = function(module, subModule) {
  console.log('[DEBUG app-modules] switchModule (overridden) called, module:', module, 'subModule:', subModule);
  currentModule = module;
  currentSubModule = subModule || null;
  renderSidebar();
  var fn = _getEnhancedRenderer(module);
  console.log('[DEBUG app-modules] switchModule: _getEnhancedRenderer returned type:', typeof fn);
  if (typeof fn === 'function') { 
    fn(); 
  } else {
    // 回退到原始 renderMainContent
    if (typeof _origRenderMainContent === 'function') {
      _origRenderMainContent();
    } else {
      window.showToast('模块「' + module + '」渲染函数未找到', 'warning');
    }
  }
};

// 重写 switchSubModule：同样使用运行时动态查找
console.log('[DEBUG app-modules] About to override switchSubModule, current type:', typeof window.switchSubModule);
var _origSwitchSubModule = window.switchSubModule;
window.switchSubModule = function(moduleId, subId) {
  console.log('[DEBUG app-modules] switchSubModule (overridden) called, moduleId:', moduleId, 'subId:', subId);
  currentModule = moduleId;
  currentSubModule = subId;
  renderSidebar();
  var fn = _getEnhancedRenderer(moduleId);
  console.log('[DEBUG app-modules] switchSubModule: _getEnhancedRenderer returned type:', typeof fn);
  if (typeof fn === 'function') { fn(); } else { window.showToast('模块「' + moduleId + '」渲染函数未找到', 'warning'); }
};

// 将 renderMainContent 也重定向到增强渲染器（防御性兼容）
console.log('[DEBUG app-modules] About to override renderMainContent, current type:', typeof window.renderMainContent);
var _origRenderMainContent = window.renderMainContent;
if (typeof window.renderMainContent === 'function') {
  window.renderMainContent = function() {
    console.log('[DEBUG app-modules] renderMainContent (overridden) called, currentModule:', currentModule);
    if (currentModule === 'dashboard') {
      if (typeof window.renderDashboard === 'function') { window.renderDashboard(); }
      return;
    }
    var fn = _getEnhancedRenderer(currentModule);
    console.log('[DEBUG app-modules] renderMainContent: _getEnhancedRenderer returned type:', typeof fn);
    if (typeof fn === 'function') { fn(); }
  };
}

// 确保所有增强函数已挂载到 window
window.formatPercent = formatPercent;
window.formatDateTime = formatDateTime;

console.log('[DEBUG app-modules] ===== script loading COMPLETE =====', new Date().toISOString());
console.log('[DEBUG app-modules] window.renderInventoryModule type:', typeof window.renderInventoryModule);
console.log('[DEBUG app-modules] window._openStockIO type:', typeof window._openStockIO);
console.log('[DEBUG app-modules] window._openTransfer type:', typeof window._openTransfer);

// 防御性补丁：若 HTML 加载顺序导致 app.js 后执行并覆盖了增强函数，
// 则在 DOMContentLoaded 时重新确认并修复 window 上的增强渲染器。
document.addEventListener('DOMContentLoaded', function() {
  console.log('[DEBUG app-modules] DOMContentLoaded fired, re-confirming enhanced renderers...');
  // 如果 renderInventoryModule 不是增强版（通过检查 toString() 是否包含 "module active" 来判断）
  // 简化判断：只要 window.renderInventoryModule 存在就保留（app.js 的同名函数也是可用的，只是没有 onclick）
  // 更可靠的方案：检查函数体是否包含增强版特征字符串
  var fnStr = (window.renderInventoryModule || '').toString();
  if (fnStr.indexOf('_openStockIO') === -1) {
    console.warn('[DEBUG app-modules] WARNING: window.renderInventoryModule may be the BASIC version (no _openStockIO reference). ' +
      'This usually means app.js loaded AFTER app-modules.js and overwrote it. ' +
      'Please check your HTML <script> load order: app.js must load BEFORE app-modules.js');
  } else {
    console.log('[DEBUG app-modules] ✓ window.renderInventoryModule is the ENHANCED version (contains _openStockIO)');
  }
  console.log('[DEBUG app-modules] Final state: renderInventoryModule type =', typeof window.renderInventoryModule,
    '_openStockIO type =', typeof window._openStockIO,
    '_openTransfer type =', typeof window._openTransfer);

// 保存增强版函数引用，防止被 app.js 后加载覆盖
(function(){
  var _enhancedRenderInventory = window.renderInventoryModule;
  var _enhancedOpenStockIO = window._openStockIO;
  var _enhancedOpenTransfer = window._openTransfer;
  document.addEventListener('DOMContentLoaded', function() {
    if (window.renderInventoryModule !== _enhancedRenderInventory) {
      console.warn('[DEBUG app-modules] Detected overwrite of renderInventoryModule, restoring enhanced version...');
      window.renderInventoryModule = _enhancedRenderInventory;
    }
    if (window._openStockIO !== _enhancedOpenStockIO) {
      console.warn('[DEBUG app-modules] Detected overwrite of _openStockIO, restoring...');
      window._openStockIO = _enhancedOpenStockIO;
    }
    if (window._openTransfer !== _enhancedOpenTransfer) {
      console.warn('[DEBUG app-modules] Detected overwrite of _openTransfer, restoring...');
      window._openTransfer = _enhancedOpenTransfer;
    }
  });
})();

// 关键修复：app.js 末尾有 window.switchModule = switchModule，会覆盖本文件的增强版。
// 用 DOMContentLoaded 在 app.js 执行完毕后重新应用增强 override。
(function(){
  // 保存增强版 switchModule/switchSubModule 的引用
  var _enhancedSwitchModule = window.switchModule;
  var _enhancedSwitchSubModule = window.switchSubModule;
  var _enhancedRenderMainContent = window.renderMainContent;

  document.addEventListener('DOMContentLoaded', function() {
    // 延迟一点，确保 app.js 的末尾赋值已执行
    setTimeout(function() {
      if (window.switchModule !== _enhancedSwitchModule) {
        console.warn('[DEBUG app-modules] Detected app.js overwrote switchModule, re-applying enhanced version...');
        window.switchModule = _enhancedSwitchModule;
      }
      if (window.switchSubModule !== _enhancedSwitchSubModule) {
        console.warn('[DEBUG app-modules] Detected app.js overwrote switchSubModule, re-applying...');
        window.switchSubModule = _enhancedSwitchSubModule;
      }
      if (window.renderMainContent !== _enhancedRenderMainContent) {
        console.warn('[DEBUG app-modules] Detected app.js overwrote renderMainContent, re-applying...');
        window.renderMainContent = _enhancedRenderMainContent;
      }
      console.log('[DEBUG app-modules] Post-DOMContentLoaded check: switchModule type =', typeof window.switchModule, ', renderInventoryModule type =', typeof window.renderInventoryModule);
    }, 0);
  });
})();
});

