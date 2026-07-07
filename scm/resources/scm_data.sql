-- =============================================
-- SCM 供应链管理系统演示数据
-- 基于 localStorage 中的 defaultData
-- =============================================

USE scm_db;

-- 清空表（按外键顺序）
DELETE FROM after_sales_records;
DELETE FROM sales_orders;
DELETE FROM sales_plans;
DELETE FROM customer_price_lists;
DELETE FROM customer_addresses;
DELETE FROM customer_contacts;
DELETE FROM customers;
DELETE FROM transport_orders;
DELETE FROM purchase_orders;
DELETE FROM suppliers;
DELETE FROM warehouse_operations;
DELETE FROM inventory;
DELETE FROM warehouses;
DELETE FROM production_orders;
DELETE FROM materials;
DELETE FROM quality_inspections;
DELETE FROM financial_records;
DELETE FROM bi_reports;
DELETE FROM integrations;
DELETE FROM demand_plans;
DELETE FROM purchase_plans;
DELETE FROM employees;
DELETE FROM roles;
DELETE FROM departments;
DELETE FROM boms;

-- =============================================
-- 1. 物料/产品主数据
-- =============================================
INSERT INTO materials (id, name, category, spec, unit, price, uom) VALUES
('PRD001', 'STM32F407VET6 微控制器', '电子元器件', 'ARM Cortex-M4, 168MHz', '片', 45.50, 'PCS'),
('PRD002', '铝制散热片 40x40mm', '机械部件', '40x40x10mm, 6063铝合金', '个', 3.20, 'PCS'),
('PRD003', '防静电PE包装袋', '包装材料', '200x300mm, 0.08mm厚', '个', 0.35, 'PCS'),
('PRD004', '环氧树脂 AB胶', '化工原料', 'A:B=2:1, 5kg装', '桶', 280.00, 'KIT'),
('PRD005', 'ESP32-WROOM-32E 模组', '电子元器件', 'WiFi+蓝牙, 4MB Flash', '片', 18.00, 'PCS'),
('PRD006', '工业级开关电源 12V 10A', '电子元器件', '输入AC220V, 输出DC12V/10A', '台', 65.00, 'PCS');

-- =============================================
-- 2. 客户主数据
-- =============================================
INSERT INTO customers (id, name, category, contact, phone, address) VALUES
('CUST001', '华为技术有限公司', '战略客户', '任先生', '13800138111', '深圳龙岗'),
('CUST002', '小米科技有限公司', '核心客户', '雷先生', '13800138222', '北京海淀'),
('CUST003', '比亚迪股份有限公司', '战略客户', '王先生', '13800138333', '深圳坪山'),
('CUST004', '美的集团', '核心客户', '方女士', '13800138444', '佛山顺德');

-- =============================================
-- 3. 仓库主数据
-- =============================================
INSERT INTO warehouses (id, name, warehouse_type, location, manager, capacity) VALUES
('WH01', 'A仓-电子仓', '原材料仓', '深圳工厂A栋', '张经理', 10000),
('WH02', 'B仓-机械仓', '原材料仓', '深圳工厂B栋', '李经理', 8000),
('WH03', 'C仓-包材仓', '包材仓', '深圳工厂C栋', '王经理', 15000),
('WH04', 'D仓-化工仓', '危险品仓', '深圳工厂D栋', '赵经理', 5000);

-- =============================================
-- 4. BOM 物料清单
-- =============================================
INSERT INTO boms (id, material_id, version, components, level, status) VALUES
('BOM001', 'PRD001', 'V2.1', '["PCB基板", "芯片", "电容", "电阻"]', 3, '生效'),
('BOM002', 'PRD005', 'V3.0', '["PCB基板", "ESP32", "天线", "Flash"]', 2, '生效');

