-- =============================================
-- SCM 供应链管理系统 MySQL 建库建表脚本
-- 数据库版本：1.0 | 字符集：utf8mb4
-- =============================================

CREATE DATABASE IF NOT EXISTS scm_db
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE scm_db;

-- =============================================
-- 模块1：基础数据管理
-- =============================================

DROP TABLE IF EXISTS customer_price_lists;
DROP TABLE IF EXISTS customer_addresses;
DROP TABLE IF EXISTS customer_contacts;
DROP TABLE IF EXISTS after_sales_records;
DROP TABLE IF EXISTS sales_orders;
DROP TABLE IF EXISTS sales_plans;
DROP TABLE IF EXISTS quality_inspections;
DROP TABLE IF EXISTS bi_reports;
DROP TABLE IF EXISTS financial_records;
DROP TABLE IF EXISTS transport_orders;
DROP TABLE IF EXISTS purchase_plans;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS warehouse_operations;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS production_orders;
DROP TABLE IF EXISTS demand_plans;
DROP TABLE IF EXISTS boms;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS integrations;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS warehouses;
DROP TABLE IF EXISTS materials;

CREATE TABLE materials (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    spec VARCHAR(200),
    unit VARCHAR(20),
    price DECIMAL(12,2),
    uom VARCHAR(10),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE customers (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    contact VARCHAR(50),
    phone VARCHAR(20),
    address VARCHAR(200),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE warehouses (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    warehouse_type VARCHAR(50),
    location VARCHAR(200),
    manager VARCHAR(50),
    capacity INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE boms (
    id VARCHAR(20) PRIMARY KEY,
    material_id VARCHAR(20),
    version VARCHAR(20),
    components JSON,
    level INT,
    status VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials(id)
) ENGINE=InnoDB;

-- =============================================
-- 模块2：需求与计划管理
-- =============================================

CREATE TABLE demand_plans (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    plan_type VARCHAR(30) NOT NULL,
    product VARCHAR(100),
    plan_month VARCHAR(7),
    forecast_qty INT,
    confidence DECIMAL(3,2),
    status VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =============================================
-- 模块3：供应商管理SRM
-- =============================================

CREATE TABLE suppliers (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    contact VARCHAR(50),
    phone VARCHAR(20),
    rating INT,
    status VARCHAR(20),
    supplier_type VARCHAR(30),
    score INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =============================================
-- 模块4：采购与供应管理
-- =============================================

CREATE TABLE purchase_orders (
    id VARCHAR(20) PRIMARY KEY,
    material_id VARCHAR(20),
    product_name VARCHAR(100),
    supplier_id VARCHAR(20),
    supplier_name VARCHAR(100),
    qty INT NOT NULL,
    amount DECIMAL(12,2),
    order_date DATE,
    status VARCHAR(20),
    purchase_type VARCHAR(30),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    INDEX idx_po_supplier (supplier_id),
    INDEX idx_po_material (material_id),
    INDEX idx_po_status (status)
) ENGINE=InnoDB;

-- =============================================
-- 模块5：生产协同管理
-- =============================================

CREATE TABLE production_orders (
    id VARCHAR(20) PRIMARY KEY,
    material_id VARCHAR(20),
    qty INT NOT NULL,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20),
    workshop VARCHAR(50),
    priority VARCHAR(10),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials(id)
) ENGINE=InnoDB;

-- =============================================
-- 模块6：库存管理
-- =============================================

CREATE TABLE inventory (
    id VARCHAR(20) PRIMARY KEY,
    material_id VARCHAR(20),
    product_name VARCHAR(100),
    sku VARCHAR(50),
    category VARCHAR(50),
    warehouse_id VARCHAR(20),
    warehouse_name VARCHAR(100),
    qty INT DEFAULT 0,
    logical_qty INT DEFAULT 0,
    safety_stock INT DEFAULT 0,
    location VARCHAR(50),
    status VARCHAR(20),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    INDEX idx_inv_material (material_id),
    INDEX idx_inv_warehouse (warehouse_id),
    INDEX idx_inv_status (status)
) ENGINE=InnoDB;

-- =============================================
-- 模块7：仓储管理WMS
-- =============================================

CREATE TABLE warehouse_operations (
    id VARCHAR(20) PRIMARY KEY,
    operation_type VARCHAR(20) NOT NULL,
    material_id VARCHAR(20),
    product_name VARCHAR(100),
    qty INT,
    warehouse_id VARCHAR(20),
    from_warehouse VARCHAR(100),
    to_warehouse VARCHAR(100),
    operator VARCHAR(50),
    operation_date DATE,
    status VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
) ENGINE=InnoDB;

-- =============================================
-- 模块8：物流运输管理TMS
-- =============================================

CREATE TABLE transport_orders (
    id VARCHAR(20) PRIMARY KEY,
    order_id VARCHAR(20),
    from_location VARCHAR(100),
    to_location VARCHAR(100),
    carrier VARCHAR(50),
    vehicle VARCHAR(30),
    driver VARCHAR(30),
    start_date DATE,
    end_date DATE,
    status VARCHAR(20),
    cost DECIMAL(10,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES purchase_orders(id)
) ENGINE=InnoDB;

-- =============================================
-- 模块9：订单协同管理
-- =============================================

CREATE TABLE sales_orders (
    id VARCHAR(20) PRIMARY KEY,
    customer_id VARCHAR(20),
    customer_name VARCHAR(100),
    material_id VARCHAR(20),
    product_name VARCHAR(100),
    qty INT NOT NULL,
    amount DECIMAL(12,2),
    order_date DATE,
    delivery_date DATE,
    status VARCHAR(20),
    priority VARCHAR(10),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (material_id) REFERENCES materials(id),
    INDEX idx_so_customer (customer_id),
    INDEX idx_so_material (material_id),
    INDEX idx_so_status (status)
) ENGINE=InnoDB;

-- =============================================
-- 模块10：质量协同管理
-- =============================================

CREATE TABLE quality_inspections (
    id VARCHAR(20) PRIMARY KEY,
    inspection_type VARCHAR(20) NOT NULL,
    material_id VARCHAR(20),
    product_name VARCHAR(100),
    batch VARCHAR(30),
    workshop VARCHAR(50),
    customer_name VARCHAR(100),
    inspector VARCHAR(50),
    inspection_date DATE,
    result VARCHAR(20),
    defect_rate DECIMAL(5,4),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials(id)
) ENGINE=InnoDB;

-- =============================================
-- 模块11：财务协同
-- =============================================

CREATE TABLE financial_records (
    id VARCHAR(20) PRIMARY KEY,
    record_type VARCHAR(20) NOT NULL,
    order_id VARCHAR(20),
    supplier_id VARCHAR(20),
    supplier_name VARCHAR(100),
    customer_name VARCHAR(100),
    carrier VARCHAR(50),
    amount DECIMAL(12,2) NOT NULL,
    record_date DATE,
    status VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    INDEX idx_fin_order (order_id),
    INDEX idx_fin_supplier (supplier_id)
) ENGINE=InnoDB;

-- =============================================
-- 模块12：数据分析与BI
-- =============================================

CREATE TABLE bi_reports (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    bi_type VARCHAR(50),
    period VARCHAR(7),
    value DECIMAL(10,2),
    target DECIMAL(10,2),
    status VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =============================================
-- 模块13：系统集成平台
-- =============================================

CREATE TABLE integrations (
    id VARCHAR(20) PRIMARY KEY,
    system_name VARCHAR(50) NOT NULL,
    integration_type VARCHAR(50),
    status VARCHAR(20),
    last_sync DATETIME,
    frequency VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =============================================
-- 模块14：组织架构
-- =============================================

CREATE TABLE departments (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    parent_id VARCHAR(20),
    manager VARCHAR(50),
    member_count INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES departments(id)
) ENGINE=InnoDB;

CREATE TABLE roles (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(20),
    permissions JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE employees (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(20),
    dept_id VARCHAR(20),
    role_id VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(100),
    status VARCHAR(20),
    join_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id) REFERENCES departments(id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    INDEX idx_emp_dept (dept_id),
    INDEX idx_emp_role (role_id)
) ENGINE=InnoDB;

-- =============================================
-- 模块15：客户关系扩展
-- =============================================

CREATE TABLE customer_contacts (
    id VARCHAR(20) PRIMARY KEY,
    customer_id VARCHAR(20),
    name VARCHAR(50) NOT NULL,
    role VARCHAR(50),
    phone VARCHAR(20),
    email VARCHAR(100),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;

CREATE TABLE customer_addresses (
    id VARCHAR(20) PRIMARY KEY,
    customer_id VARCHAR(20),
    address_type VARCHAR(20),
    province VARCHAR(30),
    city VARCHAR(30),
    detail VARCHAR(200),
    is_default TINYINT(1) DEFAULT 0,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;

CREATE TABLE customer_price_lists (
    id VARCHAR(20) PRIMARY KEY,
    customer_id VARCHAR(20),
    material_id VARCHAR(20),
    base_price DECIMAL(12,2),
    min_price DECIMAL(12,2),
    tiers JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (material_id) REFERENCES materials(id),
    UNIQUE KEY uk_cust_material (customer_id, material_id)
) ENGINE=InnoDB;

-- =============================================
-- 模块16：销售与采购计划
-- =============================================

CREATE TABLE sales_plans (
    id VARCHAR(20) PRIMARY KEY,
    plan_type VARCHAR(20),
    customer_id VARCHAR(20),
    customer_name VARCHAR(100),
    product_name VARCHAR(100),
    plan_qty INT,
    actual_qty INT DEFAULT 0,
    plan_month VARCHAR(7),
    owner VARCHAR(50),
    status VARCHAR(20),
    week_days JSON,
    time_slot VARCHAR(20),
    auto_generate TINYINT(1) DEFAULT 0,
    create_date DATE,
    reason VARCHAR(200),
    items JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;

CREATE TABLE purchase_plans (
    id VARCHAR(20) PRIMARY KEY,
    material_name VARCHAR(100),
    plan_qty INT,
    unit VARCHAR(20),
    need_date DATE,
    supplier_name VARCHAR(100),
    status VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =============================================
-- 模块17：售后管理
-- =============================================

CREATE TABLE after_sales_records (
    id VARCHAR(20) PRIMARY KEY,
    order_id VARCHAR(20),
    as_type VARCHAR(30),
    reason VARCHAR(200),
    items JSON,
    amount DECIMAL(12,2),
    status VARCHAR(20),
    record_date DATE,
    applicant VARCHAR(50),
    warehouse_received TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES sales_orders(id)
) ENGINE=InnoDB;

-- =============================================
-- 验证
-- =============================================
SELECT 'All tables created successfully!' AS status;
SHOW TABLES;
