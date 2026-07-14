mysqldump: [Warning] Using a password on the command line interface can be insecure.
Warning: A partial dump from a server that has GTIDs will by default include the GTIDs of all transactions, even those that changed suppressed parts of the database. If you don't want to restore GTIDs, pass --set-gtid-purged=OFF. To make a complete dump, pass --all-databases --triggers --routines --events. 
Warning: A dump from a server that has GTIDs enabled will by default include the GTIDs of all transactions, even those that were executed during its extraction and might not be represented in the dumped data. This might result in an inconsistent data dump. 
In order to ensure a consistent backup of the database, pass --single-transaction or --lock-all-tables or --source-data. 
-- MySQL dump 10.13  Distrib 9.6.0, for macos26.4 (arm64)
--
-- Host: localhost    Database: xdj_scm_db
-- ------------------------------------------------------
-- Server version	9.6.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '67bba922-5a4b-11f1-a5a7-bf2478eb333d:1-3616277';

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `accounts_payable`
--

DROP TABLE IF EXISTS `accounts_payable`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounts_payable` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplierId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `refType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `refId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(14,2) NOT NULL,
  `paidAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `balance` decimal(14,2) NOT NULL,
  `invoiceId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dueDate` datetime(3) DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `accounts_payable_apNo_key` (`apNo`),
  UNIQUE KEY `accounts_payable_invoiceId_key` (`invoiceId`),
  KEY `accounts_payable_supplierId_idx` (`supplierId`),
  KEY `accounts_payable_status_idx` (`status`),
  CONSTRAINT `accounts_payable_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `accounts_payable_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounts_payable`
--

LOCK TABLES `accounts_payable` WRITE;
/*!40000 ALTER TABLE `accounts_payable` DISABLE KEYS */;
INSERT INTO `accounts_payable` VALUES ('cmrhs8yt60009ndx5k7sb6hbu','AP20260712Q4FIKZ','cmrgmtu5f0000ndzrnbzsvxf2','PURCHASE_RECEIPT','cmrgofqga001jndzrip6xmuv4',198.00,0.00,198.00,NULL,'2026-08-11 12:41:45.785','PENDING','2026-07-12 12:41:45.786','2026-07-12 12:41:45.786'),('cmrhs8ytn000jndx5nlqp8k9a','AP20260712UON3H1','cmrgmtu5f0000ndzrnbzsvxf2','PURCHASE_RECEIPT','cmrgofqga001jndzrip6xmuv4',250.00,0.00,250.00,NULL,'2026-08-11 12:41:45.803','PENDING','2026-07-12 12:41:45.804','2026-07-12 12:41:45.804'),('cmrhtrcuh000jndbmdck24x9s','AP2026071230XX08','cmrgn68jt0001ndzrrja28eg2','PURCHASE_RECEIPT','cmrhtqoip0006ndbm8eccko5w',100.00,0.00,100.00,NULL,'2026-08-11 13:24:03.401','PENDING','2026-07-12 13:24:03.401','2026-07-12 13:24:03.401'),('cmrhtrcuu000tndbm93w6e0t4','AP20260712TEMVE2','cmrgn68jt0001ndzrrja28eg2','PURCHASE_RECEIPT','cmrhtqoip0006ndbm8eccko5w',264.00,0.00,264.00,NULL,'2026-08-11 13:24:03.413','PENDING','2026-07-12 13:24:03.414','2026-07-12 13:24:03.414');
/*!40000 ALTER TABLE `accounts_payable` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `accounts_receivable`
--

DROP TABLE IF EXISTS `accounts_receivable`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounts_receivable` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `arNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `refType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `refId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(14,2) NOT NULL,
  `receivedAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `balance` decimal(14,2) NOT NULL,
  `invoiceId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dueDate` datetime(3) DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `accounts_receivable_arNo_key` (`arNo`),
  UNIQUE KEY `accounts_receivable_invoiceId_key` (`invoiceId`),
  KEY `accounts_receivable_customerId_idx` (`customerId`),
  KEY `accounts_receivable_status_idx` (`status`),
  CONSTRAINT `accounts_receivable_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `accounts_receivable_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounts_receivable`
--

LOCK TABLES `accounts_receivable` WRITE;
/*!40000 ALTER TABLE `accounts_receivable` DISABLE KEYS */;
/*!40000 ALTER TABLE `accounts_receivable` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `addresses`
--

DROP TABLE IF EXISTS `addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `addresses` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `originName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `originAddress` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `originLng` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `originLat` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `destName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `destAddress` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `destLng` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `destLat` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `distance` decimal(10,2) DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `remark` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `addresses`
--