-- =============================================
-- 5. 需求计划
-- =============================================
INSERT INTO demand_plans (id, name, plan_type, product, plan_month, forecast_qty, confidence, status) VALUES
('DP001', '2026Q3销售预测', '销售预测', '电子产品', '2026-07', 5000, 0.85, '已审核'),
('DP002', 'MPS主生产计划', '主生产计划', '机械部件', '2026-08', 2000, 0.90, '执行中'),
('DP003', 'MRP物料需求', '物料需求计划', '包装材料', '2026-08', 15000, 0.80, '待审核'),
('DP004', '产能计划', '产能计划', '成品组装', '2026-09', 1000, 0.75, '草稿');

-- =============================================
-- 6. 供应商管理SRM
-- =============================================
INSERT INTO suppliers (id, name, category, contact, phone, rating, status, supplier_type, score) VALUES
('SUP001', '深圳华强电子有限公司', '电子元器件', '张伟', '13800138001', 5, '合作中', '战略供应商', 95),
('SUP002', '东莞精密机械制造厂', '机械部件', '李娜', '13800138002', 4, '合作中', '核心供应商', 88),
('SUP003', '惠州包装材料有限公司', '包装材料', '王磊', '13800138003', 3, '合作中', '一般供应商', 75),
('SUP004', '广州化工原料供应有限公司', '化工原料', '陈静', '13800138004', 4, '合作中', '核心供应商', 90),
('SUP005', '顺丰速运供应链服务', '物流服务', '刘洋', '13800138005', 5, '合作中', '战略供应商', 98),
('SUP006', '上海博通半导体有限公司', '电子元器件', '赵敏', '13800138006', 4, '合作中', '核心供应商', 85),
('SUP007', '苏州工业园区设备制造有限公司', '设备供应', '孙涛', '13800138007', 3, '暂停合作', '一般供应商', 65),
('SUP008', '佛山金属材料加工有限公司', '原材料', '周杰', '13800138008', 4, '合作中', '核心供应商', 82);

-- =============================================
-- 7. 采购订单
-- =============================================
INSERT INTO purchase_orders (id, material_id, product_name, supplier_id, supplier_name, qty, amount, order_date, status, purchase_type) VALUES
('PO2024050001', 'PRD001', 'STM32F407VET6 微控制器', 'SUP001', '深圳华强电子有限公司', 500, 22750, '2026-05-15', '已审批', '标准采购'),
('PO2024050002', 'PRD003', '防静电PE包装袋', 'SUP005', '顺丰速运供应链服务', 10000, 3500, '2026-05-17', '待审批', '紧急采购'),
('PO2024050003', 'PRD002', '铝制散热片 40x40mm', 'SUP002', '东莞精密机械制造厂', 2000, 6400, '2026-05-10', '已审批', '标准采购'),
('PO2024050004', 'PRD005', 'ESP32-WROOM-32E 模组', 'SUP004', '深圳比亚迪电子有限公司', 3000, 54000, '2026-05-12', '已发货', '标准采购');

-- =============================================
-- 8. 生产工单
-- =============================================
INSERT INTO production_orders (id, material_id, qty, start_date, end_date, status, workshop, priority) VALUES
('WO001', 'PRD001', 1000, '2026-05-20', '2026-05-25', '生产中', 'SMT车间', '高'),
('WO002', 'PRD002', 5000, '2026-05-18', '2026-05-22', '已完成', '机加车间', '中'),
('WO003', 'PRD005', 2000, '2026-05-22', '2026-05-28', '待排产', '组装车间', '高'),
('WO004', 'PRD006', 500, '2026-05-25', '2026-05-30', '计划中', '测试车间', '中');

-- =============================================
-- 9. 库存
-- =============================================
INSERT INTO inventory (id, material_id, product_name, sku, category, warehouse_id, warehouse_name, qty, logical_qty, safety_stock, location, status) VALUES
('INV001', 'PRD001', 'STM32F407VET6 微控制器', 'IC-MCU-001', '电子元器件', 'WH01', 'A仓-电子仓', 1200, 1200, 500, 'A-01-02', '正常'),
('INV002', 'PRD002', '铝制散热片 40x40mm', 'MECH-HS-001', '机械部件', 'WH02', 'B仓-机械仓', 450, 450, 500, 'B-02-03', '预警'),
('INV003', 'PRD003', '防静电PE包装袋', 'PKG-PE-001', '包装材料', 'WH03', 'C仓-包材仓', 35000, 35000, 10000, 'C-03-01', '正常'),
('INV004', 'PRD004', '环氧树脂 AB胶', 'CHM-EP-001', '化工原料', 'WH04', 'D仓-化工仓', 15, 15, 30, 'D-01-05', '预警'),
('INV005', 'PRD005', 'ESP32-WROOM-32E 模组', 'IC-WIFI-001', '电子元器件', 'WH01', 'A仓-电子仓', 2500, 2500, 500, 'A-02-01', '正常'),
('INV006', 'PRD006', '工业级开关电源 12V 10A', 'PWR-SW-001', '电子元器件', 'WH01', 'A仓-电子仓', 80, 80, 100, 'A-03-04', '预警');

-- =============================================
-- 10. 仓储操作记录
-- =============================================
INSERT INTO warehouse_operations (id, operation_type, material_id, product_name, qty, warehouse_id, from_warehouse, to_warehouse, operator, operation_date, status) VALUES
('WH001', '入库', 'PRD001', 'STM32F407VET6 微控制器', 500, 'WH01', NULL, NULL, '张三', '2026-05-15', '已完成'),
('WH002', '出库', 'PRD002', '铝制散热片 40x40mm', 200, 'WH02', NULL, NULL, '李四', '2026-05-16', '已完成'),
('WH003', '移库', 'PRD003', '防静电PE包装袋', 1000, 'WH03', 'C仓-包材仓', '临时仓', '王五', '2026-05-17', '进行中'),
('WH004', '盘点', 'PRD004', '环氧树脂 AB胶', 15, 'WH04', NULL, NULL, '赵六', '2026-05-18', '待审核');

-- =============================================
-- 11. 运输单
-- =============================================
INSERT INTO transport_orders (id, order_id, from_location, to_location, carrier, vehicle, driver, start_date, end_date, status, cost) VALUES
('TR001', 'PO2024050001', '深圳', '上海', '顺丰速运', '粤B12345', '张师傅', '2026-05-16', '2026-05-18', '运输中', 1200),
('TR002', 'PO2024050003', '东莞', '广州', '德邦物流', '粤A56789', '李师傅', '2026-05-12', '2026-05-13', '已完成', 800),
('TR003', 'PO2024050004', '广州', '深圳', '中通快递', '粤C34567', '王师傅', '2026-05-10', '2026-05-11', '已完成', 500),
('TR004', 'PO2024050002', '惠州', '深圳', '京东物流', '粤D78901', '赵师傅', '2026-05-20', '2026-05-21', '待发运', 600);

-- =============================================
-- 12. 销售订单
-- =============================================
INSERT INTO sales_orders (id, customer_id, customer_name, material_id, product_name, qty, amount, order_date, delivery_date, status, priority) VALUES
('SO001', 'CUST001', '华为技术有限公司', 'PRD001', 'STM32F407VET6 微控制器', 1000, 45500, '2026-05-10', '2026-05-25', '生产中', '高'),
('SO002', 'CUST002', '小米科技有限公司', 'PRD005', 'ESP32-WROOM-32E 模组', 5000, 90000, '2026-05-12', '2026-05-30', '已确认', '高'),
('SO003', 'CUST003', '比亚迪股份有限公司', 'PRD002', '铝制散热片 40x40mm', 20000, 64000, '2026-05-05', '2026-05-20', '已发货', '中'),
('SO004', 'CUST004', '美的集团', 'PRD006', '工业级开关电源 12V 10A', 200, 13000, '2026-05-15', '2026-05-28', '待确认', '中');