LOCK TABLES `addresses` WRITE;
/*!40000 ALTER TABLE `addresses` DISABLE KEYS */;
INSERT INTO `addresses` VALUES ('cmr98wx840000nd8qdcfp8jwr','七河生物智慧工厂','山东省淄博市淄川区七河生物智慧工厂','117.912876','36.623751','江苏东海七河生物科技有限公司','江苏省连云港市东海县江苏东海七河生物科技有限公司','118.690916','34.531934',300.10,'ACTIVE',NULL,'2026-07-06 13:18:21.748','2026-07-06 13:18:21.748','七河生物智慧工厂至江苏东海七河生物科技有限公司');
/*!40000 ALTER TABLE `addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `after_sales_records`
--

DROP TABLE IF EXISTS `after_sales_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `after_sales_records` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recordNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `salesOrderId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batchId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refundAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `arId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approvalFlowId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refundStatus` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `applicantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `after_sales_records_recordNo_key` (`recordNo`),
  UNIQUE KEY `after_sales_records_arId_key` (`arId`),
  KEY `after_sales_records_salesOrderId_idx` (`salesOrderId`),
  KEY `after_sales_records_status_idx` (`status`),
  KEY `after_sales_records_customerId_fkey` (`customerId`),
  KEY `after_sales_records_batchId_fkey` (`batchId`),
  KEY `after_sales_records_applicantId_fkey` (`applicantId`),
  CONSTRAINT `after_sales_records_applicantId_fkey` FOREIGN KEY (`applicantId`) REFERENCES `employees` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `after_sales_records_arId_fkey` FOREIGN KEY (`arId`) REFERENCES `accounts_receivable` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `after_sales_records_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `after_sales_records_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `after_sales_records_salesOrderId_fkey` FOREIGN KEY (`salesOrderId`) REFERENCES `sales_orders` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `after_sales_records`
--

LOCK TABLES `after_sales_records` WRITE;
/*!40000 ALTER TABLE `after_sales_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `after_sales_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alert_records`
--

DROP TABLE IF EXISTS `alert_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alert_records` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ruleId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `alertType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'WARNING',
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `refType` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `targetUserId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `resolvedAt` datetime(3) DEFAULT NULL,
  `resolvedBy` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `alert_records_alertType_status_idx` (`alertType`,`status`),
  KEY `alert_records_targetUserId_status_idx` (`targetUserId`,`status`),
  KEY `alert_records_ruleId_fkey` (`ruleId`),
  KEY `alert_records_resolvedBy_fkey` (`resolvedBy`),
  CONSTRAINT `alert_records_resolvedBy_fkey` FOREIGN KEY (`resolvedBy`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `alert_records_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `alert_rules` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `alert_records_targetUserId_fkey` FOREIGN KEY (`targetUserId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alert_records`
--

LOCK TABLES `alert_records` WRITE;
/*!40000 ALTER TABLE `alert_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `alert_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alert_rules`
--

DROP TABLE IF EXISTS `alert_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alert_rules` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ruleName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ruleType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `targetType` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `conditionConfig` json DEFAULT NULL,
  `notifyRoles` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alert_rules`
--

LOCK TABLES `alert_rules` WRITE;
/*!40000 ALTER TABLE `alert_rules` DISABLE KEYS */;
/*!40000 ALTER TABLE `alert_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alert_steps`
--

DROP TABLE IF EXISTS `alert_steps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alert_steps` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alertId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `step` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `handlerId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `handlerRole` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `result` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `alert_steps_alertId_idx` (`alertId`),
  CONSTRAINT `alert_steps_alertId_fkey` FOREIGN KEY (`alertId`) REFERENCES `stock_alerts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alert_steps`
--

LOCK TABLES `alert_steps` WRITE;
/*!40000 ALTER TABLE `alert_steps` DISABLE KEYS */;
/*!40000 ALTER TABLE `alert_steps` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `approval_flows`
--

DROP TABLE IF EXISTS `approval_flows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `approval_flows` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `flowType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `refId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `approverId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `approval_flows_flowType_status_idx` (`flowType`,`status`),
  KEY `approval_flows_applicantId_fkey` (`applicantId`),
  KEY `approval_flows_approverId_fkey` (`approverId`),
  CONSTRAINT `approval_flows_applicantId_fkey` FOREIGN KEY (`applicantId`) REFERENCES `employees` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `approval_flows_approverId_fkey` FOREIGN KEY (`approverId`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `approval_flows`
--

LOCK TABLES `approval_flows` WRITE;
/*!40000 ALTER TABLE `approval_flows` DISABLE KEYS */;
/*!40000 ALTER TABLE `approval_flows` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `barcode_records`
--

DROP TABLE IF EXISTS `barcode_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `barcode_records` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `barcode` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `barcodeType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `batchId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `locationId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actionType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `refType` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qty` int NOT NULL DEFAULT '0',
  `operatorId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deviceInfo` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `barcode_records_barcode_idx` (`barcode`),
  KEY `barcode_records_actionType_idx` (`actionType`),
  KEY `barcode_records_materialId_fkey` (`materialId`),
  KEY `barcode_records_batchId_fkey` (`batchId`),
  KEY `barcode_records_locationId_fkey` (`locationId`),
  KEY `barcode_records_operatorId_fkey` (`operatorId`),
  CONSTRAINT `barcode_records_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `barcode_records_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `warehouse_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `barcode_records_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `barcode_records_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `barcode_records`
--

LOCK TABLES `barcode_records` WRITE;
/*!40000 ALTER TABLE `barcode_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `barcode_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `batch_tracking`
--

DROP TABLE IF EXISTS `batch_tracking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_tracking` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batchId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `movementType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `refType` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fromLocation` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `toLocation` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qty` int NOT NULL,
  `operatorId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `batch_tracking_batchId_idx` (`batchId`),
  KEY `batch_tracking_refType_refId_idx` (`refType`,`refId`),
  KEY `batch_tracking_customerId_idx` (`customerId`),
  KEY `batch_tracking_operatorId_fkey` (`operatorId`),
  CONSTRAINT `batch_tracking_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `batches` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `batch_tracking_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `batch_tracking_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batch_tracking`
--

LOCK TABLES `batch_tracking` WRITE;
/*!40000 ALTER TABLE `batch_tracking` DISABLE KEYS */;
INSERT INTO `batch_tracking` VALUES ('cmrhs8ysv0007ndx5e04pyixy','cmrhs8ysk0001ndx5iqvsv4pu','PURCHASE_RECEIPT','PURCHASE_RECEIPT','cmrgofqga001jndzrip6xmuv4',NULL,NULL,30,'cmr2xthjt000fnddogkor8u3s',NULL,'采购入库 批次B20260712OSUCAP','2026-07-12 12:41:45.775'),('cmrhs8yti000hndx5cay0b9u6','cmrhs8yt9000bndx53puq3xdk','PURCHASE_RECEIPT','PURCHASE_RECEIPT','cmrgofqga001jndzrip6xmuv4',NULL,NULL,50,'cmr2xthjt000fnddogkor8u3s',NULL,'采购入库 批次B20260712KL6HPE','2026-07-12 12:41:45.798'),('cmrhtrcu7000hndbm3fb792fr','cmrhtrctz000bndbmprtv0zc0','PURCHASE_RECEIPT','PURCHASE_RECEIPT','cmrhtqoip0006ndbm8eccko5w',NULL,NULL,50,'cmr2xthjt000fnddogkor8u3s',NULL,'采购入库 批次B20260712419AR8','2026-07-12 13:24:03.392'),('cmrhtrcup000rndbmdpzezeel','cmrhtrcuj000lndbmiq7w23bj','PURCHASE_RECEIPT','PURCHASE_RECEIPT','cmrhtqoip0006ndbm8eccko5w',NULL,NULL,60,'cmr2xthjt000fnddogkor8u3s',NULL,'采购入库 批次B20260712L8RGCH','2026-07-12 13:24:03.410');
/*!40000 ALTER TABLE `batch_tracking` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `batches`
--

DROP TABLE IF EXISTS `batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batches` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batchNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplierId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `productionDate` datetime(3) DEFAULT NULL,
  `expiryDate` datetime(3) DEFAULT NULL,
  `receivedQty` int NOT NULL,
  `remainingQty` int NOT NULL DEFAULT '0',
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `batches_batchNo_key` (`batchNo`),
  KEY `batches_batchNo_idx` (`batchNo`),
  KEY `batches_materialId_idx` (`materialId`),
  KEY `batches_expiryDate_idx` (`expiryDate`),
  KEY `batches_supplierId_fkey` (`supplierId`),
  CONSTRAINT `batches_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `batches_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batches`
--

LOCK TABLES `batches` WRITE;
/*!40000 ALTER TABLE `batches` DISABLE KEYS */;
INSERT INTO `batches` VALUES ('cmrhs8ysk0001ndx5iqvsv4pu','B20260712OSUCAP','cmrglkmgf000kndzuq19wpwm4','cmrgmtu5f0000ndzrnbzsvxf2',NULL,NULL,30,30,'ACTIVE','2026-07-12 12:41:45.763','2026-07-12 12:41:45.763'),('cmrhs8yt9000bndx53puq3xdk','B20260712KL6HPE','cmrglmhue000mndzuvxu8h3bh','cmrgmtu5f0000ndzrnbzsvxf2',NULL,NULL,50,50,'ACTIVE','2026-07-12 12:41:45.790','2026-07-12 12:41:45.790'),('cmrhtrctz000bndbmprtv0zc0','B20260712419AR8','cmrglqqkc0000nd6yj5i1v8tm','cmrgn68jt0001ndzrrja28eg2',NULL,NULL,50,50,'ACTIVE','2026-07-12 13:24:03.384','2026-07-12 13:24:03.384'),('cmrhtrcuj000lndbmiq7w23bj','B20260712L8RGCH','cmrgmigee0004ndrvrkuo07z1','cmrgn68jt0001ndzrrja28eg2',NULL,NULL,60,60,'ACTIVE','2026-07-12 13:24:03.404','2026-07-12 13:24:03.404');
/*!40000 ALTER TABLE `batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contracts`
--

DROP TABLE IF EXISTS `contracts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contracts` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contractNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contractType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `partyType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `partyId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplierId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logisticsId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `signDate` datetime(3) NOT NULL,
  `effectiveFrom` datetime(3) NOT NULL,
  `effectiveTo` datetime(3) DEFAULT NULL,
  `amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `attachmentUrl` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `relatedPoId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `relatedSoId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `creatorId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contracts_contractNo_key` (`contractNo`),
  KEY `contracts_contractType_idx` (`contractType`),
  KEY `contracts_partyType_partyId_idx` (`partyType`,`partyId`),
  KEY `contracts_effectiveTo_idx` (`effectiveTo`),
  KEY `contracts_creatorId_fkey` (`creatorId`),
  KEY `contracts_supplierId_fkey` (`supplierId`),
  KEY `contracts_logisticsId_fkey` (`logisticsId`),
  CONSTRAINT `contracts_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `contracts_logisticsId_fkey` FOREIGN KEY (`logisticsId`) REFERENCES `logistics_providers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `contracts_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contracts`
--

LOCK TABLES `contracts` WRITE;
/*!40000 ALTER TABLE `contracts` DISABLE KEYS */;
/*!40000 ALTER TABLE `contracts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cost_configs`
--

DROP TABLE IF EXISTS `cost_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cost_configs` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `configKey` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `configName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `configValue` decimal(12,2) NOT NULL,
  `unit` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `effectiveDate` datetime(3) NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cost_configs_configKey_key` (`configKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cost_configs`
--

LOCK TABLES `cost_configs` WRITE;
/*!40000 ALTER TABLE `cost_configs` DISABLE KEYS */;
/*!40000 ALTER TABLE `cost_configs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cost_price_records`
--

DROP TABLE IF EXISTS `cost_price_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cost_price_records` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materialName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `grade_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gradeName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `beginningQty` decimal(12,2) NOT NULL DEFAULT '0.00',
  `beginningPrice` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `beginningAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `inboundQty` decimal(12,2) NOT NULL DEFAULT '0.00',
  `inboundAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `salesCostPrice` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `outboundQty` decimal(12,2) NOT NULL DEFAULT '0.00',
  `outboundAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `lossQty` decimal(12,2) NOT NULL DEFAULT '0.00',
  `endingQty` decimal(12,2) NOT NULL DEFAULT '0.00',
  `endingAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `costPrice` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `weightedAvgPrice` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `feesTotal` decimal(12,2) NOT NULL DEFAULT '0.00',
  `feesDetail` json NOT NULL,
  `periodStart` datetime(3) DEFAULT NULL,
  `periodEnd` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `calculatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `cost_price_records_calculatedAt_idx` (`calculatedAt`),
  KEY `cost_price_records_materialId_grade_id_calculatedAt_idx` (`materialId`,`grade_id`,`calculatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cost_price_records`
--

LOCK TABLES `cost_price_records` WRITE;
/*!40000 ALTER TABLE `cost_price_records` DISABLE KEYS */;
INSERT INTO `cost_price_records` VALUES ('cmrh9lz4o002indzrax5zmyjb','cmrglj5bv000indzutrm5g6sn','香菇',NULL,NULL,0.00,4.6000,0.00,0.00,0.00,4.6000,0.00,0.00,0.00,0.00,0.00,4.6000,4.6000,0.00,'[]','2026-07-12 04:00:00.000','2026-07-12 04:00:00.004','2026-07-12 04:00:00.004'),('cmrh9lz4w002jndzr3tcp10bf','cmrgljo01000jndzuub93jo15','有机杏鲍菇',NULL,NULL,0.00,6.2000,0.00,0.00,0.00,6.2000,0.00,0.00,0.00,0.00,0.00,6.2000,6.2000,0.00,'[]','2026-07-12 04:00:00.000','2026-07-12 04:00:00.004','2026-07-12 04:00:00.004'),('cmrh9lz53002kndzr7fuo9hzi','cmrglkmgf000kndzuq19wpwm4','蛹虫草',NULL,NULL,0.00,11.0000,0.00,0.00,0.00,11.0000,0.00,0.00,0.00,0.00,0.00,11.0000,11.0000,0.00,'[]','2026-07-12 04:00:00.000','2026-07-12 04:00:00.004','2026-07-12 04:00:00.004'),('cmrh9lz59002lndzrj1d9pmwn','cmrgllmt2000lndzu9dqnbvbz','双颗青芹',NULL,NULL,0.00,5.0000,0.00,0.00,0.00,5.0000,0.00,0.00,0.00,0.00,0.00,5.0000,5.0000,0.00,'[]','2026-07-12 04:00:00.000','2026-07-12 04:00:00.004','2026-07-12 04:00:00.004'),('cmrh9lz5e002mndzrdytzodxj','cmrglmhue000mndzuvxu8h3bh','榆黄菇',NULL,NULL,0.00,9.8000,0.00,0.00,0.00,9.8000,0.00,0.00,0.00,0.00,0.00,9.8000,9.8000,0.00,'[]','2026-07-12 04:00:00.000','2026-07-12 04:00:00.004','2026-07-12 04:00:00.004'),('cmrh9lz5k002nndzr73up5h86','cmrglnnyt000nndzu9i18jjdn','杏鲍菇',NULL,NULL,0.00,3.5000,0.00,0.00,0.00,3.5000,0.00,0.00,0.00,0.00,0.00,3.5000,3.5000,0.00,'[]','2026-07-12 04:00:00.000','2026-07-12 04:00:00.004','2026-07-12 04:00:00.004'),('cmrh9lz5q002ondzro6he96o5','cmrglqqkc0000nd6yj5i1v8tm','猴头菇（磅）',NULL,NULL,0.00,5.4000,0.00,0.00,0.00,5.4000,0.00,0.00,0.00,0.00,0.00,5.4000,5.4000,0.00,'[]','2026-07-12 04:00:00.000','2026-07-12 04:00:00.004','2026-07-12 04:00:00.004'),('cmrh9lz5w002pndzrx2idzaet','cmrgmigee0004ndrvrkuo07z1','白玉蟹味双拼',NULL,NULL,0.00,7.4000,0.00,0.00,0.00,7.4000,0.00,0.00,0.00,0.00,0.00,7.4000,7.4000,0.00,'[]','2026-07-12 04:00:00.000','2026-07-12 04:00:00.004','2026-07-12 04:00:00.004'),('cmrhzbwiv0002ndhuegtdmmom','cmrglj5bv000indzutrm5g6sn','香菇',NULL,NULL,0.00,4.6000,0.00,0.00,0.00,4.6000,0.00,0.00,0.00,0.00,0.00,4.6000,4.6000,0.00,'[]','2026-07-12 04:00:00.004','2026-07-12 16:00:00.084','2026-07-12 16:00:00.084'),('cmrhzbwj40003ndhutvbd1xx0','cmrgljo01000jndzuub93jo15','有机杏鲍菇',NULL,NULL,0.00,6.2000,0.00,0.00,0.00,6.2000,0.00,0.00,0.00,0.00,0.00,6.2000,6.2000,0.00,'[]','2026-07-12 04:00:00.004','2026-07-12 16:00:00.084','2026-07-12 16:00:00.084'),('cmrhzbwjf0004ndhuvvytp2p0','cmrglkmgf000kndzuq19wpwm4','蛹虫草',NULL,NULL,0.00,11.0000,0.00,30.00,198.00,6.6000,0.00,0.00,0.00,30.00,198.00,6.6000,6.6000,0.00,'[]','2026-07-12 04:00:00.004','2026-07-12 16:00:00.084','2026-07-12 16:00:00.084'),('cmrhzbwjn0005ndhu0hb056zm','cmrgllmt2000lndzu9dqnbvbz','双颗青芹',NULL,NULL,0.00,5.0000,0.00,0.00,0.00,5.0000,0.00,0.00,0.00,0.00,0.00,5.0000,5.0000,0.00,'[]','2026-07-12 04:00:00.004','2026-07-12 16:00:00.084','2026-07-12 16:00:00.084'),('cmrhzbwjz0006ndhuni0yg67i','cmrglmhue000mndzuvxu8h3bh','榆黄菇',NULL,NULL,0.00,9.8000,0.00,50.00,250.00,5.0000,0.00,0.00,0.00,50.00,250.00,5.0000,5.0000,0.00,'[]','2026-07-12 04:00:00.004','2026-07-12 16:00:00.084','2026-07-12 16:00:00.084'),('cmrhzbwk50007ndhufveiiq3h','cmrglnnyt000nndzu9i18jjdn','杏鲍菇',NULL,NULL,0.00,3.5000,0.00,0.00,0.00,3.5000,0.00,0.00,0.00,0.00,0.00,3.5000,3.5000,0.00,'[]','2026-07-12 04:00:00.004','2026-07-12 16:00:00.084','2026-07-12 16:00:00.084'),('cmrhzbwkb0008ndhu7cscrazj','cmrglqqkc0000nd6yj5i1v8tm','猴头菇（磅）',NULL,NULL,0.00,5.4000,0.00,50.00,100.00,2.0000,0.00,0.00,0.00,50.00,100.00,2.0000,2.0000,0.00,'[]','2026-07-12 04:00:00.004','2026-07-12 16:00:00.084','2026-07-12 16:00:00.084'),('cmrhzbwki0009ndhu7jkjeggx','cmrgmigee0004ndrvrkuo07z1','白玉蟹味双拼',NULL,NULL,0.00,7.4000,0.00,60.00,264.00,4.4000,0.00,0.00,0.00,60.00,264.00,4.4000,4.4000,0.00,'[]','2026-07-12 04:00:00.004','2026-07-12 16:00:00.084','2026-07-12 16:00:00.084'),('cmrip1tt90004ndixqmxq9qao','cmrglj5bv000indzutrm5g6sn','香菇',NULL,NULL,0.00,4.6000,0.00,0.00,0.00,4.6000,0.00,0.00,0.00,0.00,0.00,4.6000,4.6000,0.00,'[]','2026-07-12 16:00:00.084','2026-07-13 04:00:00.029','2026-07-13 04:00:00.029'),('cmrip1tti0005ndixna422gt5','cmrgljo01000jndzuub93jo15','有机杏鲍菇',NULL,NULL,0.00,6.2000,0.00,0.00,0.00,6.2000,0.00,0.00,0.00,0.00,0.00,6.2000,6.2000,0.00,'[]','2026-07-12 16:00:00.084','2026-07-13 04:00:00.029','2026-07-13 04:00:00.029'),('cmrip1ttm0006ndix09m1rn2f','cmrglkmgf000kndzuq19wpwm4','蛹虫草',NULL,NULL,30.00,6.6000,198.00,0.00,0.00,6.6000,0.00,0.00,0.00,30.00,198.00,6.6000,6.6000,0.00,'[]','2026-07-12 16:00:00.084','2026-07-13 04:00:00.029','2026-07-13 04:00:00.029'),('cmrip1ttp0007ndixtfs2g73t','cmrgllmt2000lndzu9dqnbvbz','双颗青芹',NULL,NULL,0.00,5.0000,0.00,0.00,0.00,5.0000,0.00,0.00,0.00,0.00,0.00,5.0000,5.0000,0.00,'[]','2026-07-12 16:00:00.084','2026-07-13 04:00:00.029','2026-07-13 04:00:00.029'),('cmrip1ttt0008ndix3k0p5fcd','cmrglmhue000mndzuvxu8h3bh','榆黄菇',NULL,NULL,50.00,5.0000,250.00,0.00,0.00,5.0000,0.00,0.00,0.00,50.00,250.00,5.0000,5.0000,0.00,'[]','2026-07-12 16:00:00.084','2026-07-13 04:00:00.029','2026-07-13 04:00:00.029'),('cmrip1ttx0009ndixibl0pkql','cmrglnnyt000nndzu9i18jjdn','杏鲍菇',NULL,NULL,0.00,3.5000,0.00,0.00,0.00,3.5000,0.00,0.00,0.00,0.00,0.00,3.5000,3.5000,0.00,'[]','2026-07-12 16:00:00.084','2026-07-13 04:00:00.029','2026-07-13 04:00:00.029'),('cmrip1tu0000andixfpubnz5u','cmrglqqkc0000nd6yj5i1v8tm','猴头菇（磅）',NULL,NULL,50.00,2.0000,100.00,0.00,0.00,2.0000,0.00,0.00,0.00,50.00,100.00,2.0000,2.0000,0.00,'[]','2026-07-12 16:00:00.084','2026-07-13 04:00:00.029','2026-07-13 04:00:00.029'),('cmrip1tu3000bndixrnsoip9h','cmrgmigee0004ndrvrkuo07z1','白玉蟹味双拼',NULL,NULL,60.00,4.4000,264.00,0.00,0.00,4.4000,0.00,0.00,0.00,60.00,264.00,4.4000,4.4000,0.00,'[]','2026-07-12 16:00:00.084','2026-07-13 04:00:00.029','2026-07-13 04:00:00.029');
/*!40000 ALTER TABLE `cost_price_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cost_snapshots`
--

DROP TABLE IF EXISTS `cost_snapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cost_snapshots` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `totalCost` decimal(12,2) NOT NULL,
  `snapshotDate` datetime(3) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `cost_snapshots_materialId_snapshotDate_idx` (`materialId`,`snapshotDate`),
  CONSTRAINT `cost_snapshots_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cost_snapshots`
--

LOCK TABLES `cost_snapshots` WRITE;
/*!40000 ALTER TABLE `cost_snapshots` DISABLE KEYS */;
/*!40000 ALTER TABLE `cost_snapshots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_addresses`
--

DROP TABLE IF EXISTS `customer_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_addresses` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receiver` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isDefault` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lat` decimal(10,6) DEFAULT NULL,
  `lng` decimal(10,6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `customer_addresses_customerId_idx` (`customerId`),
  CONSTRAINT `customer_addresses_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_addresses`
--

LOCK TABLES `customer_addresses` WRITE;
/*!40000 ALTER TABLE `customer_addresses` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contactPerson` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contactPhone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `salesRepId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `departmentId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creditLimit` decimal(14,2) NOT NULL DEFAULT '0.00',
  `creditPeriod` int NOT NULL DEFAULT '30',
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `currency` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customers_code_key` (`code`),
  KEY `customers_name_idx` (`name`),
  KEY `customers_salesRepId_idx` (`salesRepId`),
  KEY `customers_departmentId_fkey` (`departmentId`),
  CONSTRAINT `customers_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `customers_salesRepId_fkey` FOREIGN KEY (`salesRepId`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES ('cmrgm8u9n0001nd1zozo7sxjy','000100003','青岛鼎翻天餐饮管理有限公司李沧利客来店','张三','13589985895','','cmr34c7ra000mndimuel8s3dv',NULL,10002.00,30,'ACTIVE','2026-07-11 17:05:56.027','2026-07-11 17:11:03.882','人民币'),('cmrgm9d3g0003nd1zhhy60541','021000039','东海县冠霖农业发展有限公司','李四','13898746573','','cmr2xthjw000nnddoa651alvh',NULL,100000.00,30,'ACTIVE','2026-07-11 17:06:20.429','2026-07-11 17:10:53.672','人民币'),('cmrgmgip70001ndrvukt41in6','021600020','河南省商水县食用菌推广中心-刘卫东','王五','15687498944','','cmr2xthjv000jnddonu24ysj6',NULL,5000.00,30,'ACTIVE','2026-07-11 17:11:54.283','2026-07-11 17:12:56.531','人民币'),('cmrgmh5oc0003ndrvj3b5mohh','000100001','河北-马晓荣','赵六','13989898444','','cmr2xthjx000rnddozqsby7nq',NULL,1000.00,30,'ACTIVE','2026-07-11 17:12:24.061','2026-07-11 17:12:45.283','人民币'),('cmrgmjbh50006ndrv3x1824zl','000100002','邯郸喜之船食品科技有限公司','唐七','13787878444','','cmr2xthjw000nnddoa651alvh',NULL,3000000.00,30,'ACTIVE','2026-07-11 17:14:04.890','2026-07-11 17:17:05.166','人民币'),('cmrgmqm9l0001ndo1zukwln5j','020500075','河北邯郸-王连锋','天天','15894894893','','cmr2xthjv000jnddonu24ysj6',NULL,22222.00,20,'ACTIVE','2026-07-11 17:19:45.465','2026-07-11 17:19:45.465','人民币');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `data_centers`
--

DROP TABLE IF EXISTS `data_centers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `data_centers` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dbHost` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dbName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apiUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `data_centers`
--

LOCK TABLES `data_centers` WRITE;
/*!40000 ALTER TABLE `data_centers` DISABLE KEYS */;
/*!40000 ALTER TABLE `data_centers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delivery_routes`
--

DROP TABLE IF EXISTS `delivery_routes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_routes` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `routeNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `routeDate` datetime(3) NOT NULL,
  `logisticsProviderId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicleNo` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `driverName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `driverPhone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `totalStops` int NOT NULL DEFAULT '0',
  `totalWeight` decimal(10,2) NOT NULL DEFAULT '0.00',
  `totalCost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PLANNED',
  `optimizedPath` json DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `delivery_routes_routeNo_key` (`routeNo`),
  KEY `delivery_routes_routeDate_idx` (`routeDate`),
  KEY `delivery_routes_status_idx` (`status`),
  KEY `delivery_routes_logisticsProviderId_fkey` (`logisticsProviderId`),
  CONSTRAINT `delivery_routes_logisticsProviderId_fkey` FOREIGN KEY (`logisticsProviderId`) REFERENCES `logistics_providers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_routes`
--

LOCK TABLES `delivery_routes` WRITE;
/*!40000 ALTER TABLE `delivery_routes` DISABLE KEYS */;
/*!40000 ALTER TABLE `delivery_routes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parentId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `managerId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sortOrder` int NOT NULL DEFAULT '0',
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `departments_code_key` (`code`),
  KEY `departments_parentId_idx` (`parentId`),
  KEY `departments_managerId_fkey` (`managerId`),
  CONSTRAINT `departments_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `departments_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES ('021990d6-7d44-11f1-b477-93c625648a87','供应链管理部','MDM_CMRGKIBV','cmr34c7oy0001ndimnx3t2ve5','cmr34c7rc000undim4n4m6z3e',4,'ACTIVE','2026-07-12 00:17:27.000','2026-07-12 00:17:27.000'),('cmr2xthjq0008nddo0kxzovgc','财务部','FIN','cmr34c7oy0001ndimnx3t2ve5','cmr34c7re0016ndimttx7iljr',2,'ACTIVE','2026-07-02 03:21:08.630','2026-07-02 06:23:40.027'),('cmr34c7oy0001ndimnx3t2ve5','杭州鲜当家生物科技有限公司','HRMS_CMPW5CCH',NULL,'cmr34c7r8000indimzljp871z',0,'ACTIVE','2026-07-02 06:23:40.018','2026-07-02 06:23:40.018'),('cmr34c7p20003ndimfr7nzkzp','商超事业部（鲜当家）','HRMS_CMQKDQ6K','cmr34c7oy0001ndimnx3t2ve5','cmr2xthjv000jnddonu24ysj6',0,'ACTIVE','2026-07-02 06:23:40.022','2026-07-02 06:23:40.022'),('cmr34c7p50005ndimo6wdcsz5','餐饮事业部（鲜当家）','HRMS_CMQKH945','cmr34c7oy0001ndimnx3t2ve5','cmr2xthjw000nnddoa651alvh',1,'ACTIVE','2026-07-02 06:23:40.025','2026-07-02 06:23:40.025'),('cmr34c7q40007ndimkxvu851t','人力资源部','HRMS_CMQKHDH9','cmr34c7oy0001ndimnx3t2ve5','cmr34c7rb000qndimz6by5qfz',3,'ACTIVE','2026-07-02 06:23:40.060','2026-07-02 06:23:40.060');
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `globalId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `departmentId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `hireDate` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employees_globalId_key` (`globalId`),
  UNIQUE KEY `employees_empNo_key` (`empNo`),
  KEY `employees_departmentId_idx` (`departmentId`),
  KEY `employees_name_idx` (`name`),
  CONSTRAINT `employees_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
INSERT INTO `employees` VALUES ('cmr2xthjt000fnddogkor8u3s','g_emp001','XDJ000000','管理员','cmr34c7oy0001ndimnx3t2ve5','总经理','13800138000','admin@hrms.com','ACTIVE','2026-06-01 16:00:00.000','2026-07-02 03:21:08.634','2026-07-13 08:56:19.170'),('cmr2xthjv000jnddonu24ysj6','g_emp002','XDJ000001','吕永权','cmr34c7p20003ndimfr7nzkzp','销售经理','13900139000','test@hrms.com','ACTIVE','2026-06-01 16:00:00.000','2026-07-02 03:21:08.635','2026-07-13 08:56:19.213'),('cmr2xthjw000nnddoa651alvh','g_emp003','XDJ000002','吴月新','cmr34c7p50005ndimo6wdcsz5','销售经理','13800138000','emp003@hrms.internal','ACTIVE','2026-06-01 16:00:00.000','2026-07-02 03:21:08.636','2026-07-13 08:56:19.220'),('cmr2xthjx000rnddozqsby7nq','g_emp004','XDJ000003','王小明','cmr34c7p20003ndimfr7nzkzp','销售员','13900139001','wangxm@example.com','ACTIVE','2026-06-02 16:00:00.000','2026-07-02 03:21:08.637','2026-07-13 08:56:19.226'),('cmr2xthjx000vnddoo256ase1','g_emp005','XDJ000004','李丽华','cmr34c7oy0001ndimnx3t2ve5',NULL,'13900139002','lilh@example.com','RESIGNED','2026-05-31 16:00:00.000','2026-07-02 03:21:08.638','2026-07-13 08:56:19.231'),('cmr34c7r6000andim27lw14kn','g_emp006','XDJ000005','张三','cmr34c7oy0001ndimnx3t2ve5',NULL,'13800138001','emp006@hrms.internal','INACTIVE','2024-12-31 16:00:00.000','2026-07-02 06:23:40.099','2026-07-13 08:56:19.235'),('cmr34c7r7000endimryvbf6rs','g_emp007','XDJ000006','苏耜同','cmr34c7oy0001ndimnx3t2ve5','总经理','13805335778','emp007@hrms.internal','ACTIVE','2000-09-30 16:00:00.000','2026-07-02 06:23:40.099','2026-07-13 08:56:19.241'),('cmr34c7r8000indimzljp871z','g_emp008','XDJ000007','苏建昌','cmr34c7oy0001ndimnx3t2ve5','总经理','13506445909','emp008@hrms.internal','ACTIVE','2000-09-30 16:00:00.000','2026-07-02 06:23:40.100','2026-07-13 08:56:19.247'),('cmr34c7ra000mndimuel8s3dv','g_emp009','XDJ000008','于雷','cmr34c7p50005ndimo6wdcsz5','销售员',NULL,'emp009@hrms.internal','ACTIVE','2026-06-11 16:00:00.000','2026-07-02 06:23:40.102','2026-07-13 08:56:19.253'),('cmr34c7rb000qndimz6by5qfz','g_emp010','XDJ000009','王振东','cmr34c7q40007ndimkxvu851t','行政经理',NULL,'emp010@hrms.internal','ACTIVE','2026-06-11 16:00:00.000','2026-07-02 06:23:40.104','2026-07-13 08:56:19.258'),('cmr34c7rc000undim4n4m6z3e','g_emp011','XDJ000010','孟祥营','cmr34c7q40007ndimkxvu851t','行政专员',NULL,'emp011@hrms.internal','ACTIVE','2026-06-14 16:00:00.000','2026-07-02 06:23:40.104','2026-07-13 08:56:19.266'),('cmr34c7rd000yndimg4humua2','g_emp012','XDJ000011','测试复制','cmr34c7oy0001ndimnx3t2ve5',NULL,NULL,'emp012@hrms.internal','RESIGNED','2026-06-15 16:00:00.000','2026-07-02 06:23:40.105','2026-07-13 08:56:19.271'),('cmr34c7rd0012ndimkxyexxel','g_emp013','XDJ000012','邵玉云','cmr2xthjq0008nddo0kxzovgc','行政专员',NULL,'emp013@hrms.internal','ACTIVE','2026-06-14 16:00:00.000','2026-07-02 06:23:40.106','2026-07-13 08:56:19.275'),('cmr34c7re0016ndimttx7iljr','g_emp014','XDJ000013','吕永宝','cmr2xthjq0008nddo0kxzovgc','财务总监','1234656418','emp014@hrms.internal','ACTIVE','2026-06-16 16:00:00.000','2026-07-02 06:23:40.107','2026-07-13 08:56:19.281');
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fee_records`
--

DROP TABLE IF EXISTS `fee_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fee_records` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `feeName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `feeType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PACKAGING',
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `isBuiltin` tinyint(1) NOT NULL DEFAULT '0',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `remark` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fee_records_materialId_fkey` (`materialId`),
  CONSTRAINT `fee_records_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fee_records`
--

LOCK TABLES `fee_records` WRITE;
/*!40000 ALTER TABLE `fee_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `fee_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `freight_settlements`
--

DROP TABLE IF EXISTS `freight_settlements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `freight_settlements` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `settlementNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logisticsProviderId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `periodStart` datetime(3) NOT NULL,
  `periodEnd` datetime(3) NOT NULL,
  `totalFreight` decimal(14,2) NOT NULL DEFAULT '0.00',
  `settledAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `balance` decimal(14,2) NOT NULL DEFAULT '0.00',
  `waybillIds` json DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `freight_settlements_settlementNo_key` (`settlementNo`),
  KEY `freight_settlements_logisticsProviderId_idx` (`logisticsProviderId`),
  KEY `freight_settlements_status_idx` (`status`),
  CONSTRAINT `freight_settlements_logisticsProviderId_fkey` FOREIGN KEY (`logisticsProviderId`) REFERENCES `logistics_providers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `freight_settlements`
--

LOCK TABLES `freight_settlements` WRITE;
/*!40000 ALTER TABLE `freight_settlements` DISABLE KEYS */;
/*!40000 ALTER TABLE `freight_settlements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `warehouseId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `locationId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qty` decimal(12,2) NOT NULL DEFAULT '0.00',
  `lockedQty` decimal(12,2) NOT NULL DEFAULT '0.00',
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_materialId_warehouseId_key` (`materialId`,`warehouseId`),
  KEY `inventory_warehouseId_fkey` (`warehouseId`),
  KEY `inventory_locationId_fkey` (`locationId`),
  CONSTRAINT `inventory_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `warehouse_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inventory_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inventory_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory`
--

LOCK TABLES `inventory` WRITE;
/*!40000 ALTER TABLE `inventory` DISABLE KEYS */;
INSERT INTO `inventory` VALUES ('cmrhs8ysq0003ndx5sarlvn41','cmrglkmgf000kndzuq19wpwm4','cmr3gdk25000jnd8pkxg7f1er',NULL,30.00,0.00,'2026-07-12 12:41:45.770'),('cmrhs8ytd000dndx5mgmdvlx9','cmrglmhue000mndzuvxu8h3bh','cmr3gdk25000jnd8pkxg7f1er',NULL,50.00,0.00,'2026-07-12 12:41:45.793'),('cmrhtrcu4000dndbmbub437fg','cmrglqqkc0000nd6yj5i1v8tm','cmrhfbmx40003ndr9g2cfk60o',NULL,50.00,0.00,'2026-07-12 13:24:03.388'),('cmrhtrcum000nndbm03t03rpd','cmrgmigee0004ndrvrkuo07z1','cmrhfbmx40003ndr9g2cfk60o',NULL,60.00,5.00,'2026-07-12 13:48:37.684');
/*!40000 ALTER TABLE `inventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoiceNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoiceType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `direction` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `partyId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `partyType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `taxAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `grandTotal` decimal(14,2) NOT NULL,
  `invoiceDate` datetime(3) NOT NULL,
  `relatedArId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `relatedApId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ISSUED',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoices_invoiceNo_key` (`invoiceNo`),
  KEY `invoices_invoiceNo_idx` (`invoiceNo`),
  KEY `invoices_partyType_partyId_idx` (`partyType`,`partyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kingdee_sync_logs`
--

DROP TABLE IF EXISTS `kingdee_sync_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kingdee_sync_logs` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `syncType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `direction` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requestData` json DEFAULT NULL,
  `responseData` json DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `errorMessage` text COLLATE utf8mb4_unicode_ci,
  `retryCount` int NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `kingdee_sync_logs_syncType_status_idx` (`syncType`,`status`),
  KEY `kingdee_sync_logs_createdAt_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kingdee_sync_logs`
--

LOCK TABLES `kingdee_sync_logs` WRITE;
/*!40000 ALTER TABLE `kingdee_sync_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `kingdee_sync_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `logistics_providers`
--

DROP TABLE IF EXISTS `logistics_providers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `logistics_providers` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'EXPRESS',
  `contactPerson` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contactPhone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `socialCreditCode` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serviceArea` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contractNo` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `businessLicenseUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rateConfig` json DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `logistics_providers_code_key` (`code`),
  KEY `logistics_providers_name_idx` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `logistics_providers`
--

LOCK TABLES `logistics_providers` WRITE;
/*!40000 ALTER TABLE `logistics_providers` DISABLE KEYS */;
INSERT INTO `logistics_providers` VALUES ('cmr3h2o15000jndfl7qgszpnb','货拉拉','CYS-001','EXPRESS','','','','','',NULL,'null','ACTIVE','2026-07-02 12:20:09.641','2026-07-02 12:20:09.641'),('cmr3h9xwz000ondfl8m4liha1','运满满','CYS-002','COLD_CHAIN','','','','','',NULL,'null','ACTIVE','2026-07-02 12:25:49.044','2026-07-06 01:57:28.572');
/*!40000 ALTER TABLE `logistics_providers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `material_grade_mappings`
--

DROP TABLE IF EXISTS `material_grade_mappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_grade_mappings` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gradeId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `material_grade_mappings_materialId_gradeId_key` (`materialId`,`gradeId`),
  KEY `material_grade_mappings_materialId_idx` (`materialId`),
  KEY `material_grade_mappings_gradeId_idx` (`gradeId`),
  CONSTRAINT `material_grade_mappings_gradeId_fkey` FOREIGN KEY (`gradeId`) REFERENCES `material_grades` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `material_grade_mappings_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `material_grade_mappings`
--

LOCK TABLES `material_grade_mappings` WRITE;
/*!40000 ALTER TABLE `material_grade_mappings` DISABLE KEYS */;
/*!40000 ALTER TABLE `material_grade_mappings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `material_grades`
--

DROP TABLE IF EXISTS `material_grades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_grades` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sortOrder` int NOT NULL DEFAULT '0',
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `material_grades_code_key` (`code`),
  KEY `material_grades_code_idx` (`code`),
  KEY `material_grades_name_idx` (`name`),
  KEY `material_grades_sortOrder_idx` (`sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `material_grades`
--

LOCK TABLES `material_grades` WRITE;
/*!40000 ALTER TABLE `material_grades` DISABLE KEYS */;
/*!40000 ALTER TABLE `material_grades` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `material_groups`
--

DROP TABLE IF EXISTS `material_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_groups` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `stockCategory` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `material_groups_code_key` (`code`),
  KEY `material_groups_code_idx` (`code`),
  KEY `material_groups_name_idx` (`name`),
  KEY `material_groups_category_idx` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `material_groups`
--

LOCK TABLES `material_groups` WRITE;
/*!40000 ALTER TABLE `material_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `material_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `materials`
--

DROP TABLE IF EXISTS `materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `materials` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `spec` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `purchaseUnit` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `salesUnit` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `purchaseConversionFactor` decimal(10,4) NOT NULL DEFAULT '1.0000',
  `salesConversionFactor` decimal(10,4) NOT NULL DEFAULT '1.0000',
  `groupId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shelfLifeDays` int NOT NULL DEFAULT '0',
  `storageTempMin` decimal(5,1) DEFAULT NULL,
  `storageTempMax` decimal(5,1) DEFAULT NULL,
  `barcode` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `archivePurchasePrice` decimal(12,2) NOT NULL DEFAULT '0.00',
  `initialPurchasePrice` decimal(12,2) NOT NULL DEFAULT '0.00',
  `guidePercent` decimal(5,2) NOT NULL DEFAULT '30.00',
  `purchaseLeadTime` int NOT NULL DEFAULT '0',
  `latestReceiptPrice` decimal(12,2) NOT NULL DEFAULT '0.00',
  `latestReceiptDate` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `unitVolume` decimal(10,6) DEFAULT NULL,
  `unitWeight` decimal(10,3) DEFAULT NULL,
  `materialGroupName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `materials_code_key` (`code`),
  UNIQUE KEY `materials_barcode_key` (`barcode`),
  KEY `materials_code_idx` (`code`),
  KEY `materials_name_idx` (`name`),
  KEY `materials_category_idx` (`category`),
  KEY `materials_groupId_idx` (`groupId`),
  CONSTRAINT `materials_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `material_groups` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `materials`
--

LOCK TABLES `materials` WRITE;
/*!40000 ALTER TABLE `materials` DISABLE KEYS */;
INSERT INTO `materials` VALUES ('cmrglj5bv000indzutrm5g6sn','05020100001','香菇',' ','千克','斤','斤',0.5000,0.5000,NULL,'',3,0.0,0.0,NULL,'ACTIVE',0.00,2.30,30.00,3,0.00,NULL,'2026-07-11 16:45:57.307','2026-07-11 16:55:49.429',NULL,NULL,'香菇'),('cmrgljo01000jndzuub93jo15','05020300004','有机杏鲍菇',' ','千克','千克','千克',0.5000,0.5000,NULL,'',4,0.0,0.0,NULL,'ACTIVE',0.00,3.10,23.00,3,0.00,NULL,'2026-07-11 16:46:21.506','2026-07-11 16:55:33.717',NULL,NULL,'杏鲍菇'),('cmrglkmgf000kndzuq19wpwm4','05021900001','蛹虫草','500g/包','千克','斤','斤',0.5000,0.5000,NULL,'',5,0.0,0.0,NULL,'ACTIVE',0.00,5.50,28.00,3,6.60,'2026-07-12 12:41:45.776','2026-07-11 16:47:06.159','2026-07-12 12:41:45.777',NULL,NULL,'（蛹虫草）'),('cmrgllmt2000lndzu9dqnbvbz','05022600001','双颗青芹',' 300g','千克','斤','斤',0.5000,0.5000,NULL,'',4,0.0,0.0,NULL,'ACTIVE',0.00,2.50,20.00,3,0.00,NULL,'2026-07-11 16:47:53.270','2026-07-11 16:54:13.884',NULL,NULL,'青芹'),('cmrglmhue000mndzuvxu8h3bh','05020200101','榆黄菇',' 一级','千克','斤','斤',0.5000,0.5000,NULL,'',6,0.0,0.0,NULL,'ACTIVE',0.00,4.90,35.00,4,5.00,'2026-07-12 12:41:45.799','2026-07-11 16:48:33.495','2026-07-12 12:41:45.800',NULL,NULL,'平菇'),('cmrglnnyt000nndzu9i18jjdn','05020300003','杏鲍菇',' ','磅','磅','磅',1.0000,1.0000,NULL,'',4,0.0,0.0,NULL,'ACTIVE',0.00,3.50,19.00,3,0.00,NULL,'2026-07-11 16:49:28.086','2026-07-11 16:53:30.107',NULL,NULL,'杏鲍菇'),('cmrglqqkc0000nd6yj5i1v8tm','05021200002','猴头菇（磅）',' ','磅','磅','磅',1.0000,1.0000,NULL,'',6,NULL,NULL,NULL,'ACTIVE',0.00,5.40,25.00,4,2.00,'2026-07-12 13:24:03.393','2026-07-11 16:51:51.420','2026-07-12 13:24:03.393',NULL,NULL,'猴头菇'),('cmrgmigee0004ndrvrkuo07z1','05020400011','白玉蟹味双拼',' ','千克','斤','斤',0.5000,0.5000,NULL,'',2,NULL,NULL,NULL,'ACTIVE',0.00,3.70,28.00,2,4.40,'2026-07-12 13:24:03.410','2026-07-11 17:13:24.614','2026-07-12 13:24:03.411',NULL,NULL,'白玉菇');
/*!40000 ALTER TABLE `materials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `merge_suggestions`
--

DROP TABLE IF EXISTS `merge_suggestions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `merge_suggestions` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `suggestionNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sourceOrderIds` json NOT NULL,
  `mergedOrderId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `totalWeight` decimal(10,2) DEFAULT NULL,
  `totalVolume` decimal(10,2) DEFAULT NULL,
  `totalKilometers` decimal(10,2) DEFAULT NULL,
  `estimatedCost` decimal(12,2) DEFAULT NULL,
  `costSaved` decimal(12,2) DEFAULT NULL,
  `routeDesc` text COLLATE utf8mb4_unicode_ci,
  `matchScore` decimal(5,2) DEFAULT NULL,
  `matchReasons` json DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `createdBy` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SYSTEM',
  `confirmedById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `confirmedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `merge_suggestions_suggestionNo_key` (`suggestionNo`),
  KEY `merge_suggestions_status_idx` (`status`),
  KEY `merge_suggestions_createdAt_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `merge_suggestions`
--

LOCK TABLES `merge_suggestions` WRITE;
/*!40000 ALTER TABLE `merge_suggestions` DISABLE KEYS */;
/*!40000 ALTER TABLE `merge_suggestions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mobile_layout_configs`
--

DROP TABLE IF EXISTS `mobile_layout_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mobile_layout_configs` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `roleGroup` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `navItems` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `dashboardCards` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `quickActions` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mobile_layout_configs_roleGroup_key` (`roleGroup`),
  KEY `mobile_layout_configs_roleGroup_idx` (`roleGroup`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mobile_layout_configs`
--

LOCK TABLES `mobile_layout_configs` WRITE;
/*!40000 ALTER TABLE `mobile_layout_configs` DISABLE KEYS */;
INSERT INTO `mobile_layout_configs` VALUES ('cmri10e9a0000nd9lcg5z0vpf','超级管理员','[{\"path\":\"/\",\"label\":\"首页\",\"icon\":\"Dashboard\",\"sortOrder\":1},{\"path\":\"/inventory\",\"label\":\"库存\",\"icon\":\"Inventory\",\"sortOrder\":2},{\"path\":\"/sales-orders\",\"label\":\"销售\",\"icon\":\"ShoppingCart\",\"sortOrder\":3},{\"path\":\"/purchase-orders\",\"label\":\"采购\",\"icon\":\"TrendingUp\",\"sortOrder\":4},{\"path\":\"/settings\",\"label\":\"设置\",\"icon\":\"Settings\",\"sortOrder\":5}]','[{\"label\":\"销售总额\",\"key\":\"sales\",\"icon\":\"ShoppingCart\",\"color\":\"#1976d2\",\"path\":\"/sales-orders\",\"sortOrder\":1},{\"label\":\"采购总额\",\"key\":\"purchase\",\"icon\":\"TrendingUp\",\"color\":\"#9c27b0\",\"path\":\"/purchase-orders\",\"sortOrder\":2},{\"label\":\"应收余额\",\"key\":\"receivable\",\"icon\":\"AccountBalanceWallet\",\"color\":\"#ed6c02\",\"path\":\"/receivables\",\"sortOrder\":3},{\"label\":\"应付余额\",\"key\":\"payable\",\"icon\":\"AccountBalanceWallet\",\"color\":\"#d32f2f\",\"path\":\"/payables\",\"sortOrder\":4},{\"label\":\"库存总量\",\"key\":\"inventory\",\"icon\":\"Inventory\",\"color\":\"#2e7d32\",\"path\":\"/inventory\",\"sortOrder\":5},{\"label\":\"临期批次\",\"key\":\"batch\",\"icon\":\"Warning\",\"color\":\"#f44336\",\"path\":\"/inventory\",\"sortOrder\":6}]','[{\"label\":\"实时库存\",\"icon\":\"Inventory\",\"path\":\"/inventory\",\"color\":\"primary.main\",\"sortOrder\":1},{\"label\":\"销售订单\",\"icon\":\"ShoppingCart\",\"path\":\"/sales-orders\",\"color\":\"secondary.main\",\"sortOrder\":2},{\"label\":\"采购订单\",\"icon\":\"TrendingUp\",\"path\":\"/purchase-orders\",\"color\":\"success.main\",\"sortOrder\":3},{\"label\":\"临期预警\",\"icon\":\"Warning\",\"path\":\"/inventory\",\"color\":\"warning.main\",\"sortOrder\":4}]','2026-07-12 16:47:02.446','2026-07-12 17:42:01.105'),('cmri10eab0001nd9lymu224rp','仓库管理员','[{\"path\":\"/\",\"label\":\"首页\",\"icon\":\"Dashboard\",\"sortOrder\":1},{\"path\":\"/inventory\",\"label\":\"库存\",\"icon\":\"Inventory\",\"sortOrder\":2},{\"path\":\"/scan-inbound\",\"label\":\"扫码\",\"icon\":\"QrCodeScanner\",\"sortOrder\":3},{\"path\":\"/stock-take\",\"label\":\"盘点\",\"icon\":\"Assignment\",\"sortOrder\":4},{\"path\":\"/settings\",\"label\":\"设置\",\"icon\":\"Settings\",\"sortOrder\":5}]','[{\"label\":\"库存总量\",\"key\":\"inventory\",\"icon\":\"Inventory\",\"color\":\"#2e7d32\",\"path\":\"/inventory\",\"sortOrder\":1},{\"label\":\"临期批次\",\"key\":\"batch\",\"icon\":\"Warning\",\"color\":\"#f44336\",\"path\":\"/inventory\",\"sortOrder\":2},{\"label\":\"待入库\",\"key\":\"pendingInbound\",\"icon\":\"QrCodeScanner\",\"color\":\"#1976d2\",\"path\":\"/scan-inbound\",\"sortOrder\":3},{\"label\":\"待盘点\",\"key\":\"pendingStockTake\",\"icon\":\"Assignment\",\"color\":\"#ed6c02\",\"path\":\"/stock-take\",\"sortOrder\":4}]','[{\"label\":\"扫码入库\",\"icon\":\"QrCodeScanner\",\"path\":\"/scan-inbound\",\"color\":\"primary.main\",\"sortOrder\":1},{\"label\":\"实时库存\",\"icon\":\"Inventory\",\"path\":\"/inventory\",\"color\":\"success.main\",\"sortOrder\":2},{\"label\":\"盘点管理\",\"icon\":\"Assignment\",\"path\":\"/stock-take\",\"color\":\"warning.main\",\"sortOrder\":3},{\"label\":\"临期预警\",\"icon\":\"Warning\",\"path\":\"/inventory\",\"color\":\"error.main\",\"sortOrder\":4}]','2026-07-12 16:47:02.484','2026-07-12 16:47:02.484'),('cmri10ead0002nd9luopjp0w0','销售经理','[{\"path\":\"/\",\"label\":\"首页\",\"icon\":\"Dashboard\",\"sortOrder\":1},{\"path\":\"/sales-orders\",\"label\":\"销售订单\",\"icon\":\"ShoppingCart\",\"sortOrder\":2},{\"path\":\"/sales-plans\",\"label\":\"销售计划\",\"icon\":\"Assignment\",\"sortOrder\":3},{\"path\":\"/receivables\",\"label\":\"应收\",\"icon\":\"AccountBalanceWallet\",\"sortOrder\":4},{\"path\":\"/settings\",\"label\":\"设置\",\"icon\":\"Settings\",\"sortOrder\":5}]','[{\"label\":\"销售总额\",\"key\":\"sales\",\"icon\":\"ShoppingCart\",\"color\":\"#1976d2\",\"path\":\"/sales-orders\",\"sortOrder\":1},{\"label\":\"应收余额\",\"key\":\"receivable\",\"icon\":\"AccountBalanceWallet\",\"color\":\"#ed6c02\",\"path\":\"/receivables\",\"sortOrder\":2},{\"label\":\"临期批次\",\"key\":\"batch\",\"icon\":\"Warning\",\"color\":\"#f44336\",\"path\":\"/inventory\",\"sortOrder\":3},{\"label\":\"库存总量\",\"key\":\"inventory\",\"icon\":\"Inventory\",\"color\":\"#2e7d32\",\"path\":\"/inventory\",\"sortOrder\":4}]','[{\"label\":\"销售订单\",\"icon\":\"ShoppingCart\",\"path\":\"/sales-orders\",\"color\":\"primary.main\",\"sortOrder\":1},{\"label\":\"销售计划\",\"icon\":\"Assignment\",\"path\":\"/sales-plans\",\"color\":\"secondary.main\",\"sortOrder\":2},{\"label\":\"应收账款\",\"icon\":\"AccountBalanceWallet\",\"path\":\"/receivables\",\"color\":\"warning.main\",\"sortOrder\":3},{\"label\":\"实时库存\",\"icon\":\"Inventory\",\"path\":\"/inventory\",\"color\":\"success.main\",\"sortOrder\":4}]','2026-07-12 16:47:02.485','2026-07-12 16:47:02.485'),('cmri10eao0003nd9l2tj86wej','采购员','[{\"path\":\"/\",\"label\":\"首页\",\"icon\":\"Dashboard\",\"sortOrder\":1},{\"path\":\"/purchase-orders\",\"label\":\"采购订单\",\"icon\":\"TrendingUp\",\"sortOrder\":2},{\"path\":\"/payables\",\"label\":\"应付\",\"icon\":\"AccountBalanceWallet\",\"sortOrder\":3},{\"path\":\"/settings\",\"label\":\"设置\",\"icon\":\"Settings\",\"sortOrder\":4}]','[{\"label\":\"采购总额\",\"key\":\"purchase\",\"icon\":\"TrendingUp\",\"color\":\"#9c27b0\",\"path\":\"/purchase-orders\",\"sortOrder\":1},{\"label\":\"应付余额\",\"key\":\"payable\",\"icon\":\"AccountBalanceWallet\",\"color\":\"#d32f2f\",\"path\":\"/payables\",\"sortOrder\":2},{\"label\":\"库存总量\",\"key\":\"inventory\",\"icon\":\"Inventory\",\"color\":\"#2e7d32\",\"path\":\"/inventory\",\"sortOrder\":3}]','[{\"label\":\"采购订单\",\"icon\":\"TrendingUp\",\"path\":\"/purchase-orders\",\"color\":\"primary.main\",\"sortOrder\":1},{\"label\":\"应付账款\",\"icon\":\"AccountBalanceWallet\",\"path\":\"/payables\",\"color\":\"error.main\",\"sortOrder\":2},{\"label\":\"实时库存\",\"icon\":\"Inventory\",\"path\":\"/inventory\",\"color\":\"success.main\",\"sortOrder\":3}]','2026-07-12 16:47:02.496','2026-07-12 16:47:02.496'),('cmri10eaq0004nd9lylx0qcsd','采购计划专员','[{\"path\":\"/\",\"label\":\"首页\",\"icon\":\"Dashboard\",\"sortOrder\":1},{\"path\":\"/purchase-orders\",\"label\":\"采购订单\",\"icon\":\"TrendingUp\",\"sortOrder\":2},{\"path\":\"/payables\",\"label\":\"应付\",\"icon\":\"AccountBalanceWallet\",\"sortOrder\":3},{\"path\":\"/settings\",\"label\":\"设置\",\"icon\":\"Settings\",\"sortOrder\":4}]','[{\"label\":\"采购总额\",\"key\":\"purchase\",\"icon\":\"TrendingUp\",\"color\":\"#9c27b0\",\"path\":\"/purchase-orders\",\"sortOrder\":1},{\"label\":\"应付余额\",\"key\":\"payable\",\"icon\":\"AccountBalanceWallet\",\"color\":\"#d32f2f\",\"path\":\"/payables\",\"sortOrder\":2},{\"label\":\"库存总量\",\"key\":\"inventory\",\"icon\":\"Inventory\",\"color\":\"#2e7d32\",\"path\":\"/inventory\",\"sortOrder\":3}]','[{\"label\":\"采购订单\",\"icon\":\"TrendingUp\",\"path\":\"/purchase-orders\",\"color\":\"primary.main\",\"sortOrder\":1},{\"label\":\"应付账款\",\"icon\":\"AccountBalanceWallet\",\"path\":\"/payables\",\"color\":\"error.main\",\"sortOrder\":2},{\"label\":\"实时库存\",\"icon\":\"Inventory\",\"path\":\"/inventory\",\"color\":\"success.main\",\"sortOrder\":3}]','2026-07-12 16:47:02.498','2026-07-12 16:47:02.498'),('cmri10ear0005nd9l1pqpw7b3','HR管理员','[{\"path\":\"/\",\"label\":\"首页\",\"icon\":\"Dashboard\",\"sortOrder\":1},{\"path\":\"/inventory\",\"label\":\"库存\",\"icon\":\"Inventory\",\"sortOrder\":2},{\"path\":\"/sales-orders\",\"label\":\"销售\",\"icon\":\"ShoppingCart\",\"sortOrder\":3},{\"path\":\"/purchase-orders\",\"label\":\"采购\",\"icon\":\"TrendingUp\",\"sortOrder\":4},{\"path\":\"/settings\",\"label\":\"设置\",\"icon\":\"Settings\",\"sortOrder\":5}]','[{\"label\":\"销售总额\",\"key\":\"sales\",\"icon\":\"ShoppingCart\",\"color\":\"#1976d2\",\"path\":\"/sales-orders\",\"sortOrder\":1},{\"label\":\"采购总额\",\"key\":\"purchase\",\"icon\":\"TrendingUp\",\"color\":\"#9c27b0\",\"path\":\"/purchase-orders\",\"sortOrder\":2},{\"label\":\"库存总量\",\"key\":\"inventory\",\"icon\":\"Inventory\",\"color\":\"#2e7d32\",\"path\":\"/inventory\",\"sortOrder\":3}]','[{\"label\":\"实时库存\",\"icon\":\"Inventory\",\"path\":\"/inventory\",\"color\":\"primary.main\",\"sortOrder\":1},{\"label\":\"销售订单\",\"icon\":\"ShoppingCart\",\"path\":\"/sales-orders\",\"color\":\"secondary.main\",\"sortOrder\":2},{\"label\":\"采购订单\",\"icon\":\"TrendingUp\",\"path\":\"/purchase-orders\",\"color\":\"success.main\",\"sortOrder\":3}]','2026-07-12 16:47:02.500','2026-07-12 16:47:02.500'),('cmri10eat0006nd9lt6r097xk','经理','[{\"path\":\"/\",\"label\":\"首页\",\"icon\":\"Dashboard\",\"sortOrder\":1},{\"path\":\"/sales-orders\",\"label\":\"销售订单\",\"icon\":\"ShoppingCart\",\"sortOrder\":2},{\"path\":\"/purchase-orders\",\"label\":\"采购订单\",\"icon\":\"TrendingUp\",\"sortOrder\":3},{\"path\":\"/inventory\",\"label\":\"库存\",\"icon\":\"Inventory\",\"sortOrder\":4},{\"path\":\"/settings\",\"label\":\"设置\",\"icon\":\"Settings\",\"sortOrder\":5}]','[{\"label\":\"销售总额\",\"key\":\"sales\",\"icon\":\"ShoppingCart\",\"color\":\"#1976d2\",\"path\":\"/sales-orders\",\"sortOrder\":1},{\"label\":\"采购总额\",\"key\":\"purchase\",\"icon\":\"TrendingUp\",\"color\":\"#9c27b0\",\"path\":\"/purchase-orders\",\"sortOrder\":2},{\"label\":\"库存总量\",\"key\":\"inventory\",\"icon\":\"Inventory\",\"color\":\"#2e7d32\",\"path\":\"/inventory\",\"sortOrder\":3},{\"label\":\"应收余额\",\"key\":\"receivable\",\"icon\":\"AccountBalanceWallet\",\"color\":\"#ed6c02\",\"path\":\"/receivables\",\"sortOrder\":4},{\"label\":\"应付余额\",\"key\":\"payable\",\"icon\":\"AccountBalanceWallet\",\"color\":\"#d32f2f\",\"path\":\"/payables\",\"sortOrder\":5}]','[{\"label\":\"销售订单\",\"icon\":\"ShoppingCart\",\"path\":\"/sales-orders\",\"color\":\"primary.main\",\"sortOrder\":1},{\"label\":\"采购订单\",\"icon\":\"TrendingUp\",\"path\":\"/purchase-orders\",\"color\":\"secondary.main\",\"sortOrder\":2},{\"label\":\"实时库存\",\"icon\":\"Inventory\",\"path\":\"/inventory\",\"color\":\"success.main\",\"sortOrder\":3}]','2026-07-12 16:47:02.501','2026-07-12 16:47:02.501'),('cmri10eav0007nd9ldzes4ute','普通员工','[{\"path\":\"/\",\"label\":\"首页\",\"icon\":\"Dashboard\",\"sortOrder\":1},{\"path\":\"/settings\",\"label\":\"设置\",\"icon\":\"Settings\",\"sortOrder\":2}]','[{\"label\":\"库存总量\",\"key\":\"inventory\",\"icon\":\"Inventory\",\"color\":\"#2e7d32\",\"path\":\"/inventory\",\"sortOrder\":1}]','[{\"label\":\"实时库存\",\"icon\":\"Inventory\",\"path\":\"/inventory\",\"color\":\"primary.main\",\"sortOrder\":1}]','2026-07-12 16:47:02.504','2026-07-12 16:47:02.504');
/*!40000 ALTER TABLE `mobile_layout_configs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `targetUserId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `targetDept` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `refId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isRead` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `notifications_targetUserId_isRead_idx` (`targetUserId`,`isRead`),
  CONSTRAINT `notifications_targetUserId_fkey` FOREIGN KEY (`targetUserId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `paymentNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `paymentType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `partyId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `partyType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `paymentMethod` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bankAccount` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refArId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refApId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paymentDate` datetime(3) NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CONFIRMED',
  `operatorId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `payments_paymentNo_key` (`paymentNo`),
  KEY `payments_partyType_partyId_idx` (`partyType`,`partyId`),
  KEY `payments_paymentDate_idx` (`paymentDate`),
  KEY `payments_operatorId_fkey` (`operatorId`),
  CONSTRAINT `payments_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `price_lists`
--

DROP TABLE IF EXISTS `price_lists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `price_lists` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `departmentId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `salesRepId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` decimal(12,2) NOT NULL,
  `minPrice` decimal(12,2) NOT NULL DEFAULT '0.00',
  `priceType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'STANDARD',
  `tierPricing` json DEFAULT NULL,
  `effectiveFrom` datetime(3) DEFAULT NULL,
  `effectiveTo` datetime(3) DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `price_lists_materialId_idx` (`materialId`),
  KEY `price_lists_customerId_idx` (`customerId`),
  KEY `price_lists_departmentId_fkey` (`departmentId`),
  KEY `price_lists_salesRepId_fkey` (`salesRepId`),
  CONSTRAINT `price_lists_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `price_lists_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `price_lists_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `price_lists_salesRepId_fkey` FOREIGN KEY (`salesRepId`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `price_lists`
--

LOCK TABLES `price_lists` WRITE;
/*!40000 ALTER TABLE `price_lists` DISABLE KEYS */;
/*!40000 ALTER TABLE `price_lists` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `print_templates`
--

DROP TABLE IF EXISTS `print_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `print_templates` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `templateNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `moduleType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `templateContent` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `paperSize` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'A4',
  `orientation` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'portrait',
  `margins` json DEFAULT NULL,
  `headerContent` longtext COLLATE utf8mb4_unicode_ci,
  `footerContent` longtext COLLATE utf8mb4_unicode_ci,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `print_templates_templateNo_key` (`templateNo`),
  KEY `print_templates_moduleType_idx` (`moduleType`),
  KEY `print_templates_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `print_templates`
--

LOCK TABLES `print_templates` WRITE;
/*!40000 ALTER TABLE `print_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `print_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_loss_records`
--

DROP TABLE IF EXISTS `product_loss_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_loss_records` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materialName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `beginningQty` decimal(12,2) NOT NULL DEFAULT '0.00',
  `inboundQty` decimal(12,2) NOT NULL DEFAULT '0.00',
  `outboundQty` decimal(12,2) NOT NULL DEFAULT '0.00',
  `expectedQty` decimal(12,2) NOT NULL DEFAULT '0.00',
  `actualQty` decimal(12,2) NOT NULL DEFAULT '0.00',
  `lossQty` decimal(12,2) NOT NULL DEFAULT '0.00',
  `lossRate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `cumulativeLossRate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `lossAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `weightedAvgPrice` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `periodStart` datetime(3) DEFAULT NULL,
  `periodEnd` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `calculatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `product_loss_records_materialId_calculatedAt_idx` (`materialId`,`calculatedAt`),
  KEY `product_loss_records_calculatedAt_idx` (`calculatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_loss_records`
--

LOCK TABLES `product_loss_records` WRITE;
/*!40000 ALTER TABLE `product_loss_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_loss_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_order_items`
--

DROP TABLE IF EXISTS `purchase_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_order_items` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orderId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `planItemId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `qty` int NOT NULL,
  `unitPrice` decimal(12,2) NOT NULL,
  `taxRate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `totalAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `taxAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `grandTotal` decimal(14,2) NOT NULL DEFAULT '0.00',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `grade_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_order_items_orderId_idx` (`orderId`),
  KEY `purchase_order_items_planItemId_idx` (`planItemId`),
  KEY `purchase_order_items_materialId_fkey` (`materialId`),
  KEY `purchase_order_items_grade_id_fkey` (`grade_id`),
  CONSTRAINT `purchase_order_items_grade_id_fkey` FOREIGN KEY (`grade_id`) REFERENCES `material_grades` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_order_items_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `purchase_order_items_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `purchase_order_items_planItemId_fkey` FOREIGN KEY (`planItemId`) REFERENCES `purchase_plan_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_order_items`
--

LOCK TABLES `purchase_order_items` WRITE;
/*!40000 ALTER TABLE `purchase_order_items` DISABLE KEYS */;
INSERT INTO `purchase_order_items` VALUES ('cmrgoe6so001gndzrh5er9kb8','cmrgoe6so001endzrvcxa9hf8','cmrgoasmo001cndzr36m28rtk','cmrglkmgf000kndzuq19wpwm4',50,3.30,0.00,165.00,0.00,165.00,NULL,'2026-07-11 18:06:04.776',NULL),('cmrgoe6so001hndzrv0oz7sx4','cmrgoe6so001endzrvcxa9hf8','cmrgoasmm0018ndzrhz3trrqf','cmrglmhue000mndzuvxu8h3bh',70,2.50,0.00,175.00,0.00,175.00,NULL,'2026-07-11 18:06:04.776',NULL),('cmrhtqi7d0003ndbm17i1sxic','cmrhtqi7c0001ndbm3sfp85sj','cmrgoasmk0014ndzrf8sknmcd','cmrglqqkc0000nd6yj5i1v8tm',20,2.00,0.00,40.00,0.00,40.00,NULL,'2026-07-12 13:23:23.689',NULL),('cmrhtqi7d0004ndbmt23bkcab','cmrhtqi7c0001ndbm3sfp85sj','cmrgnzmf5000undzrsidl9yze','cmrgmigee0004ndrvrkuo07z1',110,2.20,0.00,242.00,0.00,242.00,NULL,'2026-07-12 13:23:23.689',NULL);
/*!40000 ALTER TABLE `purchase_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_orders` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orderNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplierId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchasePlanId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `purchasePlanItemId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `warehouseId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orderDate` datetime(3) NOT NULL,
  `expectedDate` datetime(3) DEFAULT NULL,
  `receiptStatus` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `receivedQty` int NOT NULL DEFAULT '0',
  `unitPrice` decimal(12,2) NOT NULL DEFAULT '0.00',
  `taxRate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `qty` int NOT NULL,
  `totalAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `taxAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `grandTotal` decimal(14,2) NOT NULL DEFAULT '0.00',
  `contractId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `buyerId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_orders_orderNo_key` (`orderNo`),
  KEY `purchase_orders_supplierId_idx` (`supplierId`),
  KEY `purchase_orders_status_idx` (`status`),
  KEY `purchase_orders_purchasePlanId_idx` (`purchasePlanId`),
  KEY `purchase_orders_warehouseId_fkey` (`warehouseId`),
  KEY `purchase_orders_buyerId_fkey` (`buyerId`),
  KEY `purchase_orders_contractId_fkey` (`contractId`),
  CONSTRAINT `purchase_orders_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_orders_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `contracts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_orders_purchasePlanId_fkey` FOREIGN KEY (`purchasePlanId`) REFERENCES `purchase_plans` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_orders_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `purchase_orders_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
INSERT INTO `purchase_orders` VALUES ('cmrgoe6so001endzrvcxa9hf8','PO202607129ZI9XW','cmrgmtu5f0000ndzrnbzsvxf2','cmrgoasmo001andzr2flntgk5','cmrgoasmo001cndzr36m28rtk','cmr3gdk25000jnd8pkxg7f1er','2026-07-11 00:00:00.000','2026-07-16 00:00:00.000','PENDING',0,2.83,0.00,120,340.00,0.00,340.00,NULL,'ORDERED','cmr2xthjt000fnddogkor8u3s',NULL,'2026-07-11 18:06:04.776','2026-07-11 18:07:16.903'),('cmrhtqi7c0001ndbm3sfp85sj','PO202607124BIIG3','cmrgn68jt0001ndzrrja28eg2','cmrgoasmk0012ndzrgwmgtvq1','cmrgoasmk0014ndzrf8sknmcd','cmrhfbmx40003ndr9g2cfk60o','2026-07-12 00:00:00.000','2026-07-14 00:00:00.000','PENDING',0,2.17,0.00,130,282.00,0.00,282.00,NULL,'ORDERED','cmr2xthjt000fnddogkor8u3s',NULL,'2026-07-12 13:23:23.689','2026-07-12 13:23:31.868');
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_plan_items`
--

DROP TABLE IF EXISTS `purchase_plan_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_plan_items` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `planId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `planQty` int NOT NULL DEFAULT '0',
  `unit` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `budgetUnitPrice` decimal(12,2) NOT NULL DEFAULT '0.00',
  `budgetTotal` decimal(12,2) NOT NULL DEFAULT '0.00',
  `expectedDate` datetime(3) DEFAULT NULL,
  `orderedQty` int NOT NULL DEFAULT '0',
  `receivedQty` int NOT NULL DEFAULT '0',
  `supplierId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unitPrice` decimal(12,2) NOT NULL DEFAULT '0.00',
  `actualQty` int NOT NULL DEFAULT '0',
  `demand_agg_no` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `suggestion_no` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `forwarded` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `grade_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_plan_items_planId_idx` (`planId`),
  KEY `purchase_plan_items_materialId_idx` (`materialId`),
  KEY `purchase_plan_items_supplierId_fkey` (`supplierId`),
  KEY `purchase_plan_items_grade_id_fkey` (`grade_id`),
  CONSTRAINT `purchase_plan_items_grade_id_fkey` FOREIGN KEY (`grade_id`) REFERENCES `material_grades` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_plan_items_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `purchase_plan_items_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `purchase_plans` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `purchase_plan_items_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_plan_items`
--

LOCK TABLES `purchase_plan_items` WRITE;
/*!40000 ALTER TABLE `purchase_plan_items` DISABLE KEYS */;
INSERT INTO `purchase_plan_items` VALUES ('cmrgnzc42000qndzr51wz9kk6','cmrgnzc42000ondzr4gkw5uhf','cmrgmigee0004ndrvrkuo07z1',100,'斤',0.00,0.00,'2026-07-15 00:00:00.000',0,0,NULL,0.00,0,NULL,NULL,NULL,1,'2026-07-11 17:54:31.826','2026-07-11 17:54:45.192',NULL),('cmrgnzmf5000undzrsidl9yze','cmrgnzmf5000sndzrk6pa14kc','cmrgmigee0004ndrvrkuo07z1',100,'斤',0.00,0.00,'2026-07-15 00:00:00.000',110,0,'cmrgn68jt0001ndzrrja28eg2',2.20,110,NULL,'',NULL,0,'2026-07-11 17:54:45.185','2026-07-12 13:23:23.696',NULL),('cmrgoanbw000yndzrbpyqb9va','cmrgoanbw000wndzrcx3sm8vo','cmrglqqkc0000nd6yj5i1v8tm',20,'磅',0.00,0.00,'2026-07-16 00:00:00.000',0,0,NULL,0.00,0,NULL,NULL,NULL,1,'2026-07-11 18:03:19.580','2026-07-11 18:03:26.453',NULL),('cmrgoanbw000zndzrv146nqb7','cmrgoanbw000wndzrcx3sm8vo','cmrglmhue000mndzuvxu8h3bh',50,'斤',0.00,0.00,'2026-07-16 00:00:00.000',0,0,NULL,0.00,0,NULL,NULL,NULL,1,'2026-07-11 18:03:19.580','2026-07-11 18:03:26.453',NULL),('cmrgoanbw0010ndzrpq9m82f4','cmrgoanbw000wndzrcx3sm8vo','cmrglkmgf000kndzuq19wpwm4',30,'斤',0.00,0.00,'2026-07-15 00:00:00.000',0,0,NULL,0.00,0,NULL,NULL,NULL,1,'2026-07-11 18:03:19.580','2026-07-11 18:03:26.453',NULL),('cmrgoasmk0014ndzrf8sknmcd','cmrgoasmk0012ndzrgwmgtvq1','cmrglqqkc0000nd6yj5i1v8tm',20,'磅',0.00,0.00,'2026-07-16 00:00:00.000',20,0,'cmrgn68jt0001ndzrrja28eg2',2.00,20,NULL,'',NULL,0,'2026-07-11 18:03:26.444','2026-07-12 13:23:23.694',NULL),('cmrgoasmm0018ndzrhz3trrqf','cmrgoasmm0016ndzr2m0utiqp','cmrglmhue000mndzuvxu8h3bh',50,'斤',0.00,0.00,'2026-07-16 00:00:00.000',70,0,'cmrgmtu5f0000ndzrnbzsvxf2',2.50,70,NULL,'',NULL,0,'2026-07-11 18:03:26.447','2026-07-11 18:06:04.786',NULL),('cmrgoasmo001cndzr36m28rtk','cmrgoasmo001andzr2flntgk5','cmrglkmgf000kndzuq19wpwm4',30,'斤',0.00,0.00,'2026-07-15 00:00:00.000',50,0,'cmrgmtu5f0000ndzrnbzsvxf2',3.30,50,NULL,'',NULL,0,'2026-07-11 18:03:26.449','2026-07-11 18:06:04.783',NULL),('cmrgwr0gn001qndzrp6qig222','cmrgwr0gm001ondzr6oegki4d','cmrglj5bv000indzutrm5g6sn',6,'斤',0.00,0.00,'2026-07-14 22:00:00.021',0,0,NULL,0.00,0,NULL,'建议采购量=3, 安全库存=3, 当前库存=0','PS20260712N69G0I001',1,'2026-07-11 22:00:00.023','2026-07-11 22:00:00.052',NULL),('cmrgwr0gn001rndzru9lg1hfk','cmrgwr0gm001ondzr6oegki4d','cmrgljo01000jndzuub93jo15',6,'千克',0.00,0.00,'2026-07-14 22:00:00.021',0,0,NULL,0.00,0,NULL,'建议采购量=3, 安全库存=3, 当前库存=0','PS20260712N69G0I002',1,'2026-07-11 22:00:00.023','2026-07-11 22:00:00.052',NULL),('cmrgwr0gn001sndzr2p7wwi7e','cmrgwr0gm001ondzr6oegki4d','cmrglkmgf000kndzuq19wpwm4',6,'斤',0.00,0.00,'2026-07-14 22:00:00.021',0,0,NULL,0.00,0,NULL,'建议采购量=3, 安全库存=3, 当前库存=0','PS20260712N69G0I003',1,'2026-07-11 22:00:00.023','2026-07-11 22:00:00.052',NULL),('cmrgwr0gn001tndzrhee8xws1','cmrgwr0gm001ondzr6oegki4d','cmrgllmt2000lndzu9dqnbvbz',6,'斤',0.00,0.00,'2026-07-14 22:00:00.021',0,0,NULL,0.00,0,NULL,'建议采购量=3, 安全库存=3, 当前库存=0','PS20260712N69G0I004',1,'2026-07-11 22:00:00.023','2026-07-11 22:00:00.052',NULL),('cmrgwr0gn001undzrsz5rxcqe','cmrgwr0gm001ondzr6oegki4d','cmrglmhue000mndzuvxu8h3bh',8,'斤',0.00,0.00,'2026-07-15 22:00:00.021',0,0,NULL,0.00,0,NULL,'建议采购量=4, 安全库存=4, 当前库存=0','PS20260712N69G0I005',1,'2026-07-11 22:00:00.023','2026-07-11 22:00:00.052',NULL),('cmrgwr0gn001vndzrae9wcwuc','cmrgwr0gm001ondzr6oegki4d','cmrglnnyt000nndzu9i18jjdn',3,'磅',0.00,0.00,'2026-07-14 22:00:00.021',0,0,NULL,0.00,0,NULL,'建议采购量=3, 安全库存=3, 当前库存=0','PS20260712N69G0I006',1,'2026-07-11 22:00:00.023','2026-07-11 22:00:00.052',NULL),('cmrgwr0gn001wndzrt01dchz0','cmrgwr0gm001ondzr6oegki4d','cmrglqqkc0000nd6yj5i1v8tm',4,'磅',0.00,0.00,'2026-07-15 22:00:00.021',0,0,NULL,0.00,0,NULL,'建议采购量=4, 安全库存=4, 当前库存=0','PS20260712N69G0I007',1,'2026-07-11 22:00:00.023','2026-07-11 22:00:00.052',NULL),('cmrgwr0gn001xndzrjkpla5vu','cmrgwr0gm001ondzr6oegki4d','cmrgmigee0004ndrvrkuo07z1',4,'斤',0.00,0.00,'2026-07-13 22:00:00.021',0,0,NULL,0.00,0,NULL,'建议采购量=2, 安全库存=2, 当前库存=0','PS20260712N69G0I008',1,'2026-07-11 22:00:00.023','2026-07-11 22:00:00.052',NULL),('cmrgwr0gz0021ndzrelbpg5y2','cmrgwr0gz001zndzrtru5n0gb','cmrglj5bv000indzutrm5g6sn',6,'斤',0.00,0.00,'2026-07-14 22:00:00.021',0,0,NULL,0.00,0,NULL,'建议采购量=3, 安全库存=3, 当前库存=0','PS20260712N69G0I001',0,'2026-07-11 22:00:00.036','2026-07-11 22:00:00.036',NULL),('cmrgwr0h30025ndzrxdo85rnt','cmrgwr0h20023ndzr6ao6xz1a','cmrgljo01000jndzuub93jo15',6,'千克',0.00,0.00,'2026-07-14 22:00:00.021',0,0,NULL,0.00,0,NULL,'建议采购量=3, 安全库存=3, 当前库存=0','PS20260712N69G0I002',0,'2026-07-11 22:00:00.039','2026-07-11 22:00:00.039',NULL),('cmrgwr0h30026ndzr6uoamtz5','cmrgwr0h20023ndzr6ao6xz1a','cmrglkmgf000kndzuq19wpwm4',6,'斤',0.00,0.00,'2026-07-14 22:00:00.021',0,0,NULL,0.00,0,NULL,'建议采购量=3, 安全库存=3, 当前库存=0','PS20260712N69G0I003',0,'2026-07-11 22:00:00.039','2026-07-11 22:00:00.039',NULL),('cmrgwr0h5002andzrtabzqyiz','cmrgwr0h50028ndzryefz3hut','cmrgllmt2000lndzu9dqnbvbz',6,'斤',0.00,0.00,'2026-07-14 22:00:00.021',0,0,NULL,0.00,0,NULL,'建议采购量=3, 安全库存=3, 当前库存=0','PS20260712N69G0I004',0,'2026-07-11 22:00:00.042','2026-07-11 22:00:00.042',NULL),('cmrgwr0h5002bndzrt586spxp','cmrgwr0h50028ndzryefz3hut','cmrglmhue000mndzuvxu8h3bh',8,'斤',0.00,0.00,'2026-07-15 22:00:00.021',0,0,NULL,0.00,0,NULL,'建议采购量=4, 安全库存=4, 当前库存=0','PS20260712N69G0I005',0,'2026-07-11 22:00:00.042','2026-07-11 22:00:00.042',NULL),('cmrgwr0h5002cndzrmcznp2s3','cmrgwr0h50028ndzryefz3hut','cmrglnnyt000nndzu9i18jjdn',3,'磅',0.00,0.00,'2026-07-14 22:00:00.021',0,0,NULL,0.00,0,NULL,'建议采购量=3, 安全库存=3, 当前库存=0','PS20260712N69G0I006',0,'2026-07-11 22:00:00.042','2026-07-11 22:00:00.042',NULL),('cmrgwr0h8002gndzrhb8l1414','cmrgwr0h8002endzrf7qcim2s','cmrglqqkc0000nd6yj5i1v8tm',4,'磅',0.00,0.00,'2026-07-15 22:00:00.021',0,0,NULL,0.00,0,NULL,'建议采购量=4, 安全库存=4, 当前库存=0','PS20260712N69G0I007',0,'2026-07-11 22:00:00.044','2026-07-11 22:00:00.044',NULL),('cmrgwr0h8002hndzro9pzk619','cmrgwr0h8002endzrf7qcim2s','cmrgmigee0004ndrvrkuo07z1',4,'斤',0.00,0.00,'2026-07-13 22:00:00.021',0,0,NULL,0.00,0,NULL,'建议采购量=2, 安全库存=2, 当前库存=0','PS20260712N69G0I008',0,'2026-07-11 22:00:00.044','2026-07-11 22:00:00.044',NULL);
/*!40000 ALTER TABLE `purchase_plan_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_plans`
--

DROP TABLE IF EXISTS `purchase_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_plans` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `planNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `planType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MONTHLY',
  `priceDate` datetime(3) DEFAULT NULL,
  `periodStart` datetime(3) DEFAULT NULL,
  `periodEnd` datetime(3) DEFAULT NULL,
  `departmentId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `totalBudget` decimal(14,2) NOT NULL DEFAULT '0.00',
  `creatorId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `approverId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approvedAt` datetime(3) DEFAULT NULL,
  `publishedAt` datetime(3) DEFAULT NULL,
  `parentPlanId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigneeId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_plans_planNo_key` (`planNo`),
  KEY `purchase_plans_status_idx` (`status`),
  KEY `purchase_plans_periodEnd_idx` (`periodEnd`),
  KEY `purchase_plans_parentPlanId_idx` (`parentPlanId`),
  KEY `purchase_plans_assigneeId_idx` (`assigneeId`),
  KEY `purchase_plans_departmentId_fkey` (`departmentId`),
  KEY `purchase_plans_creatorId_fkey` (`creatorId`),
  KEY `purchase_plans_approverId_fkey` (`approverId`),
  CONSTRAINT `purchase_plans_approverId_fkey` FOREIGN KEY (`approverId`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_plans_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_plans_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `employees` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `purchase_plans_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_plans_parentPlanId_fkey` FOREIGN KEY (`parentPlanId`) REFERENCES `purchase_plans` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_plans`
--

LOCK TABLES `purchase_plans` WRITE;
/*!40000 ALTER TABLE `purchase_plans` DISABLE KEYS */;
INSERT INTO `purchase_plans` VALUES ('cmrgnzc42000ondzr4gkw5uhf','PP20260712M3C3KM','采购计划测试1','MONTHLY','2026-07-12 00:00:00.000',NULL,NULL,'cmr34c7oy0001ndimnx3t2ve5','APPROVED',0.00,'cmr2xthjt000fnddogkor8u3s','cmr2xthjt000fnddogkor8u3s','2026-07-11 17:54:43.361','2026-07-11 17:54:45.188',NULL,NULL,NULL,'2026-07-11 17:54:31.826','2026-07-11 17:54:45.189'),('cmrgnzmf5000sndzrk6pa14kc','PP20260712M3C3KM-01','采购计划测试1（于雷）','MONTHLY','2026-07-11 17:54:45.184',NULL,NULL,'cmr34c7p50005ndimo6wdcsz5','CONFIRMED',0.00,'cmr2xthjt000fnddogkor8u3s',NULL,'2026-07-11 17:54:45.184','2026-07-11 17:54:45.184','cmrgnzc42000ondzr4gkw5uhf','cmr3gzz1q0001ndfl9rlzmkuu','由父计划 PP20260712M3C3KM 自动分配','2026-07-11 17:54:45.185','2026-07-11 18:02:13.729'),('cmrgoanbw000wndzrcx3sm8vo','PP202607123H1I50','采购计划测试2','MONTHLY','2026-07-12 00:00:00.000',NULL,NULL,'cmr34c7oy0001ndimnx3t2ve5','APPROVED',0.00,'cmr2xthjt000fnddogkor8u3s','cmr2xthjt000fnddogkor8u3s','2026-07-11 18:03:24.333','2026-07-11 18:03:26.451',NULL,NULL,NULL,'2026-07-11 18:03:19.580','2026-07-11 18:03:26.451'),('cmrgoasmk0012ndzrgwmgtvq1','PP202607123H1I50-01','采购计划测试2（于雷）','MONTHLY','2026-07-11 18:03:26.443',NULL,NULL,'cmr34c7p50005ndimo6wdcsz5','CONFIRMED',0.00,'cmr2xthjt000fnddogkor8u3s',NULL,'2026-07-11 18:03:26.443','2026-07-11 18:03:26.443','cmrgoanbw000wndzrcx3sm8vo','cmr3gzz1q0001ndfl9rlzmkuu','由父计划 PP202607123H1I50 自动分配','2026-07-11 18:03:26.444','2026-07-11 18:05:28.865'),('cmrgoasmm0016ndzr2m0utiqp','PP202607123H1I50-02','采购计划测试2（吴月新）','MONTHLY','2026-07-11 18:03:26.446',NULL,NULL,'cmr34c7p50005ndimo6wdcsz5','CONFIRMED',0.00,'cmr2xthjt000fnddogkor8u3s',NULL,'2026-07-11 18:03:26.446','2026-07-11 18:03:26.446','cmrgoanbw000wndzrcx3sm8vo','cmr2xthn30012nddoaxv9bdn9','由父计划 PP202607123H1I50 自动分配','2026-07-11 18:03:26.447','2026-07-11 18:04:56.360'),('cmrgoasmo001andzr2flntgk5','PP202607123H1I50-03','采购计划测试2（吕永权）','MONTHLY','2026-07-11 18:03:26.448',NULL,NULL,'cmr34c7p20003ndimfr7nzkzp','CONFIRMED',0.00,'cmr2xthjt000fnddogkor8u3s',NULL,'2026-07-11 18:03:26.448','2026-07-11 18:03:26.448','cmrgoanbw000wndzrcx3sm8vo','cmr2xthn20010nddonsbyj3y7','由父计划 PP202607123H1I50 自动分配','2026-07-11 18:03:26.449','2026-07-11 18:04:10.891'),('cmrgwr0gm001ondzr6oegki4d','PP20260712IPOM5X','自动采购计划 2026-07-12','MONTHLY','2026-07-11 22:00:00.021','2026-07-11 22:00:00.021','2026-08-10 22:00:00.021','cmr34c7p50005ndimo6wdcsz5','APPROVED',0.00,'cmr2xthjw000nnddoa651alvh',NULL,'2026-07-11 22:00:00.002','2026-07-11 22:00:00.047',NULL,NULL,'每日定时智能建议自动生成','2026-07-11 22:00:00.023','2026-07-11 22:00:00.048'),('cmrgwr0gz001zndzrtru5n0gb','PP20260712IPOM5X-01','自动采购计划 2026-07-12（王小明）','MONTHLY','2026-07-11 22:00:00.035','2026-07-11 22:00:00.021','2026-08-10 22:00:00.021','cmr34c7p20003ndimfr7nzkzp','APPROVED',0.00,'cmr2xthjw000nnddoa651alvh',NULL,'2026-07-11 22:00:00.035','2026-07-11 22:00:00.035','cmrgwr0gm001ondzr6oegki4d','cmr2xthn40014nddomdsrpif1','定时自动生成并分配','2026-07-11 22:00:00.036','2026-07-11 22:00:00.036'),('cmrgwr0h20023ndzr6ao6xz1a','PP20260712IPOM5X-02','自动采购计划 2026-07-12（吕永权）','MONTHLY','2026-07-11 22:00:00.038','2026-07-11 22:00:00.021','2026-08-10 22:00:00.021','cmr34c7p20003ndimfr7nzkzp','APPROVED',0.00,'cmr2xthjw000nnddoa651alvh',NULL,'2026-07-11 22:00:00.038','2026-07-11 22:00:00.038','cmrgwr0gm001ondzr6oegki4d','cmr2xthn20010nddonsbyj3y7','定时自动生成并分配','2026-07-11 22:00:00.039','2026-07-11 22:00:00.039'),('cmrgwr0h50028ndzryefz3hut','PP20260712IPOM5X-03','自动采购计划 2026-07-12（吴月新）','MONTHLY','2026-07-11 22:00:00.041','2026-07-11 22:00:00.021','2026-08-10 22:00:00.021','cmr34c7p50005ndimo6wdcsz5','APPROVED',0.00,'cmr2xthjw000nnddoa651alvh',NULL,'2026-07-11 22:00:00.041','2026-07-11 22:00:00.041','cmrgwr0gm001ondzr6oegki4d','cmr2xthn30012nddoaxv9bdn9','定时自动生成并分配','2026-07-11 22:00:00.042','2026-07-11 22:00:00.042'),('cmrgwr0h8002endzrf7qcim2s','PP20260712IPOM5X-04','自动采购计划 2026-07-12（于雷）','MONTHLY','2026-07-11 22:00:00.044','2026-07-11 22:00:00.021','2026-08-10 22:00:00.021','cmr34c7p50005ndimo6wdcsz5','APPROVED',0.00,'cmr2xthjw000nnddoa651alvh',NULL,'2026-07-11 22:00:00.044','2026-07-11 22:00:00.044','cmrgwr0gm001ondzr6oegki4d','cmr3gzz1q0001ndfl9rlzmkuu','定时自动生成并分配','2026-07-11 22:00:00.044','2026-07-11 22:00:00.044');
/*!40000 ALTER TABLE `purchase_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_receipt_items`
--

DROP TABLE IF EXISTS `purchase_receipt_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_receipt_items` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `receiptId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orderItemId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `receivedQty` int NOT NULL DEFAULT '0',
  `unitPrice` decimal(12,2) NOT NULL,
  `taxRate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `totalAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `qcResult` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `qcAttachment` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `batchId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `grade_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_receipt_items_orderItemId_key` (`orderItemId`),
  UNIQUE KEY `purchase_receipt_items_batchId_key` (`batchId`),
  KEY `purchase_receipt_items_receiptId_idx` (`receiptId`),
  KEY `purchase_receipt_items_materialId_idx` (`materialId`),
  KEY `purchase_receipt_items_grade_id_fkey` (`grade_id`),
  CONSTRAINT `purchase_receipt_items_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_receipt_items_grade_id_fkey` FOREIGN KEY (`grade_id`) REFERENCES `material_grades` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_receipt_items_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `purchase_receipt_items_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `purchase_order_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_receipt_items_receiptId_fkey` FOREIGN KEY (`receiptId`) REFERENCES `purchase_receipts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_receipt_items`
--

LOCK TABLES `purchase_receipt_items` WRITE;
/*!40000 ALTER TABLE `purchase_receipt_items` DISABLE KEYS */;
INSERT INTO `purchase_receipt_items` VALUES ('cmrgofqga001lndzrb6jdbljq','cmrgofqga001jndzrip6xmuv4','cmrgoe6so001gndzrh5er9kb8','cmrglkmgf000kndzuq19wpwm4',60,3.30,0.00,198.00,'INSPECTED','/uploads/qc/qc_1783860068430-945632909.jpg','cmrhs8ysk0001ndx5iqvsv4pu','CONFIRMED','2026-07-11 18:07:16.906',NULL),('cmrgofqga001mndzr5ecy5mwc','cmrgofqga001jndzrip6xmuv4','cmrgoe6so001hndzrv0oz7sx4','cmrglmhue000mndzuvxu8h3bh',100,2.50,0.00,250.00,'INSPECTED','/uploads/qc/qc_1783860074381-566670356.jpg','cmrhs8yt9000bndx53puq3xdk','CONFIRMED','2026-07-11 18:07:16.906',NULL),('cmrhtqoip0008ndbmpc6on0yn','cmrhtqoip0006ndbm8eccko5w','cmrhtqi7d0003ndbm17i1sxic','cmrglqqkc0000nd6yj5i1v8tm',50,2.00,0.00,100.00,'INSPECTED','/uploads/qc/qc_1783862623259-725927778.jpg','cmrhtrctz000bndbmprtv0zc0','CONFIRMED','2026-07-12 13:23:31.873',NULL),('cmrhtqoip0009ndbmj87qctqb','cmrhtqoip0006ndbm8eccko5w','cmrhtqi7d0004ndbmt23bkcab','cmrgmigee0004ndrvrkuo07z1',120,2.20,0.00,264.00,'INSPECTED','/uploads/qc/qc_1783862627608-101907791.jpg','cmrhtrcuj000lndbmiq7w23bj','CONFIRMED','2026-07-12 13:23:31.873',NULL);
/*!40000 ALTER TABLE `purchase_receipt_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_receipts`
--

DROP TABLE IF EXISTS `purchase_receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_receipts` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `receiptNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchaseOrderId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `warehouseId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `locationId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receiptDate` datetime(3) DEFAULT NULL,
  `receivedQty` int NOT NULL,
  `unitPrice` decimal(12,2) NOT NULL,
  `taxRate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `totalAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `batchId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `inspectorId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qcResult` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PASS',
  `qcAttachment` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CONFIRMED',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `kingdee_inbound_no` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kingdee_order_no` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kingdee_sync_status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_receipts_receiptNo_key` (`receiptNo`),
  UNIQUE KEY `purchase_receipts_batchId_key` (`batchId`),
  KEY `purchase_receipts_purchaseOrderId_idx` (`purchaseOrderId`),
  KEY `purchase_receipts_warehouseId_fkey` (`warehouseId`),
  KEY `purchase_receipts_locationId_fkey` (`locationId`),
  KEY `purchase_receipts_materialId_fkey` (`materialId`),
  KEY `purchase_receipts_inspectorId_fkey` (`inspectorId`),
  CONSTRAINT `purchase_receipts_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_receipts_inspectorId_fkey` FOREIGN KEY (`inspectorId`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_receipts_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `warehouse_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_receipts_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_receipts_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchase_orders` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `purchase_receipts_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_receipts`
--

LOCK TABLES `purchase_receipts` WRITE;
/*!40000 ALTER TABLE `purchase_receipts` DISABLE KEYS */;
INSERT INTO `purchase_receipts` VALUES ('cmrgofqga001jndzrip6xmuv4','RC202607121A5574','cmrgoe6so001endzrvcxa9hf8','cmr3gdk25000jnd8pkxg7f1er',NULL,NULL,'2026-07-12 12:41:45.804',0,0.00,0.00,0.00,NULL,NULL,'PENDING',NULL,'CONFIRMED','由采购订单 PO202607129ZI9XW 批准下单自动生成','2026-07-11 18:07:16.906','CGRK202607120009','CGDD202607120009','SYNCED'),('cmrhtqoip0006ndbm8eccko5w','RC20260712V11MTM','cmrhtqi7c0001ndbm3sfp85sj','cmrhfbmx40003ndr9g2cfk60o',NULL,NULL,'2026-07-12 13:24:03.415',0,0.00,0.00,0.00,NULL,NULL,'PENDING',NULL,'CONFIRMED','由采购订单 PO202607124BIIG3 批准下单自动生成','2026-07-12 13:23:31.873','CGRK202607120010','CGDD202607120012','SYNCED');
/*!40000 ALTER TABLE `purchase_receipts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchaser_assignments`
--

DROP TABLE IF EXISTS `purchaser_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchaser_assignments` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remark` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchaser_assignments_userId_key` (`userId`),
  KEY `purchaser_assignments_userId_idx` (`userId`),
  CONSTRAINT `purchaser_assignments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchaser_assignments`
--

LOCK TABLES `purchaser_assignments` WRITE;
/*!40000 ALTER TABLE `purchaser_assignments` DISABLE KEYS */;
INSERT INTO `purchaser_assignments` VALUES ('cmrgns0960004ndzrecfmgw84','cmr3gzz1q0001ndfl9rlzmkuu',NULL,'ACTIVE','2026-07-11 17:48:49.866','2026-07-11 17:48:49.866'),('cmrgns6oq0009ndzr4suz5r38','cmr2xthn30012nddoaxv9bdn9',NULL,'ACTIVE','2026-07-11 17:48:58.202','2026-07-11 17:48:58.202'),('cmrgnsb30000fndzrhnbjs910','cmr2xthn20010nddonsbyj3y7',NULL,'ACTIVE','2026-07-11 17:49:03.901','2026-07-11 17:49:03.901'),('cmrgnse98000kndzrjkvb57mz','cmr2xthn40014nddomdsrpif1',NULL,'ACTIVE','2026-07-11 17:49:08.013','2026-07-11 17:49:08.013');
/*!40000 ALTER TABLE `purchaser_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchaser_material_items`
--

DROP TABLE IF EXISTS `purchaser_material_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchaser_material_items` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assignmentId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchaser_material_items_assignmentId_materialId_key` (`assignmentId`,`materialId`),
  KEY `purchaser_material_items_assignmentId_idx` (`assignmentId`),
  KEY `purchaser_material_items_materialId_idx` (`materialId`),
  CONSTRAINT `purchaser_material_items_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `purchaser_assignments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `purchaser_material_items_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchaser_material_items`
--

LOCK TABLES `purchaser_material_items` WRITE;
/*!40000 ALTER TABLE `purchaser_material_items` DISABLE KEYS */;
INSERT INTO `purchaser_material_items` VALUES ('cmrgns0960006ndzr2ad312a5','cmrgns0960004ndzrecfmgw84','cmrgmigee0004ndrvrkuo07z1','2026-07-11 17:48:49.866'),('cmrgns0960007ndzritcxjkfh','cmrgns0960004ndzrecfmgw84','cmrglqqkc0000nd6yj5i1v8tm','2026-07-11 17:48:49.866'),('cmrgns6oq000bndzrwvi1xw8a','cmrgns6oq0009ndzr4suz5r38','cmrglnnyt000nndzu9i18jjdn','2026-07-11 17:48:58.202'),('cmrgns6oq000cndzr3ctms4cg','cmrgns6oq0009ndzr4suz5r38','cmrglmhue000mndzuvxu8h3bh','2026-07-11 17:48:58.202'),('cmrgns6oq000dndzrbped2gtn','cmrgns6oq0009ndzr4suz5r38','cmrgllmt2000lndzu9dqnbvbz','2026-07-11 17:48:58.202'),('cmrgnsb30000hndzr9lvh16gd','cmrgnsb30000fndzrhnbjs910','cmrglkmgf000kndzuq19wpwm4','2026-07-11 17:49:03.901'),('cmrgnsb30000indzrctg9pofd','cmrgnsb30000fndzrhnbjs910','cmrgljo01000jndzuub93jo15','2026-07-11 17:49:03.901'),('cmrgnse98000mndzrlrgs9t8z','cmrgnse98000kndzrjkvb57mz','cmrglj5bv000indzutrm5g6sn','2026-07-11 17:49:08.013');
/*!40000 ALTER TABLE `purchaser_material_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recall_orders`
--

DROP TABLE IF EXISTS `recall_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recall_orders` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recallNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batchId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `affectedCustomers` json DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `initiatorId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approverId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approvedAt` datetime(3) DEFAULT NULL,
  `completedAt` datetime(3) DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `recall_orders_recallNo_key` (`recallNo`),
  KEY `recall_orders_batchId_idx` (`batchId`),
  KEY `recall_orders_status_idx` (`status`),
  KEY `recall_orders_initiatorId_fkey` (`initiatorId`),
  KEY `recall_orders_approverId_fkey` (`approverId`),
  CONSTRAINT `recall_orders_approverId_fkey` FOREIGN KEY (`approverId`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `recall_orders_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `batches` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `recall_orders_initiatorId_fkey` FOREIGN KEY (`initiatorId`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recall_orders`
--

LOCK TABLES `recall_orders` WRITE;
/*!40000 ALTER TABLE `recall_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `recall_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_order_items`
--

DROP TABLE IF EXISTS `sales_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_order_items` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `salesOrderId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `qty` int NOT NULL,
  `unitPrice` decimal(12,2) NOT NULL,
  `costPrice` decimal(12,2) NOT NULL DEFAULT '0.00',
  `taxRate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `lineTotal` decimal(14,2) NOT NULL DEFAULT '0.00',
  `priceListId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `batchId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `grade_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sales_order_items_salesOrderId_idx` (`salesOrderId`),
  KEY `sales_order_items_materialId_fkey` (`materialId`),
  KEY `sales_order_items_priceListId_fkey` (`priceListId`),
  KEY `sales_order_items_batchId_fkey` (`batchId`),
  KEY `sales_order_items_grade_id_idx` (`grade_id`),
  CONSTRAINT `sales_order_items_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sales_order_items_grade_id_fkey` FOREIGN KEY (`grade_id`) REFERENCES `material_grades` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sales_order_items_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `sales_order_items_priceListId_fkey` FOREIGN KEY (`priceListId`) REFERENCES `price_lists` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sales_order_items_salesOrderId_fkey` FOREIGN KEY (`salesOrderId`) REFERENCES `sales_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_order_items`
--

LOCK TABLES `sales_order_items` WRITE;
/*!40000 ALTER TABLE `sales_order_items` DISABLE KEYS */;
INSERT INTO `sales_order_items` VALUES ('cmrhumyem0003ndc7xillq7sy','cmrhumyem0001ndc7qml5z2wa','cmrgmigee0004ndrvrkuo07z1',10,4.00,3.70,0.00,40.00,NULL,NULL,NULL,'2026-07-12 13:48:37.679',NULL);
/*!40000 ALTER TABLE `sales_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_orders`
--

DROP TABLE IF EXISTS `sales_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_orders` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orderNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `addressId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `warehouseId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `salesRepId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `salesPlanId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `orderDate` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expectedDate` datetime(3) DEFAULT NULL,
  `priceType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'STANDARD',
  `approvalFlowId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `workflowInstanceId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stockLocked` tinyint(1) NOT NULL DEFAULT '0',
  `totalAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `taxAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `grandTotal` decimal(14,2) NOT NULL DEFAULT '0.00',
  `contractId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING_APPROVAL',
  `approvedById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approvedAt` datetime(3) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_orders_orderNo_key` (`orderNo`),
  KEY `sales_orders_customerId_idx` (`customerId`),
  KEY `sales_orders_status_idx` (`status`),
  KEY `sales_orders_warehouseId_fkey` (`warehouseId`),
  KEY `sales_orders_salesRepId_fkey` (`salesRepId`),
  KEY `sales_orders_approvedById_fkey` (`approvedById`),
  KEY `sales_orders_salesPlanId_fkey` (`salesPlanId`),
  KEY `sales_orders_contractId_fkey` (`contractId`),
  KEY `sales_orders_addressId_fkey` (`addressId`),
  CONSTRAINT `sales_orders_addressId_fkey` FOREIGN KEY (`addressId`) REFERENCES `addresses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sales_orders_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sales_orders_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `contracts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sales_orders_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `sales_orders_salesPlanId_fkey` FOREIGN KEY (`salesPlanId`) REFERENCES `sales_plans` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sales_orders_salesRepId_fkey` FOREIGN KEY (`salesRepId`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sales_orders_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_orders`
--

LOCK TABLES `sales_orders` WRITE;
/*!40000 ALTER TABLE `sales_orders` DISABLE KEYS */;
INSERT INTO `sales_orders` VALUES ('cmrhumyem0001ndc7qml5z2wa','SO20260712TPXBKL','cmrgm9d3g0003nd1zhhy60541','cmr98wx840000nd8qdcfp8jwr','cmrhfbmx40003ndr9g2cfk60o','cmr2xthjt000fnddogkor8u3s',NULL,'2026-07-12 00:00:00.000','2026-07-14 00:00:00.000','STANDARD',NULL,'cmrhun10v0001nd0cmm24iqxu',1,40.00,0.00,40.00,NULL,'APPROVED',NULL,'2026-07-12 13:50:34.473',NULL,'2026-07-12 13:48:37.679','2026-07-12 13:50:34.479');
/*!40000 ALTER TABLE `sales_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_plan_items`
--

DROP TABLE IF EXISTS `sales_plan_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_plan_items` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `salesPlanId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplierId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `planQty` int NOT NULL DEFAULT '0',
  `planAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `actualQty` int NOT NULL DEFAULT '0',
  `actualAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `delivery_date` datetime(3) DEFAULT NULL,
  `pushed_to_purchase` tinyint(1) NOT NULL DEFAULT '0',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `gradeId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sales_plan_items_salesPlanId_idx` (`salesPlanId`),
  KEY `sales_plan_items_customerId_fkey` (`customerId`),
  KEY `sales_plan_items_materialId_fkey` (`materialId`),
  KEY `sales_plan_items_supplierId_fkey` (`supplierId`),
  KEY `sales_plan_items_gradeId_fkey` (`gradeId`),
  CONSTRAINT `sales_plan_items_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sales_plan_items_gradeId_fkey` FOREIGN KEY (`gradeId`) REFERENCES `material_grades` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sales_plan_items_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `sales_plan_items_salesPlanId_fkey` FOREIGN KEY (`salesPlanId`) REFERENCES `sales_plans` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `sales_plan_items_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_plan_items`
--

LOCK TABLES `sales_plan_items` WRITE;
/*!40000 ALTER TABLE `sales_plan_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_plan_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_plans`
--

DROP TABLE IF EXISTS `sales_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_plans` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `planNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `planType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MONTHLY',
  `periodStart` datetime(3) NOT NULL,
  `periodEnd` datetime(3) NOT NULL,
  `salesRepId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `departmentId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `targetAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `actualAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `completionRate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `approverId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approvedAt` datetime(3) DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_plans_planNo_key` (`planNo`),
  KEY `sales_plans_salesRepId_idx` (`salesRepId`),
  KEY `sales_plans_status_idx` (`status`),
  KEY `sales_plans_periodStart_periodEnd_idx` (`periodStart`,`periodEnd`),
  KEY `sales_plans_departmentId_fkey` (`departmentId`),
  KEY `sales_plans_approverId_fkey` (`approverId`),
  CONSTRAINT `sales_plans_approverId_fkey` FOREIGN KEY (`approverId`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sales_plans_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sales_plans_salesRepId_fkey` FOREIGN KEY (`salesRepId`) REFERENCES `employees` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_plans`
--

LOCK TABLES `sales_plans` WRITE;
/*!40000 ALTER TABLE `sales_plans` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `season_configs`
--

DROP TABLE IF EXISTS `season_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `season_configs` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `coefficient` double NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `season_configs_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `season_configs`
--

LOCK TABLES `season_configs` WRITE;
/*!40000 ALTER TABLE `season_configs` DISABLE KEYS */;
INSERT INTO `season_configs` VALUES ('sc-extreme','EXTREME','极端行情',2,'货源紧缺、道路封控',1,'2026-07-08 23:08:48.353','0000-00-00 00:00:00.000'),('sc-normal','NORMAL','常规淡季',1,'平日无活动，正常需求波动',1,'2026-07-08 23:08:48.353','0000-00-00 00:00:00.000'),('sc-peak','PEAK','旺季',1.6,'节假日、中秋春节、产地减产',1,'2026-07-08 23:08:48.353','0000-00-00 00:00:00.000'),('sc-promotion','PROMOTION','促销活动',1.3,'月度促销、周末需求上涨',1,'2026-07-08 23:08:48.353','0000-00-00 00:00:00.000');
/*!40000 ALTER TABLE `season_configs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sensors`
--

DROP TABLE IF EXISTS `sensors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sensors` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sensorCode` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `warehouseId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `zoneId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `locationId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sensorType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'TEMP_HUMIDITY',
  `protocol` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MQTT',
  `deviceAddress` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tempMin` decimal(5,1) DEFAULT NULL,
  `tempMax` decimal(5,1) DEFAULT NULL,
  `humidityMin` decimal(5,1) DEFAULT NULL,
  `humidityMax` decimal(5,1) DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `lastReadingAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sensors_sensorCode_key` (`sensorCode`),
  KEY `sensors_warehouseId_idx` (`warehouseId`),
  KEY `sensors_zoneId_fkey` (`zoneId`),
  KEY `sensors_locationId_fkey` (`locationId`),
  CONSTRAINT `sensors_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `warehouse_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sensors_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sensors_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `warehouse_zones` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sensors`
--

LOCK TABLES `sensors` WRITE;
/*!40000 ALTER TABLE `sensors` DISABLE KEYS */;
/*!40000 ALTER TABLE `sensors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipping_order_items`
--

DROP TABLE IF EXISTS `shipping_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipping_order_items` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `shippingOrderId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `salesOrderItemId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orderQty` int NOT NULL,
  `actualQty` int NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shipping_order_items_shippingOrderId_salesOrderItemId_key` (`shippingOrderId`,`salesOrderItemId`),
  KEY `shipping_order_items_shippingOrderId_idx` (`shippingOrderId`),
  KEY `shipping_order_items_salesOrderItemId_fkey` (`salesOrderItemId`),
  KEY `shipping_order_items_materialId_fkey` (`materialId`),
  CONSTRAINT `shipping_order_items_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `shipping_order_items_salesOrderItemId_fkey` FOREIGN KEY (`salesOrderItemId`) REFERENCES `sales_order_items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `shipping_order_items_shippingOrderId_fkey` FOREIGN KEY (`shippingOrderId`) REFERENCES `shipping_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipping_order_items`
--

LOCK TABLES `shipping_order_items` WRITE;
/*!40000 ALTER TABLE `shipping_order_items` DISABLE KEYS */;
INSERT INTO `shipping_order_items` VALUES ('cmrhvnj610001ndhu1wp6f4wp','cmrhv3id80001ndl03yvamuke','cmrhumyem0003ndc7xillq7sy','cmrgmigee0004ndrvrkuo07z1',10,20,'2026-07-12 14:17:04.201','2026-07-12 14:17:04.201');
/*!40000 ALTER TABLE `shipping_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipping_orders`
--

DROP TABLE IF EXISTS `shipping_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipping_orders` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `shippingNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `salesOrderId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `addressId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `warehouseId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logisticsProviderId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicleId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deliveryRouteId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `carrier` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `trackingNo` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shippingDate` datetime(3) DEFAULT NULL,
  `transportCost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `stockingStatus` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `shippingStatus` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `logisticsStatus` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `origin` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `destination` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kilometers` decimal(10,2) DEFAULT NULL,
  `logisticsNotes` text COLLATE utf8mb4_unicode_ci,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `waypoints` json DEFAULT NULL,
  `isMerged` tinyint(1) NOT NULL DEFAULT '0',
  `mergedFromIds` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shipping_orders_shippingNo_key` (`shippingNo`),
  KEY `shipping_orders_salesOrderId_idx` (`salesOrderId`),
  KEY `shipping_orders_customerId_fkey` (`customerId`),
  KEY `shipping_orders_warehouseId_fkey` (`warehouseId`),
  KEY `shipping_orders_logisticsProviderId_fkey` (`logisticsProviderId`),
  KEY `shipping_orders_vehicleId_fkey` (`vehicleId`),
  KEY `shipping_orders_addressId_fkey` (`addressId`),
  CONSTRAINT `shipping_orders_addressId_fkey` FOREIGN KEY (`addressId`) REFERENCES `addresses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `shipping_orders_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `shipping_orders_logisticsProviderId_fkey` FOREIGN KEY (`logisticsProviderId`) REFERENCES `logistics_providers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `shipping_orders_salesOrderId_fkey` FOREIGN KEY (`salesOrderId`) REFERENCES `sales_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `shipping_orders_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `shipping_orders_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipping_orders`
--

LOCK TABLES `shipping_orders` WRITE;
/*!40000 ALTER TABLE `shipping_orders` DISABLE KEYS */;
INSERT INTO `shipping_orders` VALUES ('cmrhv3id80001ndl03yvamuke','SH20260712QZ4XXE','cmrhumyem0001ndc7qml5z2wa','cmrgm9d3g0003nd1zhhy60541','cmr98wx840000nd8qdcfp8jwr','cmrhfbmx40003ndr9g2cfk60o','cmr3h9xwz000ondfl8m4liha1','cmr3hb8y4000sndflmrzulkpe',NULL,NULL,NULL,'2026-07-12 14:17:04.202',0.00,'PENDING','READY','SHIPPED','ARRANGED','七河生物智慧工厂至江苏东海七河生物科技有限公司','江苏东海七河生物科技有限公司',300.10,'','审批通过自动生成（手动补建）','2026-07-12 14:01:30.045','2026-07-12 14:17:04.203',NULL,0,NULL);
/*!40000 ALTER TABLE `shipping_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `standard_costs`
--

DROP TABLE IF EXISTS `standard_costs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `standard_costs` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchaseCost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `purchaseCostSource` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transportAllocCost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `transportAllocSource` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `packagingCost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `transportCost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `totalCost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `calcDate` datetime(3) NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `standard_costs_materialId_idx` (`materialId`),
  KEY `standard_costs_calcDate_idx` (`calcDate`),
  CONSTRAINT `standard_costs_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `standard_costs`
--

LOCK TABLES `standard_costs` WRITE;
/*!40000 ALTER TABLE `standard_costs` DISABLE KEYS */;
/*!40000 ALTER TABLE `standard_costs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_alerts`
--

DROP TABLE IF EXISTS `stock_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_alerts` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `warehouseId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alertType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `level` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `currentQty` double NOT NULL,
  `thresholdQty` double NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `processedBy` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `processedAt` datetime(3) DEFAULT NULL,
  `resolution` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `alertSubType` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assignedTo` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachments` json DEFAULT NULL,
  `batchId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `closureVerifiedAt` datetime(3) DEFAULT NULL,
  `closureVerifiedBy` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deadline` datetime(3) DEFAULT NULL,
  `escalatedAt` datetime(3) DEFAULT NULL,
  `escalatedFrom` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expiryDate` datetime(3) DEFAULT NULL,
  `inTransitQty` double DEFAULT NULL,
  `lockedQty` double DEFAULT NULL,
  `purchaseOrderId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remainingDays` int DEFAULT NULL,
  `rootCause` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transferOrderId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `stock_alerts_materialId_warehouseId_idx` (`materialId`,`warehouseId`),
  KEY `stock_alerts_status_idx` (`status`),
  KEY `stock_alerts_createdAt_idx` (`createdAt`),
  KEY `stock_alerts_warehouseId_fkey` (`warehouseId`),
  KEY `stock_alerts_alertType_idx` (`alertType`),
  KEY `stock_alerts_batchId_fkey` (`batchId`),
  CONSTRAINT `stock_alerts_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `stock_alerts_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `stock_alerts_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_alerts`
--

LOCK TABLES `stock_alerts` WRITE;
/*!40000 ALTER TABLE `stock_alerts` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_alerts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_levels`
--

DROP TABLE IF EXISTS `stock_levels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_levels` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `warehouseId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `snapshotDate` datetime(3) NOT NULL,
  `currentQty` double NOT NULL,
  `safetyStock` double NOT NULL,
  `warnStock` double NOT NULL,
  `maxStock` double NOT NULL,
  `level` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `stock_levels_materialId_warehouseId_snapshotDate_idx` (`materialId`,`warehouseId`,`snapshotDate`),
  KEY `stock_levels_snapshotDate_idx` (`snapshotDate`),
  KEY `stock_levels_warehouseId_fkey` (`warehouseId`),
  CONSTRAINT `stock_levels_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `stock_levels_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_levels`
--

LOCK TABLES `stock_levels` WRITE;
/*!40000 ALTER TABLE `stock_levels` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_levels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_locks`
--

DROP TABLE IF EXISTS `stock_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_locks` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `warehouseId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `qty` int NOT NULL,
  `lockType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `refId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'LOCKED',
  `expireAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `releasedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `stock_locks_materialId_warehouseId_idx` (`materialId`,`warehouseId`),
  KEY `stock_locks_status_idx` (`status`),
  KEY `stock_locks_warehouseId_fkey` (`warehouseId`),
  CONSTRAINT `stock_locks_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `stock_locks_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_locks`
--

LOCK TABLES `stock_locks` WRITE;
/*!40000 ALTER TABLE `stock_locks` DISABLE KEYS */;
INSERT INTO `stock_locks` VALUES ('cmrhumyeu0005ndc7n469sbhf','cmrgmigee0004ndrvrkuo07z1','cmrhfbmx40003ndr9g2cfk60o',5,'SALES_ORDER','cmrhumyem0001ndc7qml5z2wa','LOCKED',NULL,'2026-07-12 13:48:37.687',NULL);
/*!40000 ALTER TABLE `stock_locks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_movements`
--

DROP TABLE IF EXISTS `stock_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_movements` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `movementNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `warehouseId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `locationId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batchId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `movementType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `direction` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `qty` decimal(12,2) NOT NULL,
  `refType` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operatorId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `movementDate` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `grade_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stock_movements_movementNo_key` (`movementNo`),
  KEY `stock_movements_materialId_warehouseId_idx` (`materialId`,`warehouseId`),
  KEY `stock_movements_movementType_idx` (`movementType`),
  KEY `stock_movements_refType_refId_idx` (`refType`,`refId`),
  KEY `stock_movements_warehouseId_fkey` (`warehouseId`),
  KEY `stock_movements_locationId_fkey` (`locationId`),
  KEY `stock_movements_batchId_fkey` (`batchId`),
  KEY `stock_movements_operatorId_fkey` (`operatorId`),
  KEY `stock_movements_grade_id_fkey` (`grade_id`),
  CONSTRAINT `stock_movements_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_grade_id_fkey` FOREIGN KEY (`grade_id`) REFERENCES `material_grades` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `warehouse_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_movements`
--

LOCK TABLES `stock_movements` WRITE;
/*!40000 ALTER TABLE `stock_movements` DISABLE KEYS */;
INSERT INTO `stock_movements` VALUES ('cmrhs8yss0005ndx5y46h6umf','SM20260712NYBVZF','cmr3gdk25000jnd8pkxg7f1er',NULL,'cmrglkmgf000kndzuq19wpwm4','cmrhs8ysk0001ndx5iqvsv4pu','PURCHASE_RECEIPT','IN',30.00,'PURCHASE_RECEIPT','cmrgofqga001jndzrip6xmuv4','cmr2xthjt000fnddogkor8u3s','采购入库 RC202607121A5574','2026-07-12 12:41:45.772','2026-07-12 12:41:45.773',NULL),('cmrhs8ytf000fndx5rzet04jy','SM20260712PVM1OG','cmr3gdk25000jnd8pkxg7f1er',NULL,'cmrglmhue000mndzuvxu8h3bh','cmrhs8yt9000bndx53puq3xdk','PURCHASE_RECEIPT','IN',50.00,'PURCHASE_RECEIPT','cmrgofqga001jndzrip6xmuv4','cmr2xthjt000fnddogkor8u3s','采购入库 RC202607121A5574','2026-07-12 12:41:45.795','2026-07-12 12:41:45.796',NULL),('cmrhtrcu6000fndbm4j7x2uwb','SM20260712UIZCWX','cmrhfbmx40003ndr9g2cfk60o',NULL,'cmrglqqkc0000nd6yj5i1v8tm','cmrhtrctz000bndbmprtv0zc0','PURCHASE_RECEIPT','IN',50.00,'PURCHASE_RECEIPT','cmrhtqoip0006ndbm8eccko5w','cmr2xthjt000fnddogkor8u3s','采购入库 RC20260712V11MTM','2026-07-12 13:24:03.389','2026-07-12 13:24:03.390',NULL),('cmrhtrcun000pndbmyjs1cg9o','SM20260712IAUHUT','cmrhfbmx40003ndr9g2cfk60o',NULL,'cmrgmigee0004ndrvrkuo07z1','cmrhtrcuj000lndbmiq7w23bj','PURCHASE_RECEIPT','IN',60.00,'PURCHASE_RECEIPT','cmrhtqoip0006ndbm8eccko5w','cmr2xthjt000fnddogkor8u3s','采购入库 RC20260712V11MTM','2026-07-12 13:24:03.407','2026-07-12 13:24:03.408',NULL);
/*!40000 ALTER TABLE `stock_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_standards`
--

DROP TABLE IF EXISTS `stock_standards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_standards` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `warehouseId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `seasonConfigId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avgDailySales` double DEFAULT NULL,
  `procurementDays` int NOT NULL DEFAULT '3',
  `maxStorageDays` int NOT NULL DEFAULT '3',
  `remoteAdjust` double DEFAULT NULL,
  `safetyStock` double DEFAULT NULL,
  `warnStock` double DEFAULT NULL,
  `maxStock` double DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `lastCalcTime` datetime(3) DEFAULT NULL,
  `createdBy` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stock_standards_materialId_warehouseId_key` (`materialId`,`warehouseId`),
  KEY `stock_standards_materialId_idx` (`materialId`),
  KEY `stock_standards_warehouseId_idx` (`warehouseId`),
  KEY `stock_standards_status_idx` (`status`),
  KEY `stock_standards_seasonConfigId_fkey` (`seasonConfigId`),
  CONSTRAINT `stock_standards_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `stock_standards_seasonConfigId_fkey` FOREIGN KEY (`seasonConfigId`) REFERENCES `season_configs` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `stock_standards_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_standards`
--

LOCK TABLES `stock_standards` WRITE;
/*!40000 ALTER TABLE `stock_standards` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_standards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_take_items`
--

DROP TABLE IF EXISTS `stock_take_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_take_items` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stockTakeId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materialId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batchId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `locationId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bookQty` int NOT NULL DEFAULT '0',
  `actualQty` int NOT NULL DEFAULT '0',
  `diffQty` int NOT NULL DEFAULT '0',
  `diffReason` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `counterId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `countedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `cost_price_calculated` tinyint(1) NOT NULL DEFAULT '0',
  `cost_price_record_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `stock_take_items_stockTakeId_idx` (`stockTakeId`),
  KEY `stock_take_items_batchId_fkey` (`batchId`),
  KEY `stock_take_items_locationId_fkey` (`locationId`),
  KEY `stock_take_items_counterId_fkey` (`counterId`),
  KEY `stock_take_items_cost_price_calculated_idx` (`cost_price_calculated`),
  KEY `stock_take_items_materialId_cost_price_calculated_idx` (`materialId`,`cost_price_calculated`),
  KEY `stock_take_items_cost_price_record_id_fkey` (`cost_price_record_id`),
  CONSTRAINT `stock_take_items_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `stock_take_items_cost_price_record_id_fkey` FOREIGN KEY (`cost_price_record_id`) REFERENCES `cost_price_records` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `stock_take_items_counterId_fkey` FOREIGN KEY (`counterId`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `stock_take_items_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `warehouse_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `stock_take_items_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `stock_take_items_stockTakeId_fkey` FOREIGN KEY (`stockTakeId`) REFERENCES `stock_takes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_take_items`
--

LOCK TABLES `stock_take_items` WRITE;
/*!40000 ALTER TABLE `stock_take_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_take_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_takes`
--

DROP TABLE IF EXISTS `stock_takes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_takes` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `takeNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `warehouseId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `zoneId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `takeType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'FULL',
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `planDate` datetime(3) DEFAULT NULL,
  `completedDate` datetime(3) DEFAULT NULL,
  `totalItems` int NOT NULL DEFAULT '0',
  `diffItems` int NOT NULL DEFAULT '0',
  `creatorId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approverId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stock_takes_takeNo_key` (`takeNo`),
  KEY `stock_takes_warehouseId_status_idx` (`warehouseId`,`status`),
  KEY `stock_takes_zoneId_fkey` (`zoneId`),
  KEY `stock_takes_creatorId_fkey` (`creatorId`),
  CONSTRAINT `stock_takes_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `stock_takes_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `stock_takes_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `warehouse_zones` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_takes`
--

LOCK TABLES `stock_takes` WRITE;
/*!40000 ALTER TABLE `stock_takes` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_takes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_evaluations`
--

DROP TABLE IF EXISTS `supplier_evaluations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_evaluations` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplierId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `evalPeriod` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deliveryOnTimeRate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `qualityPassRate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `priceCompetitiveness` decimal(5,2) NOT NULL DEFAULT '0.00',
  `serviceResponse` decimal(5,2) NOT NULL DEFAULT '0.00',
  `totalScore` decimal(5,2) NOT NULL DEFAULT '0.00',
  `deliveryDetail` json DEFAULT NULL,
  `qualityDetail` json DEFAULT NULL,
  `priceDetail` json DEFAULT NULL,
  `serviceDetail` json DEFAULT NULL,
  `evalRemark` text COLLATE utf8mb4_unicode_ci,
  `evaluatorId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplier_evaluations_supplierId_evalPeriod_key` (`supplierId`,`evalPeriod`),
  KEY `supplier_evaluations_supplierId_idx` (`supplierId`),
  KEY `supplier_evaluations_evaluatorId_fkey` (`evaluatorId`),
  CONSTRAINT `supplier_evaluations_evaluatorId_fkey` FOREIGN KEY (`evaluatorId`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `supplier_evaluations_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_evaluations`
--

LOCK TABLES `supplier_evaluations` WRITE;
/*!40000 ALTER TABLE `supplier_evaluations` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_evaluations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contactPerson` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contactPhone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bankAccount` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qualification` json DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `suppliers_code_key` (`code`),
  KEY `suppliers_name_idx` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
INSERT INTO `suppliers` VALUES ('cmrgmtu5f0000ndzrnbzsvxf2','010110415','平度市芯鑫天下农产品销售部(个体工商户)','小李','15837232343','','620000200202020',NULL,'ACTIVE','2026-07-11 17:22:15.652','2026-07-11 17:22:15.652'),('cmrgn68jt0001ndzrrja28eg2','010110089','泌阳县邵新磊食用菌种植场','小凯','15998498944','','622594895489585',NULL,'ACTIVE','2026-07-11 17:31:54.186','2026-07-11 17:36:53.501'),('cmrgnd4120002ndzr28qnvd0i','010110006','黄梁栋','小溪','145678900999','','4545454545',NULL,'ACTIVE','2026-07-11 17:37:14.919','2026-07-11 17:37:14.919');
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `temperature_alerts`
--

DROP TABLE IF EXISTS `temperature_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `temperature_alerts` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alertNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sensorId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alertType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` decimal(5,1) DEFAULT NULL,
  `threshold` decimal(5,1) DEFAULT NULL,
  `startedAt` datetime(3) NOT NULL,
  `endedAt` datetime(3) DEFAULT NULL,
  `durationMinutes` int NOT NULL DEFAULT '0',
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `handledBy` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `handleRemark` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `temperature_alerts_alertNo_key` (`alertNo`),
  KEY `temperature_alerts_sensorId_idx` (`sensorId`),
  KEY `temperature_alerts_status_idx` (`status`),
  KEY `temperature_alerts_handledBy_fkey` (`handledBy`),
  CONSTRAINT `temperature_alerts_handledBy_fkey` FOREIGN KEY (`handledBy`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `temperature_alerts_sensorId_fkey` FOREIGN KEY (`sensorId`) REFERENCES `sensors` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `temperature_alerts`
--

LOCK TABLES `temperature_alerts` WRITE;
/*!40000 ALTER TABLE `temperature_alerts` DISABLE KEYS */;
/*!40000 ALTER TABLE `temperature_alerts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `temperature_records`
--

DROP TABLE IF EXISTS `temperature_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `temperature_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `sensorId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `temperature` decimal(5,1) DEFAULT NULL,
  `humidity` decimal(5,1) DEFAULT NULL,
  `isNormal` tinyint(1) NOT NULL DEFAULT '1',
  `recordedAt` datetime(3) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `temperature_records_sensorId_recordedAt_idx` (`sensorId`,`recordedAt`),
  KEY `temperature_records_isNormal_recordedAt_idx` (`isNormal`,`recordedAt`),
  CONSTRAINT `temperature_records_sensorId_fkey` FOREIGN KEY (`sensorId`) REFERENCES `sensors` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `temperature_records`
--

LOCK TABLES `temperature_records` WRITE;
/*!40000 ALTER TABLE `temperature_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `temperature_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `passwordHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employeeId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'EMPLOYEE',
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `lastLogin` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_key` (`username`),
  UNIQUE KEY `users_employeeId_key` (`employeeId`),
  KEY `users_role_idx` (`role`),
  CONSTRAINT `users_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('cmr2xthn1000ynddo30j8rp1j','admin','$2a$10$fTXwhBn1hR9wbQRjn0GPoe2dQ7V0OepNl4gz09z85cyevzCFNrzdW','cmr2xthjt000fnddogkor8u3s','SUPER_ADMIN','ACTIVE','2026-07-13 11:58:08.950','2026-07-02 03:21:08.749','2026-07-13 11:58:08.951'),('cmr2xthn20010nddonsbyj3y7','sales','$2a$10$zhiAhUv1TEWWge9jtkEbIOSZfFEqFmPryOFeFoL4ZtIY8mUuD/6ZK','cmr2xthjv000jnddonu24ysj6','SALES_MANAGER','ACTIVE','2026-07-11 18:03:48.771','2026-07-02 03:21:08.751','2026-07-11 18:03:48.771'),('cmr2xthn30012nddoaxv9bdn9','purchase','$2a$10$zhiAhUv1TEWWge9jtkEbIOSZfFEqFmPryOFeFoL4ZtIY8mUuD/6ZK','cmr2xthjw000nnddoa651alvh','PURCHASE_MANAGER','ACTIVE','2026-07-11 18:04:25.547','2026-07-02 03:21:08.751','2026-07-11 18:04:25.548'),('cmr2xthn40014nddomdsrpif1','warehouse','$2a$10$zhiAhUv1TEWWge9jtkEbIOSZfFEqFmPryOFeFoL4ZtIY8mUuD/6ZK','cmr2xthjx000rnddozqsby7nq','FINANCE_MANAGER','ACTIVE','2026-07-05 13:37:02.625','2026-07-02 03:21:08.752','2026-07-05 13:37:02.625'),('cmr2xthn40016nddo8vpdubg2','finance','$2a$10$zhiAhUv1TEWWge9jtkEbIOSZfFEqFmPryOFeFoL4ZtIY8mUuD/6ZK','cmr2xthjx000vnddoo256ase1','FINANCE_STAFF','ACTIVE',NULL,'2026-07-02 03:21:08.753','2026-07-02 03:21:08.753'),('cmr3gd40t000hnd8polpb5rfg','EMP013','portal-sso-auto-created','cmr34c7rd0012ndimkxyexxel','WAREHOUSE_STAFF','ACTIVE',NULL,'2026-07-02 12:00:17.309','2026-07-02 12:00:17.309'),('cmr3gzz1q0001ndfl9rlzmkuu','emp009','$2a$10$6uhl.c0qZPcqSRYkXtQ.4./fEC8gPar6InNKAkq1n3fBY2Fg55d.6','cmr34c7ra000mndimuel8s3dv','PURCHASE_MANAGER','ACTIVE','2026-07-11 18:05:14.157','2026-07-02 12:18:03.950','2026-07-11 18:05:14.157'),('cmr55bmsp0014ndt9rf474i11','emp008','$2a$10$OnMhvIYJ8Ws7phs.QtDsoOiURZD3oKM8j75AfBJAEshOkjM8IS8uS','cmr34c7r8000indimzljp871z','WAREHOUSE_STAFF','ACTIVE','2026-07-04 08:54:21.179','2026-07-03 16:26:44.905','2026-07-04 08:54:21.180'),('cmr6j8m3b0005ndanddqq08gk','EMP010','$2a$10$GIstzGq8MB1Gu.7Yg7lKEeK6blaa4HEcCoAsDXUD.dQklzhzYjTUi','cmr34c7rb000qndimz6by5qfz','FINANCE_MANAGER','ACTIVE','2026-07-04 15:44:04.826','2026-07-04 15:44:04.823','2026-07-04 15:44:04.826');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicle_types`
--

DROP TABLE IF EXISTS `vehicle_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_types` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NORMAL',
  `boxLength` decimal(5,2) NOT NULL,
  `boxWidth` decimal(5,2) NOT NULL,
  `boxHeight` decimal(5,2) NOT NULL,
  `loadVolume` decimal(8,2) NOT NULL,
  `loadWeight` decimal(8,2) NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vehicle_types_code_key` (`code`),
  KEY `vehicle_types_category_idx` (`category`),
  KEY `vehicle_types_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicle_types`
--

LOCK TABLES `vehicle_types` WRITE;
/*!40000 ALTER TABLE `vehicle_types` DISABLE KEYS */;
INSERT INTO `vehicle_types` VALUES ('cmr9cqrrc0000nd7iisutor2i','VAN_MICRO','微面','NORMAL',1.40,1.40,1.00,1.70,0.30,'ACTIVE','2026-07-06 15:05:33.193','2026-07-06 15:34:01.031'),('cmr9cqrrf0001nd7ig55kuv3j','VAN_SMALL','小面','NORMAL',2.00,1.40,1.00,2.50,0.50,'ACTIVE','2026-07-06 15:05:33.196','2026-07-06 15:34:01.908'),('cmr9cqrrh0002nd7ikrmszyu9','VAN_MEDIUM','中面','NORMAL',2.40,1.30,1.20,3.50,0.80,'ACTIVE','2026-07-06 15:05:33.198','2026-07-06 15:34:03.754'),('cmr9cqrri0003nd7i07490b8u','VAN_LARGE','大面','NORMAL',3.10,1.50,1.50,6.20,1.00,'ACTIVE','2026-07-06 15:05:33.199','2026-07-06 15:34:03.000'),('cmr9cqrrk0004nd7ibbe5ivr8','TRUCK_MICRO','微货','NORMAL',1.80,1.40,1.00,3.80,0.50,'ACTIVE','2026-07-06 15:05:33.201','2026-07-06 15:34:02.457'),('cmr9cqrrm0005nd7ipb2mb2ad','TRUCK_SMALL','小货','NORMAL',2.50,1.60,1.80,7.20,1.00,'ACTIVE','2026-07-06 15:05:33.202','2026-07-06 15:34:04.395'),('cmr9cqrrn0006nd7ienrwf9gy','TRUCK_MEDIUM','中货','NORMAL',3.80,1.80,1.80,12.50,1.50,'ACTIVE','2026-07-06 15:05:33.204','2026-07-06 15:34:04.849'),('cmr9cqrrp0007nd7ioyhtla9w','TRUCK_3M8','3.8米车','NORMAL',3.80,1.80,1.80,12.50,2.50,'ACTIVE','2026-07-06 15:05:33.205','2026-07-06 15:34:05.280'),('cmr9cqrrq0008nd7iu97pen9a','TRUCK_4M2','4.2米车','NORMAL',4.20,1.80,1.80,14.00,3.50,'ACTIVE','2026-07-06 15:05:33.207','2026-07-06 15:34:05.689'),('cmr9cqrrs0009nd7iw3wpkh2e','TRUCK_5M','5米车','NORMAL',5.00,1.80,2.00,17.00,5.00,'ACTIVE','2026-07-06 15:05:33.208','2026-07-06 15:34:06.134'),('cmr9cqrru000and7iyysh5yer','TRUCK_6M','6米车','NORMAL',5.80,1.80,2.00,20.00,6.00,'ACTIVE','2026-07-06 15:05:33.210','2026-07-06 15:34:06.604'),('cmr9cqrrw000bnd7idg2ci18f','TRUCK_6M8','6.8米车','NORMAL',6.80,2.20,2.60,25.50,6.00,'ACTIVE','2026-07-06 15:05:33.213','2026-07-06 15:34:07.558'),('cmr9cqrry000cnd7ilosx0qnh','TRUCK_7M','7米车','NORMAL',7.00,2.20,2.60,30.00,6.00,'ACTIVE','2026-07-06 15:05:33.215','2026-07-06 15:34:07.968'),('cmr9cqrs0000dnd7ihn0c53xi','TRUCK_7M6','7.6米车','NORMAL',7.60,2.20,2.50,35.00,6.00,'ACTIVE','2026-07-06 15:05:33.217','2026-07-06 15:34:08.534'),('cmr9cqrs2000end7i3pij2t4e','TRUCK_8M','8米车','NORMAL',8.00,2.20,2.50,40.00,6.00,'ACTIVE','2026-07-06 15:05:33.219','2026-07-06 15:34:08.959'),('cmr9cqrs4000fnd7ioi339e24','TRUCK_8M6','8.6米车','NORMAL',8.60,2.20,2.50,45.00,6.00,'ACTIVE','2026-07-06 15:05:33.221','2026-07-06 15:34:10.512'),('cmr9cqrs5000gnd7i8g0ajdpk','TRUCK_9M','9米车','NORMAL',9.00,2.20,2.60,48.00,8.00,'ACTIVE','2026-07-06 15:05:33.222','2026-07-06 15:34:09.881'),('cmr9cqrs6000hnd7ia9o4nhkx','TRUCK_9M6','9.6米车','NORMAL',9.60,2.20,2.60,55.00,10.00,'ACTIVE','2026-07-06 15:05:33.223','2026-07-06 15:34:12.054'),('cmr9cqrs8000ind7i1y1j55o3','TRUCK_11M','11米车','NORMAL',11.00,2.20,2.50,57.00,10.00,'ACTIVE','2026-07-06 15:05:33.224','2026-07-06 15:34:12.453'),('cmr9cqrsa000jnd7ih24wjpbs','TRUCK_12M','12米车','NORMAL',12.00,2.20,2.50,63.00,10.00,'ACTIVE','2026-07-06 15:05:33.227','2026-07-06 15:34:12.896'),('cmr9cqrsb000knd7imag6vtau','TRUCK_13M','13米车','NORMAL',13.00,2.20,2.50,70.00,18.00,'ACTIVE','2026-07-06 15:05:33.228','2026-07-06 15:34:13.435'),('cmr9cqrsd000lnd7icdtqtjyi','TRUCK_13M7','13.7米车','NORMAL',13.70,2.20,2.50,75.00,20.00,'ACTIVE','2026-07-06 15:05:33.229','2026-07-06 15:34:13.886'),('cmr9cqrsf000mnd7iegq9as9z','TRUCK_15M','15米车','NORMAL',15.00,2.20,2.50,80.00,20.00,'ACTIVE','2026-07-06 15:05:33.231','2026-07-06 15:34:14.308'),('cmr9cqrsh000nnd7ioghidb7j','TRUCK_16M','16米车','NORMAL',16.00,2.20,2.50,85.00,25.00,'ACTIVE','2026-07-06 15:05:33.234','2026-07-06 15:34:14.784'),('cmr9cqrsj000ond7ix2jzb07r','TRUCK_17M5','17.5米车','NORMAL',17.50,2.20,2.50,90.00,25.00,'ACTIVE','2026-07-06 15:05:33.236','2026-07-06 15:34:15.231'),('cmr9cqrsm000pnd7iyvfljao1','REF_4M2','冷藏车4米2','REFRIGERATED',3.80,1.80,1.80,12.30,1.50,'ACTIVE','2026-07-06 15:05:33.238','2026-07-06 15:34:16.746'),('cmr9cqrso000qnd7ic20ia4sw','REF_5M2','冷藏车5米2','REFRIGERATED',5.00,1.80,2.00,18.00,2.00,'ACTIVE','2026-07-06 15:05:33.241','2026-07-06 15:34:17.165'),('cmr9cqrsq000rnd7i8c6rverf','REF_6M8','冷藏车6米8','REFRIGERATED',6.40,2.20,2.50,35.20,6.00,'ACTIVE','2026-07-06 15:05:33.243','2026-07-06 15:34:17.595'),('cmr9cqrss000snd7i7x5zta0r','REF_7M6','冷藏车7米6','REFRIGERATED',7.40,2.20,2.50,40.70,8.00,'ACTIVE','2026-07-06 15:05:33.245','2026-07-06 15:34:18.025'),('cmr9cqrsv000tnd7i59c8f167','REF_9M6','冷藏车9米6','REFRIGERATED',9.00,2.20,2.50,49.50,10.00,'ACTIVE','2026-07-06 15:05:33.247','2026-07-06 15:34:18.486'),('cmr9cqrsx000und7ih99nyy9i','REF_13M','冷藏车13米','REFRIGERATED',12.50,2.30,2.50,71.90,18.00,'ACTIVE','2026-07-06 15:05:33.249','2026-07-06 15:34:18.981'),('cmr9cqrsz000vnd7ijht65mah','REF_17M5','冷藏车17米5','REFRIGERATED',16.00,2.30,2.50,92.00,25.00,'ACTIVE','2026-07-06 15:05:33.251','2026-07-06 15:34:19.406');
/*!40000 ALTER TABLE `vehicle_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicles`
--

DROP TABLE IF EXISTS `vehicles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicles` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logisticsProviderId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `driverName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `driverPhone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plateNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vehicleType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '厢式货车',
  `specifications` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `maxLoadVolume` decimal(8,2) DEFAULT NULL,
  `maxLoadWeight` decimal(8,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `vehicles_logisticsProviderId_idx` (`logisticsProviderId`),
  CONSTRAINT `vehicles_logisticsProviderId_fkey` FOREIGN KEY (`logisticsProviderId`) REFERENCES `logistics_providers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicles`
--

LOCK TABLES `vehicles` WRITE;
/*!40000 ALTER TABLE `vehicles` DISABLE KEYS */;
INSERT INTO `vehicles` VALUES ('cmr3h8xjp000lndflyvweu7oc','cmr3h2o15000jndfl7qgszpnb','司机A','13578784779','鲁C12345','4M',NULL,'ACTIVE','2026-07-02 12:25:01.909','2026-07-02 12:25:01.909',NULL,NULL),('cmr3h9g0j000nndflyqgt8olj','cmr3h2o15000jndfl7qgszpnb','司机B','13567894949','鲁C56789','7m',NULL,'ACTIVE','2026-07-02 12:25:25.843','2026-07-02 12:25:25.843',NULL,NULL),('cmr3harth000qndfljnauwtvt','cmr3h9xwz000ondfl8m4liha1','司机C','15898983633','鲁A11111','4米',NULL,'ACTIVE','2026-07-02 12:26:27.797','2026-07-02 12:26:27.797',NULL,NULL),('cmr3hb8y4000sndflmrzulkpe','cmr3h9xwz000ondfl8m4liha1','司机D','13567327633','鲁A22222','7米',NULL,'ACTIVE','2026-07-02 12:26:49.996','2026-07-02 12:26:49.996',NULL,NULL);
/*!40000 ALTER TABLE `vehicles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `warehouse_locations`
--

DROP TABLE IF EXISTS `warehouse_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `warehouse_locations` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `zoneId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `warehouseId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `barcode` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `locationType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'STANDARD',
  `capacity` int NOT NULL DEFAULT '0',
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `warehouse_locations_warehouseId_code_key` (`warehouseId`,`code`),
  UNIQUE KEY `warehouse_locations_barcode_key` (`barcode`),
  KEY `warehouse_locations_zoneId_fkey` (`zoneId`),
  CONSTRAINT `warehouse_locations_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `warehouse_locations_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `warehouse_zones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `warehouse_locations`
--

LOCK TABLES `warehouse_locations` WRITE;
/*!40000 ALTER TABLE `warehouse_locations` DISABLE KEYS */;
/*!40000 ALTER TABLE `warehouse_locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `warehouse_zones`
--

DROP TABLE IF EXISTS `warehouse_zones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `warehouse_zones` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `warehouseId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `zoneType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'STORAGE',
  `sortOrder` int NOT NULL DEFAULT '0',
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `warehouse_zones_warehouseId_code_key` (`warehouseId`,`code`),
  CONSTRAINT `warehouse_zones_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `warehouse_zones`
--

LOCK TABLES `warehouse_zones` WRITE;
/*!40000 ALTER TABLE `warehouse_zones` DISABLE KEYS */;
/*!40000 ALTER TABLE `warehouse_zones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `warehouses`
--

DROP TABLE IF EXISTS `warehouses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `warehouses` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `managerId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `warehouseManagerId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isColdStorage` tinyint(1) NOT NULL DEFAULT '0',
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `isRemote` tinyint(1) NOT NULL DEFAULT '0',
  `transferLeadDays` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `warehouses_code_key` (`code`),
  KEY `warehouses_managerId_fkey` (`managerId`),
  KEY `warehouses_warehouseManagerId_fkey` (`warehouseManagerId`),
  CONSTRAINT `warehouses_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `warehouses_warehouseManagerId_fkey` FOREIGN KEY (`warehouseManagerId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `warehouses`
--

LOCK TABLES `warehouses` WRITE;
/*!40000 ALTER TABLE `warehouses` DISABLE KEYS */;
INSERT INTO `warehouses` VALUES ('cmr3gdk25000jnd8pkxg7f1er','东海外购鲜品库','100022312',' ',NULL,'cmr2xthn40014nddomdsrpif1',1,'ACTIVE','2026-07-02 12:00:38.093','2026-07-12 06:44:14.372',0,NULL),('cmrheioch0001ndr93zpl6z5g','源河原料库','100030101',' ',NULL,'cmr3gd40t000hnd8polpb5rfg',0,'ACTIVE','2026-07-12 06:17:24.161','2026-07-12 06:17:24.161',0,NULL),('cmrhfbmx40003ndr9g2cfk60o','西楼周转材料库','100010403',' 淄川西楼工厂',NULL,'cmr2xthn40014nddomdsrpif1',0,'ACTIVE','2026-07-12 06:39:55.336','2026-07-12 06:39:55.336',0,NULL);
/*!40000 ALTER TABLE `warehouses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `waybills`
--

DROP TABLE IF EXISTS `waybills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `waybills` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `waybillNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `shippingOrderId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logisticsProviderId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `senderAddress` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receiverName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receiverPhone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receiverAddress` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `weight` decimal(10,2) NOT NULL DEFAULT '0.00',
  `volume` decimal(10,2) NOT NULL DEFAULT '0.00',
  `freightCost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `deliveryRouteId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CREATED',
  `trackingInfo` json DEFAULT NULL,
  `shippedAt` datetime(3) DEFAULT NULL,
  `deliveredAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `waybills_waybillNo_key` (`waybillNo`),
  UNIQUE KEY `waybills_shippingOrderId_key` (`shippingOrderId`),
  KEY `waybills_waybillNo_idx` (`waybillNo`),
  KEY `waybills_logisticsProviderId_idx` (`logisticsProviderId`),
  KEY `waybills_status_idx` (`status`),
  KEY `waybills_customerId_fkey` (`customerId`),
  KEY `waybills_deliveryRouteId_fkey` (`deliveryRouteId`),
  CONSTRAINT `waybills_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `waybills_deliveryRouteId_fkey` FOREIGN KEY (`deliveryRouteId`) REFERENCES `delivery_routes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `waybills_logisticsProviderId_fkey` FOREIGN KEY (`logisticsProviderId`) REFERENCES `logistics_providers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `waybills_shippingOrderId_fkey` FOREIGN KEY (`shippingOrderId`) REFERENCES `shipping_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `waybills`
--

LOCK TABLES `waybills` WRITE;
/*!40000 ALTER TABLE `waybills` DISABLE KEYS */;
/*!40000 ALTER TABLE `waybills` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-13 20:00:29