-- =============================================
-- 13. 质量检验
-- =============================================
INSERT INTO quality_inspections (id, inspection_type, material_id, product_name, batch, workshop, customer_name, inspector, inspection_date, result, defect_rate) VALUES
('QI001', '来料检验', 'PRD001', 'STM32F407VET6 微控制器', 'B20240501', NULL, NULL, '质检员A', '2026-05-16', '合格', 0.01),
('QI002', '制程检验', 'PRD002', '铝制散热片 40x40mm', 'B20240502', '机加车间', NULL, '质检员B', '2026-05-17', '不合格', 0.05),
('QI003', '出货检验', 'PRD005', 'ESP32-WROOM-32E 模组', 'B20240503', NULL, '小米', '质检员C', '2026-05-18', '合格', 0.02),
('QI004', '来料检验', 'PRD004', '环氧树脂 AB胶', 'B20240504', NULL, NULL, '质检员A', '2026-05-19', '合格', 0.01);

-- =============================================
-- 14. 财务记录
-- =============================================
INSERT INTO financial_records (id, record_type, order_id, supplier_id, supplier_name, customer_name, carrier, amount, record_date, status) VALUES
('FIN001', '采购付款', 'PO2024050001', 'SUP001', '深圳华强电子有限公司', NULL, NULL, 22750, '2026-05-20', '已支付'),
('FIN002', '物流费用', 'TR001', NULL, NULL, NULL, '顺丰速运', 1200, '2026-05-18', '待支付'),
('FIN003', '销售收款', 'SO001', NULL, NULL, '华为技术有限公司', NULL, 45500, '2026-05-15', '已收款'),
('FIN004', '采购付款', 'PO2024050003', 'SUP002', '东莞精密机械制造厂', NULL, NULL, 6400, '2026-05-12', '已支付');

-- =============================================
-- 15. BI 报表
-- =============================================
INSERT INTO bi_reports (id, name, bi_type, period, value, target, status) VALUES
('BI001', '库存周转分析', '库存分析', '2026-05', 5.2, 6.0, '需关注'),
('BI002', '供应商准时交付率', '供应商分析', '2026-05', 0.95, 0.97, '良好'),
('BI003', '采购成本分析', '采购分析', '2026-05', 0.88, 0.85, '需优化'),
('BI004', '订单准时交付率', 'OTD分析', '2026-05', 0.92, 0.95, '需提升');

-- =============================================
-- 16. 系统集成
-- =============================================
INSERT INTO integrations (id, system_name, integration_type, status, last_sync, frequency) VALUES
('INT001', 'ERP', '数据同步', '正常', '2026-05-20 10:30:00', '实时'),
('INT002', 'MES', '生产指令', '正常', '2026-05-20 09:15:00', '每5分钟'),
('INT003', 'WMS', '库存同步', '正常', '2026-05-20 11:00:00', '实时'),
('INT004', 'TMS', '运输状态', '告警', '2026-05-19 16:20:00', '每10分钟'),
('INT005', 'OA', '审批流程', '正常', '2026-05-20 08:45:00', '实时');

-- =============================================
-- 17. 组织架构
-- =============================================
INSERT INTO departments (id, name, code, parent_id, manager, member_count, sort_order) VALUES
('D001', '总经理办公室', 'GM', NULL, '张总', 3, 1),
('D002', '销售部', 'SALES', NULL, '陈明', 12, 2),
('D003', '华南销售组', 'SALES-SC', 'D002', '陈明', 5, 1),
('D004', '华北销售组', 'SALES-NC', 'D002', '刘芳', 4, 2),
('D005', '华东销售组', 'SALES-EC', 'D002', '李伟', 3, 3),
('D006', '采购部', 'PURCH', NULL, '赵磊', 8, 3),
('D007', '原料采购组', 'PURCH-RM', 'D006', '赵磊', 4, 1),
('D008', '设备采购组', 'PURCH-EQ', 'D006', '钱进', 4, 2),
('D009', '仓储物流部', 'WHLG', NULL, '王强', 6, 4),
('D010', '财务部', 'FIN', NULL, '周华', 5, 5),
('D011', '人力资源部', 'HR', NULL, '吴芳', 3, 6),
('D012', '售后服务部', 'AFSALES', NULL, '郑刚', 4, 7);

INSERT INTO roles (id, name, code, permissions) VALUES
('R001', '系统管理员', 'ADMIN', '["全部权限"]'),
('R002', '销售经理', 'SALES_MGR', '["客户管理","订单管理","销售计划"]'),
('R003', '销售专员', 'SALES_REP', '["客户管理","订单录入","销售计划查看"]'),
('R004', '采购经理', 'PURCH_MGR', '["采购计划","物料管理","供应商管理"]'),
('R005', '仓库主管', 'WH_MGR', '["物流管理","入库管理","出库管理"]'),
('R006', '财务审核员', 'FIN_AUDITOR', '["订单审批","售后审批","对账管理"]'),
('R007', '售后专员', 'AFTER_REP', '["售后管理","退货处理","退款处理"]'),
('R008', '只读用户', 'READONLY', '["数据查看","报表查看"]');

INSERT INTO employees (id, name, code, dept_id, role_id, phone, email, status, join_date) VALUES
('E001', '陈明', 'CM001', 'D002', 'R002', '13800138001', 'chenming@scm.com', '在职', '2023-01-15'),
('E002', '刘芳', 'LF002', 'D004', 'R002', '13800138002', 'liufang@scm.com', '在职', '2023-03-20'),
('E003', '王强', 'WQ003', 'D009', 'R005', '13800138003', 'wangqiang@scm.com', '在职', '2023-05-10'),
('E004', '赵磊', 'ZL004', 'D006', 'R004', '13800138004', 'zhaolei@scm.com', '在职', '2023-02-08'),
('E005', '李伟', 'LW005', 'D005', 'R002', '13800138005', 'liwe@scm.com', '在职', '2023-07-01'),
('E006', '周华', 'ZH006', 'D010', 'R006', '13800138006', 'zhouhua@scm.com', '在职', '2023-04-18'),
('E007', '郑刚', 'ZG007', 'D012', 'R007', '13800138007', 'zhenggang@scm.com', '在职', '2023-08-12'),
('E008', '吴芳', 'WF008', 'D011', 'R001', '13800138008', 'wufang@scm.com', '在职', '2023-01-05'),
('E009', '钱进', 'QJ009', 'D008', 'R004', '13800138009', 'qianjin@scm.com', '在职', '2023-09-22'),
('E010', '孙悦', 'SY010', 'D007', 'R003', '13800138010', 'sunyue@scm.com', '在职', '2024-02-14');

-- =============================================
-- 18. 客户关系扩展
-- =============================================
INSERT INTO customer_contacts (id, customer_id, name, role, phone, email) VALUES
('CT001', 'CUST001', '张经理', '采购总监', '13900139111', 'zhang@huawei.com'),
('CT002', 'CUST001', '李主管', '采购专员', '13900139222', 'li@huawei.com'),
('CT003', 'CUST002', '王采购', '采购经理', '13900139333', 'wang@xiaomi.com'),
('CT004', 'CUST003', '赵专员', '采购专员', '13900139444', 'zhao@byd.com');

INSERT INTO customer_addresses (id, customer_id, address_type, province, city, detail, is_default) VALUES
('AD001', 'CUST001', '收货地址', '广东省', '深圳市', '龙岗区坂田华为基地B3-2F', 1),
('AD002', 'CUST002', '收货地址', '北京市', '海淀区', '清河中街68号小米科技园A栋', 1),
('AD003', 'CUST001', '开票地址', '广东省', '深圳市', '龙岗区坂田华为总部财务部', 0),
('AD004', 'CUST003', '收货地址', '广东省', '深圳市', '坪山区比亚迪路3009号', 1);

INSERT INTO customer_price_lists (id, customer_id, material_id, base_price, min_price, tiers) VALUES
('PL001', 'CUST001', 'PRD001', 45.50, 38.00, '[{"minQty":1,"maxQty":500,"price":45.50},{"minQty":501,"maxQty":3000,"price":42.00},{"minQty":3001,"maxQty":null,"price":39.00}]'),
('PL002', 'CUST001', 'PRD005', 18.00, 14.50, '[{"minQty":1,"maxQty":1000,"price":18.00},{"minQty":1001,"maxQty":5000,"price":16.00},{"minQty":5001,"maxQty":null,"price":14.50}]'),
('PL003', 'CUST002', 'PRD001', 46.00, 39.00, '[{"minQty":1,"maxQty":300,"price":46.00},{"minQty":301,"maxQty":2000,"price":43.00},{"minQty":2001,"maxQty":null,"price":40.00}]'),
('PL004', 'CUST003', 'PRD002', 3.50, 2.80, '[{"minQty":1,"maxQty":5000,"price":3.50},{"minQty":5001,"maxQty":20000,"price":3.20},{"minQty":20001,"maxQty":null,"price":2.80}]');

-- =============================================
-- 19. 销售计划
-- =============================================
INSERT INTO sales_plans (id, plan_type, customer_id, customer_name, product_name, plan_qty, actual_qty, plan_month, owner, status, week_days, time_slot, auto_generate, create_date, reason, items) VALUES
('SP001', 'scheduled', 'CUST001', '华为技术有限公司', 'STM32F407VET6', 20000, 12500, '2026-05', '陈明', '执行中', '[1,3,5]', '09:00-12:00', 1, NULL, NULL, '[{"materialName":"STM32F407VET6","qty":20000,"remark":"月度主计划"}]'),
('SP002', 'scheduled', 'CUST002', '小米科技有限公司', 'ESP32模组', 15000, 9800, '2026-05', '刘芳', '执行中', '[2,4]', '14:00-17:00', 1, NULL, NULL, '[{"materialName":"ESP32-WROOM-32E","qty":15000,"remark":"无线模组供应"}]'),
('SP003', 'scheduled', 'CUST003', '比亚迪股份有限公司', '铝制散热片', 30000, 21000, '2026-05', '王强', '执行中', '[1,2,3,4,5]', '08:00-18:00', 1, NULL, NULL, '[{"materialName":"铝制散热片","qty":30000,"remark":"新能源配套"}]'),
('SP004', 'temporary', 'CUST001', '华为技术有限公司', 'STM32F407VET6', 5000, 3200, '2026-05', '陈明', '执行中', NULL, NULL, 0, '2026-05-20', '紧急客户补单', '[{"materialName":"STM32F407VET6","qty":5000,"remark":"紧急补单"}]'),
('SP005', 'temporary', 'CUST004', '美的集团', 'PCB基板 FR-4', 8000, 4500, '2026-05', '刘芳', '执行中', NULL, NULL, 0, '2026-05-23', '产线临时增补', '[{"materialName":"PCB基板 FR-4","qty":8000,"remark":"产线增补"}]');

-- =============================================
-- 20. 采购计划
-- =============================================
INSERT INTO purchase_plans (id, material_name, plan_qty, unit, need_date, supplier_name, status) VALUES
('PP001', 'PCB基板 FR-4', 50000, '片', '2026-06-01', '深南电路', '待审批'),
('PP002', 'ARM Cortex-M4芯片', 8000, '片', '2026-06-05', 'ST原厂', '已审批'),
('PP003', '铝型材6063', 12000, 'kg', '2026-06-10', '凤铝铝业', '待审批');

-- =============================================
-- 21. 售后记录
-- =============================================
INSERT INTO after_sales_records (id, order_id, as_type, reason, items, amount, status, record_date, applicant, warehouse_received) VALUES
('AS001', 'SO003', '退货退款', '规格不符', '[{"code":"M-STM32-001","name":"STM32F407VET6","spec":"LQFP-100","qty":200,"price":42.00,"amount":8400}]', 8400, '处理中', '2026-05-18', '王强', 0),
('AS002', 'SO001', '退款不退货', '价格争议', '[{"code":"M-STM32-001","name":"STM32F407VET6","spec":"LQFP-100","qty":500,"price":42.00,"amount":21000}]', 5000, '处理中', '2026-05-22', '陈明', 0);

-- =============================================
-- 验证数据导入
-- =============================================
SELECT 'Data import completed!' AS status;
SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA='scm_db' ORDER BY TABLE_NAME;
