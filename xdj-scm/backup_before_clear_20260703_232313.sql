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

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '67bba922-5a4b-11f1-a5a7-bf2478eb333d:1-7795';

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
INSERT INTO `accounts_payable` VALUES ('cmr3kaqb2000jnd6omstd7pqb','AP20260702Z5J980','cmr3gbk5o000cnd8p58qm36zh','PURCHASE_RECEIPT','cmr3k9sci0006nd6o45z3q34q',400.20,0.00,400.20,NULL,'2026-08-01 13:50:24.685','PENDING','2026-07-02 13:50:24.686','2026-07-02 13:50:24.686'),('cmr3kaqbn000tnd6ollwyynbg','AP20260702SSZN73','cmr3gbk5o000cnd8p58qm36zh','PURCHASE_RECEIPT','cmr3k9sci0006nd6o45z3q34q',299.00,0.00,299.00,NULL,'2026-08-01 13:50:24.706','PENDING','2026-07-02 13:50:24.707','2026-07-02 13:50:24.707'),('cmr527b6v0009ndgxm5mufocb','AP2026070366ADHT','cmr3gcakq000dnd8p0ubha0s4','PURCHASE_RECEIPT','cmr4a7ybq000bndwprnaqwkue',330.00,0.00,330.00,NULL,'2026-08-02 14:59:24.390','PENDING','2026-07-03 14:59:24.391','2026-07-03 14:59:24.391'),('cmr527b79000jndgxvlq46anr','AP20260703I9F70E','cmr3gcakq000dnd8p0ubha0s4','PURCHASE_RECEIPT','cmr4a7ybq000bndwprnaqwkue',420.00,0.00,420.00,NULL,'2026-08-02 14:59:24.405','PENDING','2026-07-03 14:59:24.406','2026-07-03 14:59:24.406');
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
INSERT INTO `batch_tracking` VALUES ('cmr3kaqan000hnd6o3mz2mblx','cmr3kaqa9000bnd6ohrpqrkjy','PURCHASE_RECEIPT','PURCHASE_RECEIPT','cmr3k9sci0006nd6o45z3q34q',NULL,NULL,138,'cmr2xthjt000fnddogkor8u3s',NULL,'采购入库 批次B20260702UTAO5I','2026-07-02 13:50:24.671'),('cmr3kaqbg000rnd6obch1xaqh','cmr3kaqb5000lnd6oj9gt856e','PURCHASE_RECEIPT','PURCHASE_RECEIPT','cmr3k9sci0006nd6o45z3q34q',NULL,NULL,115,'cmr2xthjt000fnddogkor8u3s',NULL,'采购入库 批次B202607026BIA6Z','2026-07-02 13:50:24.701'),('cmr527b6n0007ndgx6lqbocn7','cmr527b6c0001ndgx5yl0zkzb','PURCHASE_RECEIPT','PURCHASE_RECEIPT','cmr4a7ybq000bndwprnaqwkue',NULL,NULL,110,'cmr2xthjt000fnddogkor8u3s',NULL,'采购入库 批次B202607037RQ4IZ','2026-07-03 14:59:24.383'),('cmr527b75000hndgxgg0od459','cmr527b6x000bndgxkbkhcmqo','PURCHASE_RECEIPT','PURCHASE_RECEIPT','cmr4a7ybq000bndwprnaqwkue',NULL,NULL,105,'cmr2xthjt000fnddogkor8u3s',NULL,'采购入库 批次B20260703I4C20T','2026-07-03 14:59:24.401');
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
INSERT INTO `batches` VALUES ('cmr3kaqa9000bnd6ohrpqrkjy','B20260702UTAO5I','cmr2xthna001hnddoq2ir1lmi','cmr3gbk5o000cnd8p58qm36zh',NULL,NULL,138,138,'ACTIVE','2026-07-02 13:50:24.658','2026-07-02 13:50:24.658'),('cmr3kaqb5000lnd6oj9gt856e','B202607026BIA6Z','cmr2xthnd001lnddo195l3his','cmr3gbk5o000cnd8p58qm36zh',NULL,NULL,115,115,'ACTIVE','2026-07-02 13:50:24.689','2026-07-02 13:50:24.689'),('cmr527b6c0001ndgx5yl0zkzb','B202607037RQ4IZ','cmr2xthnd001knddoknxi4yza','cmr3gcakq000dnd8p0ubha0s4',NULL,NULL,110,110,'ACTIVE','2026-07-03 14:59:24.372','2026-07-03 14:59:24.372'),('cmr527b6x000bndgxkbkhcmqo','B20260703I4C20T','cmr2xthnd001knddoknxi4yza','cmr3gcakq000dnd8p0ubha0s4',NULL,NULL,105,105,'ACTIVE','2026-07-03 14:59:24.393','2026-07-03 14:59:24.393');
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
  KEY `cost_price_records_materialId_calculatedAt_idx` (`materialId`,`calculatedAt`),
  KEY `cost_price_records_calculatedAt_idx` (`calculatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cost_price_records`
--

LOCK TABLES `cost_price_records` WRITE;
/*!40000 ALTER TABLE `cost_price_records` DISABLE KEYS */;
INSERT INTO `cost_price_records` VALUES ('cmr2z7ghm0000ndtcq1pubpg6','cmr2xthna001hnddoq2ir1lmi','香菇鲜品',0.00,0.0000,0.00,0.00,0.00,0.0000,0.00,0.00,0.00,0.00,0.00,0.0000,0.0000,0.00,'[]','2026-07-02 04:00:00.000','2026-07-02 04:00:00.048','2026-07-02 04:00:00.048'),('cmr2z7ghs0001ndtcm0uirsf2','cmr2xthnb001inddo1pkoxafx','金针菇鲜品',0.00,0.0000,0.00,0.00,0.00,0.0000,0.00,0.00,0.00,0.00,0.00,0.0000,0.0000,0.00,'[]','2026-07-02 04:00:00.000','2026-07-02 04:00:00.048','2026-07-02 04:00:00.048'),('cmr2z7ghy0002ndtcnimdkfb4','cmr2xthnc001jnddoukeowtrs','杏鲍菇鲜品',0.00,0.0000,0.00,0.00,0.00,0.0000,0.00,0.00,0.00,0.00,0.00,0.0000,0.0000,0.00,'[]','2026-07-02 04:00:00.000','2026-07-02 04:00:00.048','2026-07-02 04:00:00.048'),('cmr2z7gi30003ndtcghac3o7n','cmr2xthnd001knddoknxi4yza','干香菇',0.00,0.0000,0.00,0.00,0.00,0.0000,0.00,0.00,0.00,0.00,0.00,0.0000,0.0000,0.00,'[]','2026-07-02 04:00:00.000','2026-07-02 04:00:00.048','2026-07-02 04:00:00.048'),('cmr2z7gi80004ndtcxleuqoue','cmr2xthnd001lnddo195l3his','木耳干品',0.00,0.0000,0.00,0.00,0.00,0.0000,0.00,0.00,0.00,0.00,0.00,0.0000,0.0000,0.00,'[]','2026-07-02 04:00:00.000','2026-07-02 04:00:00.048','2026-07-02 04:00:00.048'),('cmr3ng9xx0002ndwtuu5jvjz0','cmr2xthna001hnddoq2ir1lmi','香菇鲜品',0.00,4.5000,0.00,138.00,400.20,2.9000,0.00,0.00,0.00,138.00,400.20,2.9000,2.9000,0.00,'[]','2026-07-02 04:00:00.048','2026-07-02 15:18:42.249','2026-07-02 15:18:42.249'),('cmr3ng9y30003ndwt47zlce25','cmr2xthnb001inddo1pkoxafx','金针菇鲜品',0.00,1.8000,0.00,0.00,0.00,1.8000,0.00,0.00,0.00,0.00,0.00,1.8000,1.8000,0.00,'[]','2026-07-02 04:00:00.048','2026-07-02 15:18:42.249','2026-07-02 15:18:42.249'),('cmr3ng9y70004ndwtm02u3o6z','cmr2xthnc001jnddoukeowtrs','杏鲍菇鲜品',0.00,4.6000,0.00,0.00,0.00,4.6000,0.00,0.00,0.00,0.00,0.00,4.6000,4.6000,0.00,'[]','2026-07-02 04:00:00.048','2026-07-02 15:18:42.249','2026-07-02 15:18:42.249'),('cmr3ng9yb0005ndwtvdici5a4','cmr2xthnd001knddoknxi4yza','干香菇',0.00,2.6000,0.00,0.00,0.00,2.6000,0.00,0.00,0.00,0.00,0.00,2.6000,2.6000,0.00,'[]','2026-07-02 04:00:00.048','2026-07-02 15:18:42.249','2026-07-02 15:18:42.249'),('cmr3ng9yh0006ndwth56zte5t','cmr2xthnd001lnddo195l3his','木耳干品',0.00,2.5000,0.00,115.00,299.00,2.6000,0.00,0.00,0.00,115.00,299.00,2.6000,2.6000,0.00,'[]','2026-07-02 04:00:00.048','2026-07-02 15:18:42.249','2026-07-02 15:18:42.249'),('cmr3ng9yk0007ndwt6t0kvs25','cmr3kfsrx000vnd6o1umreto3','本来菇事金针菇',0.00,5.4000,0.00,0.00,0.00,5.4000,0.00,0.00,0.00,0.00,0.00,5.4000,5.4000,0.00,'[]','2026-07-02 04:00:00.000','2026-07-02 15:18:42.249','2026-07-02 15:18:42.249'),('cmr3nj3kq000hndwtdezapkou','cmr2xthna001hnddoq2ir1lmi','香菇鲜品',138.00,2.9000,400.20,0.00,0.00,2.9000,0.00,0.00,8.00,130.00,400.20,3.0785,3.0785,0.00,'[]','2026-07-02 15:18:42.249','2026-07-02 15:20:53.971','2026-07-02 15:20:53.971'),('cmr3nj3ky000indwtefprz2uf','cmr2xthnb001inddo1pkoxafx','金针菇鲜品',0.00,1.8000,0.00,0.00,0.00,1.8000,0.00,0.00,0.00,0.00,0.00,1.8000,1.8000,0.00,'[]','2026-07-02 15:18:42.249','2026-07-02 15:20:53.971','2026-07-02 15:20:53.971'),('cmr3nj3l4000jndwtgav8wqrt','cmr2xthnc001jnddoukeowtrs','杏鲍菇鲜品',0.00,4.6000,0.00,0.00,0.00,4.6000,0.00,0.00,0.00,0.00,0.00,4.6000,4.6000,0.00,'[]','2026-07-02 15:18:42.249','2026-07-02 15:20:53.971','2026-07-02 15:20:53.971'),('cmr3nj3lb000kndwtkgo1ry3j','cmr2xthnd001knddoknxi4yza','干香菇',0.00,2.6000,0.00,0.00,0.00,2.6000,0.00,0.00,0.00,0.00,0.00,2.6000,2.6000,0.00,'[]','2026-07-02 15:18:42.249','2026-07-02 15:20:53.971','2026-07-02 15:20:53.971'),('cmr3nj3lh000lndwtwevl0wsi','cmr2xthnd001lnddo195l3his','木耳干品',115.00,2.6000,299.00,0.00,0.00,2.6000,0.00,0.00,5.00,110.00,299.00,2.7182,2.7182,0.00,'[]','2026-07-02 15:18:42.249','2026-07-02 15:20:53.971','2026-07-02 15:20:53.971'),('cmr3nj3lo000mndwtgn5230iv','cmr3kfsrx000vnd6o1umreto3','本来菇事金针菇',0.00,5.4000,0.00,0.00,0.00,5.4000,0.00,0.00,0.00,0.00,0.00,5.4000,5.4000,0.00,'[]','2026-07-02 15:18:42.249','2026-07-02 15:20:53.971','2026-07-02 15:20:53.971'),('cmr3ote8z000andhpe3j4nbu1','cmr2xthna001hnddoq2ir1lmi','香菇鲜品',130.00,3.0785,400.21,0.00,0.00,3.0785,100.00,307.85,0.00,30.00,92.35,3.0785,3.0785,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:20:53.971','2026-07-02 15:56:53.976','2026-07-02 15:56:53.976'),('cmr3ote96000bndhpyqe8yqt3','cmr2xthnb001inddo1pkoxafx','金针菇鲜品',0.00,1.8000,0.00,0.00,0.00,1.8000,0.00,0.00,0.00,0.00,0.00,1.8000,1.8000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:20:53.971','2026-07-02 15:56:53.976','2026-07-02 15:56:53.976'),('cmr3ote9b000cndhpdhugs97s','cmr2xthnc001jnddoukeowtrs','杏鲍菇鲜品',0.00,4.6000,0.00,0.00,0.00,4.6000,0.00,0.00,0.00,0.00,0.00,4.6000,4.6000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:20:53.971','2026-07-02 15:56:53.976','2026-07-02 15:56:53.976'),('cmr3ote9g000dndhp3opoyawp','cmr2xthnd001knddoknxi4yza','干香菇',0.00,2.6000,0.00,0.00,0.00,2.6000,0.00,0.00,0.00,0.00,0.00,2.6000,2.6000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:20:53.971','2026-07-02 15:56:53.976','2026-07-02 15:56:53.976'),('cmr3ote9s000endhpetsncaoq','cmr2xthnd001lnddo195l3his','木耳干品',110.00,2.7182,299.00,0.00,0.00,2.7182,90.00,244.64,0.00,20.00,54.36,2.7182,2.7182,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:20:53.971','2026-07-02 15:56:53.976','2026-07-02 15:56:53.976'),('cmr3ote9z000fndhp2r8eyy65','cmr3kfsrx000vnd6o1umreto3','本来菇事金针菇',0.00,5.4000,0.00,0.00,0.00,5.4000,0.00,0.00,0.00,0.00,0.00,5.4000,5.4000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:20:53.971','2026-07-02 15:56:53.976','2026-07-02 15:56:53.976'),('cmr3ovfad000lndhpwm1u3ode','cmr2xthna001hnddoq2ir1lmi','香菇鲜品',30.00,3.0785,92.36,0.00,0.00,3.0785,0.00,0.00,0.00,30.00,92.36,3.0785,3.0785,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:56:53.976','2026-07-02 15:58:28.634','2026-07-02 15:58:28.634'),('cmr3ovfan000mndhpq3c211h1','cmr2xthnb001inddo1pkoxafx','金针菇鲜品',0.00,1.8000,0.00,0.00,0.00,1.8000,0.00,0.00,0.00,0.00,0.00,1.8000,1.8000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:56:53.976','2026-07-02 15:58:28.634','2026-07-02 15:58:28.634'),('cmr3ovfaw000nndhpcfu1w0l1','cmr2xthnc001jnddoukeowtrs','杏鲍菇鲜品',0.00,4.6000,0.00,0.00,0.00,4.6000,0.00,0.00,0.00,0.00,0.00,4.6000,4.6000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:56:53.976','2026-07-02 15:58:28.634','2026-07-02 15:58:28.634'),('cmr3ovfb6000ondhpbellj844','cmr2xthnd001knddoknxi4yza','干香菇',0.00,2.6000,0.00,0.00,0.00,2.6000,0.00,0.00,0.00,0.00,0.00,2.6000,2.6000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:56:53.976','2026-07-02 15:58:28.634','2026-07-02 15:58:28.634'),('cmr3ovfbg000pndhpyzig6aqs','cmr2xthnd001lnddo195l3his','木耳干品',20.00,2.7182,54.36,0.00,0.00,2.7182,0.00,0.00,0.00,20.00,54.36,2.7182,2.7182,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:56:53.976','2026-07-02 15:58:28.634','2026-07-02 15:58:28.634'),('cmr3ovfbp000qndhpfeba2rd2','cmr3kfsrx000vnd6o1umreto3','本来菇事金针菇',0.00,5.4000,0.00,0.00,0.00,5.4000,0.00,0.00,0.00,0.00,0.00,5.4000,5.4000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:56:53.976','2026-07-02 15:58:28.634','2026-07-02 15:58:28.634'),('cmr3owvn5000zndhp9o2p490m','cmr2xthna001hnddoq2ir1lmi','香菇鲜品',30.00,3.0785,92.36,0.00,0.00,3.0785,0.00,0.00,2.00,28.00,92.36,3.2984,3.2984,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:58:28.634','2026-07-02 15:59:36.492','2026-07-02 15:59:36.492'),('cmr3owvn90010ndhpv3ssgb68','cmr2xthnb001inddo1pkoxafx','金针菇鲜品',0.00,1.8000,0.00,0.00,0.00,1.8000,0.00,0.00,0.00,0.00,0.00,1.8000,1.8000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:58:28.634','2026-07-02 15:59:36.492','2026-07-02 15:59:36.492'),('cmr3owvne0011ndhpt7s0ib3v','cmr2xthnc001jnddoukeowtrs','杏鲍菇鲜品',0.00,4.6000,0.00,0.00,0.00,4.6000,0.00,0.00,0.00,0.00,0.00,4.6000,4.6000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:58:28.634','2026-07-02 15:59:36.492','2026-07-02 15:59:36.492'),('cmr3owvni0012ndhpfw18ieuq','cmr2xthnd001knddoknxi4yza','干香菇',0.00,2.6000,0.00,0.00,0.00,2.6000,0.00,0.00,0.00,0.00,0.00,2.6000,2.6000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:58:28.634','2026-07-02 15:59:36.492','2026-07-02 15:59:36.492'),('cmr3owvnn0013ndhpni0vf8ni','cmr2xthnd001lnddo195l3his','木耳干品',20.00,2.7182,54.36,0.00,0.00,2.7182,0.00,0.00,1.00,19.00,54.36,2.8613,2.8613,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:58:28.634','2026-07-02 15:59:36.492','2026-07-02 15:59:36.492'),('cmr3owvns0014ndhpfnk6oml5','cmr3kfsrx000vnd6o1umreto3','本来菇事金针菇',0.00,5.4000,0.00,0.00,0.00,5.4000,0.00,0.00,0.00,0.00,0.00,5.4000,5.4000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:58:28.634','2026-07-02 15:59:36.492','2026-07-02 15:59:36.492'),('cmr3oxdsj0015ndhphsqqcrjc','cmr2xthna001hnddoq2ir1lmi','香菇鲜品',28.00,3.2984,92.36,0.00,0.00,3.2984,0.00,0.00,0.00,28.00,92.36,3.2984,3.2984,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:59:36.492','2026-07-02 16:00:00.005','2026-07-02 16:00:00.005'),('cmr3oxdsr0016ndhpy77il04p','cmr2xthnb001inddo1pkoxafx','金针菇鲜品',0.00,1.8000,0.00,0.00,0.00,1.8000,0.00,0.00,0.00,0.00,0.00,1.8000,1.8000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:59:36.492','2026-07-02 16:00:00.005','2026-07-02 16:00:00.005'),('cmr3oxdsw0017ndhpvj7j3ra6','cmr2xthnc001jnddoukeowtrs','杏鲍菇鲜品',0.00,4.6000,0.00,0.00,0.00,4.6000,0.00,0.00,0.00,0.00,0.00,4.6000,4.6000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:59:36.492','2026-07-02 16:00:00.005','2026-07-02 16:00:00.005'),('cmr3oxdt20018ndhpwnwn4s33','cmr2xthnd001knddoknxi4yza','干香菇',0.00,2.6000,0.00,0.00,0.00,2.6000,0.00,0.00,0.00,0.00,0.00,2.6000,2.6000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:59:36.492','2026-07-02 16:00:00.005','2026-07-02 16:00:00.005'),('cmr3oxdt70019ndhp95a6ashy','cmr2xthnd001lnddo195l3his','木耳干品',19.00,2.8613,54.36,0.00,0.00,2.8613,0.00,0.00,0.00,19.00,54.36,2.8613,2.8613,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:59:36.492','2026-07-02 16:00:00.005','2026-07-02 16:00:00.005'),('cmr3oxdtb001andhpdiplhp46','cmr3kfsrx000vnd6o1umreto3','本来菇事金针菇',0.00,5.4000,0.00,0.00,0.00,5.4000,0.00,0.00,0.00,0.00,0.00,5.4000,5.4000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 15:59:36.492','2026-07-02 16:00:00.005','2026-07-02 16:00:00.005'),('cmr3pdnbu0009nd1rf6pqbd0e','cmr2xthna001hnddoq2ir1lmi','香菇鲜品',28.00,3.2984,92.36,0.00,0.00,3.2984,0.00,0.00,2.00,26.00,92.36,3.5521,3.5521,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 16:00:00.005','2026-07-02 16:12:38.858','2026-07-02 16:12:38.858'),('cmr3pdnc8000and1rcf57trkt','cmr2xthnb001inddo1pkoxafx','金针菇鲜品',0.00,1.8000,0.00,0.00,0.00,1.8000,0.00,0.00,0.00,0.00,0.00,1.8000,1.8000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 16:00:00.005','2026-07-02 16:12:38.858','2026-07-02 16:12:38.858'),('cmr3pdnch000bnd1r34wb9v5e','cmr2xthnc001jnddoukeowtrs','杏鲍菇鲜品',0.00,4.6000,0.00,0.00,0.00,4.6000,0.00,0.00,0.00,0.00,0.00,4.6000,4.6000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 16:00:00.005','2026-07-02 16:12:38.858','2026-07-02 16:12:38.858'),('cmr3pdncq000cnd1rhj361q97','cmr2xthnd001knddoknxi4yza','干香菇',0.00,2.6000,0.00,0.00,0.00,2.6000,0.00,0.00,0.00,0.00,0.00,2.6000,2.6000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 16:00:00.005','2026-07-02 16:12:38.858','2026-07-02 16:12:38.858'),('cmr3pdncz000dnd1r886zt4ne','cmr2xthnd001lnddo195l3his','木耳干品',19.00,2.8613,54.36,0.00,0.00,2.8613,0.00,0.00,2.00,17.00,54.36,3.1979,3.1979,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 16:00:00.005','2026-07-02 16:12:38.858','2026-07-02 16:12:38.858'),('cmr3pdnda000end1rfielezod','cmr3kfsrx000vnd6o1umreto3','本来菇事金针菇',0.00,5.4000,0.00,0.00,0.00,5.4000,0.00,0.00,0.00,0.00,0.00,5.4000,5.4000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 16:00:00.005','2026-07-02 16:12:38.858','2026-07-02 16:12:38.858'),('cmr4enb4u0008ndpasofdv5oy','cmr2xthna001hnddoq2ir1lmi','香菇鲜品',26.00,3.5521,92.35,0.00,0.00,3.5521,0.00,0.00,0.00,26.00,92.35,3.5521,3.5521,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 16:12:38.858','2026-07-03 04:00:00.019','2026-07-03 04:00:00.019'),('cmr4enb560009ndpam8v3hz4k','cmr2xthnb001inddo1pkoxafx','金针菇鲜品',0.00,1.8000,0.00,0.00,0.00,1.8000,0.00,0.00,0.00,0.00,0.00,1.8000,1.8000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 16:12:38.858','2026-07-03 04:00:00.019','2026-07-03 04:00:00.019'),('cmr4enb5c000andpamv772gfa','cmr2xthnc001jnddoukeowtrs','杏鲍菇鲜品',0.00,4.6000,0.00,0.00,0.00,4.6000,0.00,0.00,0.00,0.00,0.00,4.6000,4.6000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 16:12:38.858','2026-07-03 04:00:00.019','2026-07-03 04:00:00.019'),('cmr4enb5j000bndpa9rfukua8','cmr2xthnd001knddoknxi4yza','干香菇',0.00,2.6000,0.00,0.00,0.00,2.6000,0.00,0.00,0.00,0.00,0.00,2.6000,2.6000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 16:12:38.858','2026-07-03 04:00:00.019','2026-07-03 04:00:00.019'),('cmr4enb5q000cndpa5gg49os1','cmr2xthnd001lnddo195l3his','木耳干品',17.00,3.1979,54.36,0.00,0.00,3.1979,0.00,0.00,0.00,17.00,54.36,3.1979,3.1979,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 16:12:38.858','2026-07-03 04:00:00.019','2026-07-03 04:00:00.019'),('cmr4enb5y000dndpa7lrx8g1v','cmr3kfsrx000vnd6o1umreto3','本来菇事金针菇',0.00,5.4000,0.00,0.00,0.00,5.4000,0.00,0.00,0.00,0.00,0.00,5.4000,5.4000,25.60,'[{\"amount\": 0.3, \"feeName\": \"包装费用\"}, {\"amount\": 2.5, \"feeName\": \"单盒成本\"}, {\"amount\": 0.2, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 2.7, \"feeName\": \"单盒成本\"}, {\"amount\": 0.3, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 3.4, \"feeName\": \"单盒成本\"}, {\"amount\": 0.5, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.2, \"feeName\": \"包装费用\"}, {\"amount\": 5.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 1.1, \"feeName\": \"包装费用\"}, {\"amount\": 3.8, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}, {\"amount\": 0.4, \"feeName\": \"包装费用\"}, {\"amount\": 4.2, \"feeName\": \"单盒成本\"}, {\"amount\": 0.1, \"feeName\": \"采购到货运费/盒\"}]','2026-07-02 16:12:38.858','2026-07-03 04:00:00.019','2026-07-03 04:00:00.019');
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
INSERT INTO `customers` VALUES ('cmr2xthne001nnddolp0hyhk2','C001','杭州生鲜超市','周经理','13900000001','杭州市西湖区','cmr2xthjv000jnddonu24ysj6',NULL,500000.00,30,'ACTIVE','2026-07-02 03:21:08.763','2026-07-02 03:21:08.763'),('cmr2xthnf001pnddood5a6pht','C002','上海餐饮连锁','吴总','13900000002','上海市浦东新区','cmr2xthjv000jnddonu24ysj6',NULL,1000000.00,45,'ACTIVE','2026-07-02 03:21:08.763','2026-07-02 03:21:08.763'),('cmr3g93ss0007nd8p609wbjfr','CUS20260702001','山东麦便利商业有限公司','戴安国','14588858884','',NULL,NULL,0.00,30,'ACTIVE','2026-07-02 11:57:10.397','2026-07-02 11:57:10.397'),('cmr3g9pa50009nd8pzx9u9qxv','CUS20260702002','青岛利群 ','张三','15800490400','',NULL,NULL,0.00,30,'ACTIVE','2026-07-02 11:57:38.238','2026-07-02 11:57:38.238'),('cmr3gaizj000bnd8p9spuljz4','CUS20260702003','庆云县俊成商厦','李四','15094994999','',NULL,NULL,0.00,30,'ACTIVE','2026-07-02 11:58:16.735','2026-07-02 11:58:16.735');
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
INSERT INTO `data_centers` VALUES ('cmr2xthnh001snddodhe5y15u','杭州数据中心','localhost','xdj_scm_db','http://localhost:4003','ACTIVE','2026-07-02 03:21:08.765');
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
INSERT INTO `departments` VALUES ('cmr2xthjq0008nddo0kxzovgc','财务部','FIN','cmr34c7oy0001ndimnx3t2ve5',NULL,2,'ACTIVE','2026-07-02 03:21:08.630','2026-07-02 06:23:40.027'),('cmr34c7oy0001ndimnx3t2ve5','杭州鲜当家生物科技有限公司','HRMS_CMPW5CCH',NULL,NULL,0,'ACTIVE','2026-07-02 06:23:40.018','2026-07-02 06:23:40.018'),('cmr34c7p20003ndimfr7nzkzp','商超事业部','HRMS_CMQKDQ6K','cmr34c7oy0001ndimnx3t2ve5','cmr2xthjv000jnddonu24ysj6',0,'ACTIVE','2026-07-02 06:23:40.022','2026-07-02 06:23:40.022'),('cmr34c7p50005ndimo6wdcsz5','餐饮事业部','HRMS_CMQKH945','cmr34c7oy0001ndimnx3t2ve5','cmr2xthjw000nnddoa651alvh',1,'ACTIVE','2026-07-02 06:23:40.025','2026-07-02 06:23:40.025'),('cmr34c7q40007ndimkxvu851t','人力资源部','HRMS_CMQKHDH9','cmr34c7oy0001ndimnx3t2ve5',NULL,3,'ACTIVE','2026-07-02 06:23:40.060','2026-07-02 06:23:40.060');
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
INSERT INTO `employees` VALUES ('cmr2xthjt000fnddogkor8u3s','g_emp001','EMP001','管理员','cmr34c7oy0001ndimnx3t2ve5','总经理','13800138000','admin@hrms.com','ACTIVE','2026-06-01 16:00:00.000','2026-07-02 03:21:08.634','2026-07-02 15:43:11.442'),('cmr2xthjv000jnddonu24ysj6','g_emp002','EMP002','吕永权','cmr34c7p20003ndimfr7nzkzp','销售经理','13900139000','test@hrms.com','ACTIVE','2026-06-01 16:00:00.000','2026-07-02 03:21:08.635','2026-07-02 15:43:11.474'),('cmr2xthjw000nnddoa651alvh','g_emp003','EMP003','吴月新','cmr34c7p50005ndimo6wdcsz5','销售经理','13800138000','emp003@hrms.internal','ACTIVE','2026-06-01 16:00:00.000','2026-07-02 03:21:08.636','2026-07-02 15:43:11.480'),('cmr2xthjx000rnddozqsby7nq','g_emp004','EMP004','王小明','cmr34c7p20003ndimfr7nzkzp','销售员','13900139001','wangxm@example.com','ACTIVE','2026-06-02 16:00:00.000','2026-07-02 03:21:08.637','2026-07-02 15:43:11.485'),('cmr2xthjx000vnddoo256ase1','g_emp005','EMP005','李丽华','cmr34c7oy0001ndimnx3t2ve5',NULL,'13900139002','lilh@example.com','RESIGNED','2026-05-31 16:00:00.000','2026-07-02 03:21:08.638','2026-07-02 15:43:11.491'),('cmr34c7r6000andim27lw14kn','g_emp006','EMP006','张三','cmr34c7oy0001ndimnx3t2ve5',NULL,'13800138001','emp006@hrms.internal','INACTIVE','2024-12-31 16:00:00.000','2026-07-02 06:23:40.099','2026-07-02 15:43:11.496'),('cmr34c7r7000endimryvbf6rs','g_emp007','EMP007','苏耜同','cmr34c7oy0001ndimnx3t2ve5','总经理','13805335778','emp007@hrms.internal','ACTIVE','2000-09-30 16:00:00.000','2026-07-02 06:23:40.099','2026-07-02 15:43:11.501'),('cmr34c7r8000indimzljp871z','g_emp008','EMP008','苏建昌','cmr34c7oy0001ndimnx3t2ve5','总经理','13506445909','emp008@hrms.internal','ACTIVE','2000-09-30 16:00:00.000','2026-07-02 06:23:40.100','2026-07-02 15:43:11.505'),('cmr34c7ra000mndimuel8s3dv','g_emp009','EMP009','于雷','cmr34c7p50005ndimo6wdcsz5','销售员',NULL,'emp009@hrms.internal','ACTIVE','2026-06-11 16:00:00.000','2026-07-02 06:23:40.102','2026-07-02 15:43:11.510'),('cmr34c7rb000qndimz6by5qfz','g_emp010','EMP010','王振东','cmr34c7q40007ndimkxvu851t','行政经理',NULL,'emp010@hrms.internal','ACTIVE','2026-06-11 16:00:00.000','2026-07-02 06:23:40.104','2026-07-02 15:43:11.516'),('cmr34c7rc000undim4n4m6z3e','g_emp011','EMP011','孟祥营','cmr34c7q40007ndimkxvu851t','行政专员',NULL,'emp011@hrms.internal','ACTIVE','2026-06-14 16:00:00.000','2026-07-02 06:23:40.104','2026-07-02 15:43:11.521'),('cmr34c7rd000yndimg4humua2','g_emp012','EMP012','测试复制','cmr34c7oy0001ndimnx3t2ve5',NULL,NULL,'emp012@hrms.internal','RESIGNED','2026-06-15 16:00:00.000','2026-07-02 06:23:40.105','2026-07-02 15:43:11.525'),('cmr34c7rd0012ndimkxyexxel','g_emp013','EMP013','邵玉云','cmr2xthjq0008nddo0kxzovgc','行政专员',NULL,'emp013@hrms.internal','ACTIVE','2026-06-14 16:00:00.000','2026-07-02 06:23:40.106','2026-07-02 15:43:11.530'),('cmr34c7re0016ndimttx7iljr','g_emp014','EMP014','吕永宝','cmr2xthjq0008nddo0kxzovgc','财务总监','1234656418','emp014@hrms.internal','ACTIVE','2026-06-16 16:00:00.000','2026-07-02 06:23:40.107','2026-07-02 15:43:11.535');
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
INSERT INTO `fee_records` VALUES ('cmr3nkrv4000ondwtxerer1gj','cmr2xthna001hnddoq2ir1lmi','包装费用','PACKAGING',0.30,0,1,NULL,'2026-07-02 15:22:12.113','2026-07-02 15:22:12.113'),('cmr3nkrv6000qndwtxnx3s8h0','cmr2xthna001hnddoq2ir1lmi','单盒成本','BOX_COST',2.50,0,1,NULL,'2026-07-02 15:22:12.115','2026-07-02 15:22:12.115'),('cmr3nkrv8000sndwtshur3ptq','cmr2xthna001hnddoq2ir1lmi','采购到货运费/盒','FREIGHT',0.20,0,1,NULL,'2026-07-02 15:22:12.116','2026-07-02 15:22:12.116'),('cmr3nl532000undwtzdabwj0y','cmr2xthnb001inddo1pkoxafx','包装费用','PACKAGING',0.40,0,1,NULL,'2026-07-02 15:22:29.247','2026-07-02 15:22:29.247'),('cmr3nl534000wndwtf2mnm0s3','cmr2xthnb001inddo1pkoxafx','单盒成本','BOX_COST',2.70,0,1,NULL,'2026-07-02 15:22:29.248','2026-07-02 15:22:29.248'),('cmr3nl535000yndwtkgybdly4','cmr2xthnb001inddo1pkoxafx','采购到货运费/盒','FREIGHT',0.30,0,1,NULL,'2026-07-02 15:22:29.250','2026-07-02 15:22:29.250'),('cmr3nlhbp0010ndwttee4lv0a','cmr2xthnc001jnddoukeowtrs','包装费用','PACKAGING',0.20,0,1,NULL,'2026-07-02 15:22:45.109','2026-07-02 15:22:45.109'),('cmr3nlhbq0012ndwt1ygdy6hs','cmr2xthnc001jnddoukeowtrs','单盒成本','BOX_COST',3.40,0,1,NULL,'2026-07-02 15:22:45.111','2026-07-02 15:22:45.111'),('cmr3nlhbs0014ndwtxgorcw63','cmr2xthnc001jnddoukeowtrs','采购到货运费/盒','FREIGHT',0.50,0,1,NULL,'2026-07-02 15:22:45.112','2026-07-02 15:22:45.112'),('cmr3nlq9c0016ndwtv0i89usr','cmr2xthnd001knddoknxi4yza','包装费用','PACKAGING',0.20,0,1,NULL,'2026-07-02 15:22:56.688','2026-07-02 15:22:56.688'),('cmr3nlq9e0018ndwtnj69qk0t','cmr2xthnd001knddoknxi4yza','单盒成本','BOX_COST',5.20,0,1,NULL,'2026-07-02 15:22:56.690','2026-07-02 15:22:56.690'),('cmr3nlq9f001andwt0imos9z7','cmr2xthnd001knddoknxi4yza','采购到货运费/盒','FREIGHT',0.00,0,1,NULL,'2026-07-02 15:22:56.692','2026-07-02 15:22:56.692'),('cmr3nm330001cndwtgcea6z58','cmr2xthnd001lnddo195l3his','包装费用','PACKAGING',1.10,0,1,NULL,'2026-07-02 15:23:13.308','2026-07-02 15:23:13.308'),('cmr3nm333001endwtbmv566vk','cmr2xthnd001lnddo195l3his','单盒成本','BOX_COST',3.80,0,1,NULL,'2026-07-02 15:23:13.311','2026-07-02 15:23:13.311'),('cmr3nm335001gndwtzb6wndlg','cmr2xthnd001lnddo195l3his','采购到货运费/盒','FREIGHT',0.10,0,1,NULL,'2026-07-02 15:23:13.313','2026-07-02 15:23:13.313'),('cmr3nmgee001indwtk3as1v8x','cmr3kfsrx000vnd6o1umreto3','包装费用','PACKAGING',0.40,0,1,NULL,'2026-07-02 15:23:30.567','2026-07-02 15:23:30.567'),('cmr3nmgeg001kndwtnqldyu1p','cmr3kfsrx000vnd6o1umreto3','单盒成本','BOX_COST',4.20,0,1,NULL,'2026-07-02 15:23:30.568','2026-07-02 15:23:30.568'),('cmr3nmgeh001mndwtqb8znqvl','cmr3kfsrx000vnd6o1umreto3','采购到货运费/盒','FREIGHT',0.10,0,1,NULL,'2026-07-02 15:23:30.570','2026-07-02 15:23:30.570');
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
  `qty` int NOT NULL DEFAULT '0',
  `lockedQty` int NOT NULL DEFAULT '0',
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
INSERT INTO `inventory` VALUES ('cmr3kaqag000dnd6o6jgsyhh0','cmr2xthna001hnddoq2ir1lmi','cmr2xthn50018nddo04mkwiar',NULL,26,6,'2026-07-03 14:13:56.782'),('cmr3kaqba000nnd6oqutxozoh','cmr2xthnd001lnddo195l3his','cmr2xthn50018nddo04mkwiar',NULL,17,0,'2026-07-02 16:12:34.632'),('cmr527b6i0003ndgx71boshwv','cmr2xthnd001knddoknxi4yza','cmr3ge20j000lnd8p225f4h4a',NULL,215,0,'2026-07-03 14:59:24.398');
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
INSERT INTO `logistics_providers` VALUES ('cmr3h2o15000jndfl7qgszpnb','货拉拉','CYS-001','EXPRESS','','','','','',NULL,'null','ACTIVE','2026-07-02 12:20:09.641','2026-07-02 12:20:09.641'),('cmr3h9xwz000ondfl8m4liha1','运满满','CYS-002','COLD_CHAIN','','','','','',NULL,'null','ACTIVE','2026-07-02 12:25:49.044','2026-07-02 12:25:49.044');
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
INSERT INTO `material_grade_mappings` VALUES ('cmr3g6ru70004nd8pw1vehffi','cmr2xthnb001inddo1pkoxafx','cmr33sxut0004nd5sxslar4fc','2026-07-02 11:55:21.584'),('cmr3g6ru70005nd8pg30rtefx','cmr2xthnb001inddo1pkoxafx','cmr33tjoy0005nd5s3vyojdc4','2026-07-02 11:55:21.584'),('cmr3mbgqk0000ndzo76r2dxw4','cmr2xthna001hnddoq2ir1lmi','cmr33sdj00000nd5s1xplmjrd','2026-07-02 14:46:58.172'),('cmr3mbgqk0001ndzo20q0o8rw','cmr2xthna001hnddoq2ir1lmi','cmr33siqr0001nd5sy6p0jicq','2026-07-02 14:46:58.172'),('cmr3mbgqk0002ndzof531scmx','cmr2xthna001hnddoq2ir1lmi','cmr33snmp0002nd5st5l05epq','2026-07-02 14:46:58.172'),('cmr3mbgqk0003ndzo2nas2cc2','cmr2xthna001hnddoq2ir1lmi','cmr33ss3u0003nd5swzjxzjeo','2026-07-02 14:46:58.172'),('cmr3mce5m0004ndzobdgmgue1','cmr2xthnd001knddoknxi4yza','cmr33sxut0004nd5sxslar4fc','2026-07-02 14:47:41.483'),('cmr3mce5m0005ndzoe3wjypex','cmr2xthnd001knddoknxi4yza','cmr33tjoy0005nd5s3vyojdc4','2026-07-02 14:47:41.483'),('cmr3mcj6s0006ndzorwuwx3n5','cmr3kfsrx000vnd6o1umreto3','cmr33sxut0004nd5sxslar4fc','2026-07-02 14:47:48.005'),('cmr3mcj6s0007ndzo0wv5j1cx','cmr3kfsrx000vnd6o1umreto3','cmr33tjoy0005nd5s3vyojdc4','2026-07-02 14:47:48.005'),('cmr4m8q900004ndnppsljoi2c','cmr2xthnc001jnddoukeowtrs','cmr33siqr0001nd5sy6p0jicq','2026-07-03 07:32:36.708');
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
INSERT INTO `material_grades` VALUES ('cmr33sdj00000nd5s1xplmjrd','MG20260702T01B10','花菇',NULL,0,'ACTIVE','2026-07-02 06:08:14.460','2026-07-02 06:08:14.460'),('cmr33siqr0001nd5sy6p0jicq','MG20260702ZS359B','一级',NULL,0,'ACTIVE','2026-07-02 06:08:21.220','2026-07-02 06:08:21.220'),('cmr33snmp0002nd5st5l05epq','MG202607020E7NQE','二级',NULL,0,'ACTIVE','2026-07-02 06:08:27.554','2026-07-02 06:08:27.554'),('cmr33ss3u0003nd5swzjxzjeo','MG2026070227TPPT','大片',NULL,0,'ACTIVE','2026-07-02 06:08:33.354','2026-07-02 06:08:33.354'),('cmr33sxut0004nd5sxslar4fc','MG20260702R8DPKS','40A',NULL,0,'ACTIVE','2026-07-02 06:08:40.806','2026-07-02 06:08:40.806'),('cmr33tjoy0005nd5s3vyojdc4','MG20260702JCXKPC','20B',NULL,0,'ACTIVE','2026-07-02 06:09:09.107','2026-07-02 06:09:09.107');
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
INSERT INTO `material_groups` VALUES ('grp-gxg','GXG','干香菇','干品','干香菇系列产品','ACTIVE','2026-07-02 11:29:43.000','2026-07-02 11:29:43.000'),('grp-jzg','JZG','金针菇','鲜品','金针菇系列产品','ACTIVE','2026-07-02 11:29:43.000','2026-07-02 11:29:43.000'),('grp-me','ME','木耳','干品','木耳系列产品','ACTIVE','2026-07-02 11:29:43.000','2026-07-02 11:29:43.000'),('grp-xbg','XBG','杏鲍菇','鲜品','杏鲍菇系列产品','ACTIVE','2026-07-02 11:29:43.000','2026-07-02 11:29:43.000'),('grp-xg','XG','香菇','鲜品','香菇系列产品','ACTIVE','2026-07-02 11:29:43.000','2026-07-02 11:29:43.000');
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
INSERT INTO `materials` VALUES ('cmr2xthna001hnddoq2ir1lmi','M001','香菇鲜品','300g/盒','斤','斤','盒',1.0000,0.6000,'grp-xg','鲜品',7,2.0,6.0,NULL,'ACTIVE',8.50,4.50,26.00,3,2.90,'2026-07-02 13:50:24.673','2026-07-02 03:21:08.758','2026-07-02 14:46:58.157'),('cmr2xthnb001inddo1pkoxafx','M002','金针菇鲜品','200g/袋','斤','斤','袋',1.0000,0.4000,'grp-jzg','鲜品',10,2.0,6.0,NULL,'ACTIVE',3.50,1.80,15.00,3,0.00,NULL,'2026-07-02 03:21:08.759','2026-07-02 11:55:21.577'),('cmr2xthnc001jnddoukeowtrs','M003','杏鲍菇鲜品','125g/袋','斤','斤','袋',1.0000,0.2500,'grp-xbg','鲜品',10,2.0,6.0,NULL,'ACTIVE',6.00,4.60,27.00,8,0.00,NULL,'2026-07-02 03:21:08.760','2026-07-03 07:32:36.696'),('cmr2xthnd001knddoknxi4yza','M004','干香菇','500g/袋','斤','斤','袋',1.0000,1.0000,'grp-gxg','干品',365,0.0,0.0,NULL,'ACTIVE',35.00,2.60,22.00,5,4.00,'2026-07-03 14:59:24.402','2026-07-02 03:21:08.761','2026-07-03 14:59:24.403'),('cmr2xthnd001lnddo195l3his','M005','木耳干品','250g/袋','斤','斤','袋',1.0000,0.5000,'grp-me','干品',365,0.0,0.0,NULL,'ACTIVE',28.00,2.50,20.00,6,2.60,'2026-07-02 13:50:24.702','2026-07-02 03:21:08.762','2026-07-02 14:46:46.344'),('cmr3kfsrx000vnd6o1umreto3','MAT20260702001','本来菇事金针菇','125g','斤','斤','盒',1.0000,0.2500,'grp-jzg','鲜品',3,0.0,0.0,NULL,'ACTIVE',0.00,5.40,25.00,3,0.00,NULL,'2026-07-02 13:54:21.165','2026-07-02 14:47:47.995');
/*!40000 ALTER TABLE `materials` ENABLE KEYS */;
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
INSERT INTO `mobile_layout_configs` VALUES ('cmr47c0li0000ndgbc05w87l1','admin','[{\"path\":\"/\",\"label\":\"首页\",\"icon\":\"Dashboard\",\"sortOrder\":1},{\"path\":\"/inventory\",\"label\":\"库存\",\"icon\":\"Inventory\",\"sortOrder\":2},{\"path\":\"/sales-orders\",\"label\":\"销售\",\"icon\":\"ShoppingCart\",\"sortOrder\":3},{\"path\":\"/purchase-orders\",\"label\":\"采购\",\"icon\":\"TrendingUp\",\"sortOrder\":4},{\"path\":\"/settings\",\"label\":\"设置\",\"icon\":\"Settings\",\"sortOrder\":5}]','[{\"label\":\"销售总额\",\"key\":\"sales\",\"icon\":\"ShoppingCart\",\"color\":\"#1976d2\",\"path\":\"/sales-orders\",\"sortOrder\":1},{\"label\":\"采购总额\",\"key\":\"purchase\",\"icon\":\"TrendingUp\",\"color\":\"#9c27b0\",\"path\":\"/purchase-orders\",\"sortOrder\":2},{\"label\":\"库存总量\",\"key\":\"inventory\",\"icon\":\"Inventory\",\"color\":\"#2e7d32\",\"path\":\"/inventory\",\"sortOrder\":3},{\"label\":\"应收余额\",\"key\":\"receivable\",\"icon\":\"AccountBalanceWallet\",\"color\":\"#ed6c02\",\"path\":\"/receivables\",\"sortOrder\":4},{\"label\":\"应付余额\",\"key\":\"payable\",\"icon\":\"AccountBalanceWallet\",\"color\":\"#d32f2f\",\"path\":\"/payables\",\"sortOrder\":5},{\"label\":\"临期批次\",\"key\":\"batch\",\"icon\":\"Warning\",\"color\":\"#f44336\",\"path\":\"/inventory\",\"sortOrder\":6}]','[{\"label\":\"实时库存\",\"icon\":\"Inventory\",\"path\":\"/inventory\",\"color\":\"primary.main\",\"sortOrder\":1},{\"label\":\"销售订单\",\"icon\":\"ShoppingCart\",\"path\":\"/sales-orders\",\"color\":\"secondary.main\",\"sortOrder\":2},{\"label\":\"采购订单\",\"icon\":\"TrendingUp\",\"path\":\"/purchase-orders\",\"color\":\"success.main\",\"sortOrder\":3},{\"label\":\"临期预警\",\"icon\":\"Warning\",\"path\":\"/inventory\",\"color\":\"warning.main\",\"sortOrder\":4}]','2026-07-03 00:35:15.847','2026-07-03 00:35:15.847'),('cmr47c0lm0001ndgb5j96cred','warehouse','[{\"path\":\"/\",\"label\":\"首页\",\"icon\":\"Dashboard\",\"sortOrder\":1},{\"path\":\"/inventory\",\"label\":\"库存\",\"icon\":\"Inventory\",\"sortOrder\":2},{\"path\":\"/scan-inbound\",\"label\":\"扫码\",\"icon\":\"QrCodeScanner\",\"sortOrder\":3},{\"path\":\"/stock-take\",\"label\":\"盘点\",\"icon\":\"Assignment\",\"sortOrder\":4},{\"path\":\"/settings\",\"label\":\"设置\",\"icon\":\"Settings\",\"sortOrder\":5}]','[{\"label\":\"库存总量\",\"key\":\"inventory\",\"icon\":\"Inventory\",\"color\":\"#2e7d32\",\"path\":\"/inventory\",\"sortOrder\":1},{\"label\":\"临期批次\",\"key\":\"batch\",\"icon\":\"Warning\",\"color\":\"#f44336\",\"path\":\"/inventory\",\"sortOrder\":2},{\"label\":\"待入库\",\"key\":\"pendingInbound\",\"icon\":\"QrCodeScanner\",\"color\":\"#1976d2\",\"path\":\"/scan-inbound\",\"sortOrder\":3},{\"label\":\"待盘点\",\"key\":\"pendingStockTake\",\"icon\":\"Assignment\",\"color\":\"#ed6c02\",\"path\":\"/stock-take\",\"sortOrder\":4}]','[{\"label\":\"扫码入库\",\"icon\":\"QrCodeScanner\",\"path\":\"/scan-inbound\",\"color\":\"primary.main\",\"sortOrder\":1},{\"label\":\"实时库存\",\"icon\":\"Inventory\",\"path\":\"/inventory\",\"color\":\"success.main\",\"sortOrder\":2},{\"label\":\"盘点管理\",\"icon\":\"Assignment\",\"path\":\"/stock-take\",\"color\":\"warning.main\",\"sortOrder\":3},{\"label\":\"临期预警\",\"icon\":\"Warning\",\"path\":\"/inventory\",\"color\":\"error.main\",\"sortOrder\":4}]','2026-07-03 00:35:15.851','2026-07-03 00:35:15.851'),('cmr47c0lo0002ndgb23nhkhwy','sales','[{\"path\":\"/\",\"label\":\"首页\",\"icon\":\"Dashboard\",\"sortOrder\":1},{\"path\":\"/sales-orders\",\"label\":\"销售订单\",\"icon\":\"ShoppingCart\",\"sortOrder\":2},{\"path\":\"/sales-plans\",\"label\":\"销售计划\",\"icon\":\"Assignment\",\"sortOrder\":3},{\"path\":\"/receivables\",\"label\":\"应收\",\"icon\":\"AccountBalanceWallet\",\"sortOrder\":4},{\"path\":\"/settings\",\"label\":\"设置\",\"icon\":\"Settings\",\"sortOrder\":5}]','[{\"label\":\"销售总额\",\"key\":\"sales\",\"icon\":\"ShoppingCart\",\"color\":\"#1976d2\",\"path\":\"/sales-orders\",\"sortOrder\":1},{\"label\":\"应收余额\",\"key\":\"receivable\",\"icon\":\"AccountBalanceWallet\",\"color\":\"#ed6c02\",\"path\":\"/receivables\",\"sortOrder\":2},{\"label\":\"临期批次\",\"key\":\"batch\",\"icon\":\"Warning\",\"color\":\"#f44336\",\"path\":\"/inventory\",\"sortOrder\":3},{\"label\":\"库存总量\",\"key\":\"inventory\",\"icon\":\"Inventory\",\"color\":\"#2e7d32\",\"path\":\"/inventory\",\"sortOrder\":4}]','[{\"label\":\"销售订单\",\"icon\":\"ShoppingCart\",\"path\":\"/sales-orders\",\"color\":\"primary.main\",\"sortOrder\":1},{\"label\":\"销售计划\",\"icon\":\"Assignment\",\"path\":\"/sales-plans\",\"color\":\"secondary.main\",\"sortOrder\":2},{\"label\":\"应收账款\",\"icon\":\"AccountBalanceWallet\",\"path\":\"/receivables\",\"color\":\"warning.main\",\"sortOrder\":3},{\"label\":\"实时库存\",\"icon\":\"Inventory\",\"path\":\"/inventory\",\"color\":\"success.main\",\"sortOrder\":4}]','2026-07-03 00:35:15.852','2026-07-03 00:35:15.852'),('cmr47c0lo0003ndgb5xcw99lm','purchase','[{\"path\":\"/\",\"label\":\"首页\",\"icon\":\"Dashboard\",\"sortOrder\":1},{\"path\":\"/purchase-orders\",\"label\":\"采购订单\",\"icon\":\"TrendingUp\",\"sortOrder\":2},{\"path\":\"/payables\",\"label\":\"应付\",\"icon\":\"AccountBalanceWallet\",\"sortOrder\":3},{\"path\":\"/settings\",\"label\":\"设置\",\"icon\":\"Settings\",\"sortOrder\":4}]','[{\"label\":\"采购总额\",\"key\":\"purchase\",\"icon\":\"TrendingUp\",\"color\":\"#9c27b0\",\"path\":\"/purchase-orders\",\"sortOrder\":1},{\"label\":\"应付余额\",\"key\":\"payable\",\"icon\":\"AccountBalanceWallet\",\"color\":\"#d32f2f\",\"path\":\"/payables\",\"sortOrder\":2},{\"label\":\"库存总量\",\"key\":\"inventory\",\"icon\":\"Inventory\",\"color\":\"#2e7d32\",\"path\":\"/inventory\",\"sortOrder\":3}]','[{\"label\":\"采购订单\",\"icon\":\"TrendingUp\",\"path\":\"/purchase-orders\",\"color\":\"primary.main\",\"sortOrder\":1},{\"label\":\"应付账款\",\"icon\":\"AccountBalanceWallet\",\"path\":\"/payables\",\"color\":\"error.main\",\"sortOrder\":2},{\"label\":\"实时库存\",\"icon\":\"Inventory\",\"path\":\"/inventory\",\"color\":\"success.main\",\"sortOrder\":3}]','2026-07-03 00:35:15.853','2026-07-03 00:35:15.853'),('cmr47c0lq0004ndgbrpuk45xi','finance','[{\"path\":\"/\",\"label\":\"首页\",\"icon\":\"Dashboard\",\"sortOrder\":1},{\"path\":\"/receivables\",\"label\":\"应收\",\"icon\":\"AccountBalanceWallet\",\"sortOrder\":2},{\"path\":\"/payables\",\"label\":\"应付\",\"icon\":\"AccountBalanceWallet\",\"sortOrder\":3},{\"path\":\"/settings\",\"label\":\"设置\",\"icon\":\"Settings\",\"sortOrder\":4}]','[{\"label\":\"应收余额\",\"key\":\"receivable\",\"icon\":\"AccountBalanceWallet\",\"color\":\"#ed6c02\",\"path\":\"/receivables\",\"sortOrder\":1},{\"label\":\"应付余额\",\"key\":\"payable\",\"icon\":\"AccountBalanceWallet\",\"color\":\"#d32f2f\",\"path\":\"/payables\",\"sortOrder\":2},{\"label\":\"销售总额\",\"key\":\"sales\",\"icon\":\"ShoppingCart\",\"color\":\"#1976d2\",\"path\":\"/sales-orders\",\"sortOrder\":3},{\"label\":\"采购总额\",\"key\":\"purchase\",\"icon\":\"TrendingUp\",\"color\":\"#9c27b0\",\"path\":\"/purchase-orders\",\"sortOrder\":4}]','[{\"label\":\"应收账款\",\"icon\":\"AccountBalanceWallet\",\"path\":\"/receivables\",\"color\":\"warning.main\",\"sortOrder\":1},{\"label\":\"应付账款\",\"icon\":\"AccountBalanceWallet\",\"path\":\"/payables\",\"color\":\"error.main\",\"sortOrder\":2}]','2026-07-03 00:35:15.854','2026-07-03 00:35:15.854'),('cmr47c0lr0005ndgbtasvni2i','logistics','[{\"path\":\"/\",\"label\":\"首页\",\"icon\":\"Dashboard\",\"sortOrder\":1},{\"path\":\"/inventory\",\"label\":\"库存\",\"icon\":\"Inventory\",\"sortOrder\":2},{\"path\":\"/settings\",\"label\":\"设置\",\"icon\":\"Settings\",\"sortOrder\":3}]','[{\"label\":\"库存总量\",\"key\":\"inventory\",\"icon\":\"Inventory\",\"color\":\"#2e7d32\",\"path\":\"/inventory\",\"sortOrder\":1},{\"label\":\"临期批次\",\"key\":\"batch\",\"icon\":\"Warning\",\"color\":\"#f44336\",\"path\":\"/inventory\",\"sortOrder\":2}]','[{\"label\":\"实时库存\",\"icon\":\"Inventory\",\"path\":\"/inventory\",\"color\":\"primary.main\",\"sortOrder\":1},{\"label\":\"临期预警\",\"icon\":\"Warning\",\"path\":\"/inventory\",\"color\":\"warning.main\",\"sortOrder\":2}]','2026-07-03 00:35:15.856','2026-07-03 00:35:15.856'),('cmr47c0ls0006ndgbph6g3816','default','[{\"path\":\"/\",\"label\":\"首页\",\"icon\":\"Dashboard\",\"sortOrder\":1},{\"path\":\"/settings\",\"label\":\"设置\",\"icon\":\"Settings\",\"sortOrder\":2}]','[{\"label\":\"库存总量\",\"key\":\"inventory\",\"icon\":\"Inventory\",\"color\":\"#2e7d32\",\"path\":\"/inventory\",\"sortOrder\":1}]','[{\"label\":\"实时库存\",\"icon\":\"Inventory\",\"path\":\"/inventory\",\"color\":\"primary.main\",\"sortOrder\":1}]','2026-07-03 00:35:15.857','2026-07-03 00:35:15.857');
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
INSERT INTO `product_loss_records` VALUES ('cmr3nurpd001nndwtmz6affle','cmr2xthna001hnddoq2ir1lmi','香菇鲜品',0.00,138.00,0.00,138.00,130.00,8.00,5.80,5.80,0.00,0.0000,'2026-06-28 16:00:00.000','2026-07-27 16:00:00.000','2026-07-02 15:29:58.461'),('cmr3nurpk001ondwtrudt8vhk','cmr2xthnd001lnddo195l3his','木耳干品',0.00,115.00,0.00,115.00,110.00,5.00,4.35,4.35,0.00,0.0000,'2026-06-28 16:00:00.000','2026-07-27 16:00:00.000','2026-07-02 15:29:58.461'),('cmr3ovowc000rndhpwhvgvzsh','cmr2xthna001hnddoq2ir1lmi','香菇鲜品',0.00,138.00,100.00,38.00,30.00,8.00,5.80,21.05,0.00,0.0000,'2026-06-28 16:00:00.000','2026-07-27 16:00:00.000','2026-07-02 15:58:41.096'),('cmr3ovowj000sndhp5u1f49m1','cmr2xthnd001lnddo195l3his','木耳干品',0.00,115.00,90.00,25.00,20.00,5.00,4.35,20.00,0.00,0.0000,'2026-06-28 16:00:00.000','2026-07-27 16:00:00.000','2026-07-02 15:58:41.096'),('cmr3ownj5000xndhpljt1jxbz','cmr2xthna001hnddoq2ir1lmi','香菇鲜品',0.00,138.00,100.00,38.00,28.00,10.00,6.67,26.32,0.00,0.0000,'2026-06-28 16:00:00.000','2026-07-27 16:00:00.000','2026-07-02 15:59:25.981'),('cmr3ownjb000yndhp9wjabi06','cmr2xthnd001lnddo195l3his','木耳干品',0.00,115.00,90.00,25.00,19.00,6.00,5.00,24.00,0.00,0.0000,'2026-06-28 16:00:00.000','2026-07-27 16:00:00.000','2026-07-02 15:59:25.981');
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
INSERT INTO `purchase_order_items` VALUES ('cmr3k9p680003nd6oiqv6dj25','cmr3k9p680001nd6o5gujwo9p','cmr3hf92z001ondflnsh0uq8r','cmr2xthna001hnddoq2ir1lmi',140,2.90,0.00,406.00,0.00,406.00,NULL,'2026-07-02 13:49:36.561',NULL),('cmr3k9p680004nd6o1l603h91','cmr3k9p680001nd6o5gujwo9p','cmr3hclk00011ndfli93pvg4w','cmr2xthnd001lnddo195l3his',110,2.60,0.00,286.00,0.00,286.00,NULL,'2026-07-02 13:49:36.561',NULL),('cmr4a73350008ndwpk0o68td5','cmr4a73350006ndwpgrhxeodr','cmr41scgy000lnd7bt5rcn0zc','cmr2xthnd001knddoknxi4yza',100,3.00,0.00,300.00,0.00,300.00,NULL,'2026-07-03 01:55:24.641',NULL),('cmr4a73350009ndwpoedt9us2','cmr4a73350006ndwpgrhxeodr','cmr3hclk60015ndfl2grjmijh','cmr2xthnd001knddoknxi4yza',100,4.00,0.00,400.00,0.00,400.00,NULL,'2026-07-03 01:55:24.641',NULL);
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
INSERT INTO `purchase_orders` VALUES ('cmr3k9p680001nd6o5gujwo9p','PO20260702OGNWYQ','cmr3gbk5o000cnd8p58qm36zh','cmr3hf92y001mndflrrzbxh04','cmr3hf92z001ondflnsh0uq8r','cmr2xthn50018nddo04mkwiar','2026-07-02 00:00:00.000',NULL,'PENDING',0,2.77,0.00,250,692.00,0.00,692.00,NULL,'ORDERED','cmr2xthjt000fnddogkor8u3s',NULL,'2026-07-02 13:49:36.561','2026-07-02 13:49:40.671'),('cmr4a73350006ndwpgrhxeodr','PO20260703AOY9QV','cmr3gcakq000dnd8p0ubha0s4','cmr41scgy000jnd7bo66npf0m','cmr41scgy000lnd7bt5rcn0zc','cmr3ge20j000lnd8p225f4h4a','2026-07-03 00:00:00.000',NULL,'PENDING',0,3.50,0.00,200,700.00,0.00,700.00,NULL,'ORDERED','cmr2xthjt000fnddogkor8u3s',NULL,'2026-07-03 01:55:24.641','2026-07-03 01:56:05.120');
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
INSERT INTO `purchase_plan_items` VALUES ('cmr3hcf61000wndflv9wqx01q','cmr3hcf61000undflj91gakx8','cmr2xthnd001lnddo195l3his',100,'斤',0.00,0.00,'2026-07-08 00:00:00.000',0,0,NULL,0.00,0,NULL,NULL,NULL,1,'2026-07-02 12:27:44.713','2026-07-02 12:27:53.006',NULL),('cmr3hcf61000xndflw9znru0d','cmr3hcf61000undflj91gakx8','cmr2xthnd001knddoknxi4yza',50,'斤',0.00,0.00,'2026-07-07 00:00:00.000',0,0,NULL,0.00,0,NULL,NULL,NULL,1,'2026-07-02 12:27:44.713','2026-07-02 12:27:53.006',NULL),('cmr3hclk00011ndfli93pvg4w','cmr3hclk0000zndfl2wfotfbk','cmr2xthnd001lnddo195l3his',100,'斤',0.00,0.00,'2026-07-08 00:00:00.000',110,0,'cmr3gcakq000dnd8p0ubha0s4',2.60,110,NULL,'',NULL,0,'2026-07-02 12:27:52.992','2026-07-02 13:49:36.566',NULL),('cmr3hclk60015ndfl2grjmijh','cmr3hclk60013ndfl08zbnf65','cmr2xthnd001knddoknxi4yza',50,'斤',0.00,0.00,'2026-07-07 00:00:00.000',100,0,'cmr3gcakq000dnd8p0ubha0s4',4.00,100,NULL,'',NULL,0,'2026-07-02 12:27:52.998','2026-07-03 01:55:24.653',NULL),('cmr3hdt8a0019ndfl8kib4a3j','cmr3hdt8a0017ndflolzpsrhb','cmr2xthnc001jnddoukeowtrs',150,'斤',0.00,0.00,'2026-07-10 00:00:00.000',0,0,NULL,0.00,0,NULL,NULL,NULL,1,'2026-07-02 12:28:49.594','2026-07-02 12:29:59.605',NULL),('cmr3hevst001fndflr40r6uw4','cmr3hebm8001bndfllxlr4gct','cmr2xthnb001inddo1pkoxafx',300,'斤',0.00,0.00,'2026-07-05 00:00:00.000',0,0,NULL,0.00,0,NULL,NULL,NULL,1,'2026-07-02 12:29:39.581','2026-07-02 12:29:56.802',NULL),('cmr3hevst001gndfll64wsq6z','cmr3hebm8001bndfllxlr4gct','cmr2xthna001hnddoq2ir1lmi',150,'斤',0.00,0.00,'2026-07-05 00:00:00.000',0,0,NULL,0.00,0,NULL,NULL,NULL,1,'2026-07-02 12:29:39.581','2026-07-02 12:29:56.802',NULL),('cmr3hf92t001kndfl6c2g64eh','cmr3hf92t001indfleie0msy7','cmr2xthnb001inddo1pkoxafx',300,'斤',0.00,0.00,'2026-07-05 00:00:00.000',0,0,NULL,0.00,0,NULL,'',NULL,1,'2026-07-02 12:29:56.789','2026-07-02 12:36:07.461',NULL),('cmr3hf92z001ondflnsh0uq8r','cmr3hf92y001mndflrrzbxh04','cmr2xthna001hnddoq2ir1lmi',150,'斤',0.00,0.00,'2026-07-05 00:00:00.000',140,0,'cmr3gbk5o000cnd8p58qm36zh',2.90,140,NULL,'',NULL,0,'2026-07-02 12:29:56.795','2026-07-02 13:49:36.564',NULL),('cmr3hfb8u001sndfl0n5iz9cj','cmr3hfb8u001qndfl7uxf365x','cmr2xthnc001jnddoukeowtrs',150,'斤',0.00,0.00,'2026-07-10 00:00:00.000',0,0,NULL,0.00,0,NULL,'',NULL,0,'2026-07-02 12:29:59.599','2026-07-02 12:29:59.599',NULL),('cmr3hn733001wndflcy07yizo','cmr3hn732001undfl1r7ljcab','cmr2xthnb001inddo1pkoxafx',300,'斤',0.00,0.00,'2026-07-05 00:00:00.000',0,0,'cmr2xthng001rnddow2i8glcm',1.00,300,NULL,'',NULL,0,'2026-07-02 12:36:07.455','2026-07-03 01:34:16.715',NULL),('cmr3o164t0003nd8eldi4vg2j','cmr3o164t0001nd8eentht9e0','cmr3kfsrx000vnd6o1umreto3',100,'斤',0.00,0.00,NULL,0,0,NULL,0.00,0,'DA20260702001','来源: 管理员',NULL,1,'2026-07-02 15:34:57.101','2026-07-03 02:02:53.206',NULL),('cmr41scgj0003nd7bob0idhcr','cmr41scgj0001nd7bbk5tgz8d','cmr2xthna001hnddoq2ir1lmi',74,'斤',0.00,0.00,'2026-07-05 22:00:00.018',0,0,NULL,0.00,0,NULL,'建议采购量=74, 安全库存=100, 当前库存=26','PS20260703YAI0BX001',1,'2026-07-02 22:00:00.019','2026-07-02 22:00:00.040',NULL),('cmr41scgj0004nd7bau3xtokf','cmr41scgj0001nd7bbk5tgz8d','cmr2xthnb001inddo1pkoxafx',3,'斤',0.00,0.00,'2026-07-05 22:00:00.018',0,0,NULL,0.00,0,NULL,'建议采购量=3, 安全库存=3, 当前库存=0','PS20260703YAI0BX002',1,'2026-07-02 22:00:00.019','2026-07-02 22:00:00.040',NULL),('cmr41scgj0005nd7bsjr4l4i2','cmr41scgj0001nd7bbk5tgz8d','cmr2xthnc001jnddoukeowtrs',8,'斤',0.00,0.00,'2026-07-10 22:00:00.018',0,0,NULL,0.00,0,NULL,'建议采购量=8, 安全库存=8, 当前库存=0','PS20260703YAI0BX003',1,'2026-07-02 22:00:00.019','2026-07-02 22:00:00.040',NULL),('cmr41scgj0006nd7by9irsfuj','cmr41scgj0001nd7bbk5tgz8d','cmr2xthnd001knddoknxi4yza',5,'斤',0.00,0.00,'2026-07-07 22:00:00.018',0,0,NULL,0.00,0,NULL,'建议采购量=5, 安全库存=5, 当前库存=0','PS20260703YAI0BX004',1,'2026-07-02 22:00:00.019','2026-07-02 22:00:00.040',NULL),('cmr41scgj0007nd7b87fhr9wr','cmr41scgj0001nd7bbk5tgz8d','cmr2xthnd001lnddo195l3his',163,'斤',0.00,0.00,'2026-07-08 22:00:00.018',0,0,NULL,0.00,0,NULL,'建议采购量=163, 安全库存=180, 当前库存=17','PS20260703YAI0BX005',1,'2026-07-02 22:00:00.019','2026-07-02 22:00:00.040',NULL),('cmr41scgj0008nd7bey3tcsnm','cmr41scgj0001nd7bbk5tgz8d','cmr3kfsrx000vnd6o1umreto3',3,'斤',0.00,0.00,'2026-07-05 22:00:00.018',0,0,NULL,0.00,0,NULL,'建议采购量=3, 安全库存=3, 当前库存=0','PS20260703YAI0BX006',0,'2026-07-02 22:00:00.019','2026-07-02 22:00:00.019',NULL),('cmr41scgu000cnd7bhobwdw4k','cmr41scgu000and7bh5fu9quz','cmr2xthna001hnddoq2ir1lmi',74,'斤',0.00,0.00,'2026-07-05 22:00:00.018',0,0,NULL,2.00,100,NULL,'建议采购量=74, 安全库存=100, 当前库存=26','PS20260703YAI0BX001',0,'2026-07-02 22:00:00.030','2026-07-03 08:38:57.594','cmr33sdj00000nd5s1xplmjrd'),('cmr41scgx000gnd7bg3zszs3p','cmr41scgw000end7bt261hxf2','cmr2xthnb001inddo1pkoxafx',3,'斤',0.00,0.00,'2026-07-05 22:00:00.018',0,0,'cmr3gcakq000dnd8p0ubha0s4',2.00,100,NULL,'建议采购量=3, 安全库存=3, 当前库存=0','PS20260703YAI0BX002',0,'2026-07-02 22:00:00.033','2026-07-03 09:20:24.575','cmr33sxut0004nd5sxslar4fc'),('cmr41scgx000hnd7by4vdiah2','cmr41scgw000end7bt261hxf2','cmr2xthnc001jnddoukeowtrs',8,'斤',0.00,0.00,'2026-07-10 22:00:00.018',0,0,'cmr3gbk5o000cnd8p58qm36zh',3.00,200,NULL,'建议采购量=8, 安全库存=8, 当前库存=0','PS20260703YAI0BX003',0,'2026-07-02 22:00:00.033','2026-07-03 07:32:46.655','cmr33siqr0001nd5sy6p0jicq'),('cmr41scgy000lnd7bt5rcn0zc','cmr41scgy000jnd7bo66npf0m','cmr2xthnd001knddoknxi4yza',5,'斤',0.00,0.00,'2026-07-07 22:00:00.018',100,0,'cmr3gcakq000dnd8p0ubha0s4',3.00,100,NULL,'建议采购量=5, 安全库存=5, 当前库存=0','PS20260703YAI0BX004',0,'2026-07-02 22:00:00.035','2026-07-03 01:55:24.649',NULL),('cmr41sch0000pnd7bgnhx0949','cmr41sch0000nnd7b5fl67qnq','cmr2xthnd001lnddo195l3his',163,'斤',0.00,0.00,'2026-07-08 22:00:00.018',0,0,'cmr3gcakq000dnd8p0ubha0s4',2.60,170,NULL,'建议采购量=163, 安全库存=180, 当前库存=17','PS20260703YAI0BX005',0,'2026-07-02 22:00:00.036','2026-07-03 01:32:03.274',NULL),('cmr4agp70000lndwp2ytnko21','cmr4agp70000jndwpu37mswim','cmr3kfsrx000vnd6o1umreto3',100,'斤',0.00,0.00,NULL,0,0,NULL,0.00,0,NULL,'来源: 管理员',NULL,0,'2026-07-03 02:02:53.196','2026-07-03 02:02:53.196',NULL),('cmr4cov700003ndsdwv4vd4bx','cmr4cov700001ndsd1t8zjcp3','cmr2xthna001hnddoq2ir1lmi',500,'斤',0.00,0.00,'2026-07-09 00:00:00.000',0,0,NULL,0.00,0,NULL,NULL,NULL,1,'2026-07-03 03:05:13.452','2026-07-03 03:05:28.466','cmr33siqr0001nd5sy6p0jicq'),('cmr4cp6rt0007ndsd11ugx6bv','cmr4cp6rt0005ndsd5epv1m4m','cmr2xthna001hnddoq2ir1lmi',500,'斤',0.00,0.00,'2026-07-09 00:00:00.000',0,0,'cmr3gcakq000dnd8p0ubha0s4',3.00,550,NULL,'',NULL,0,'2026-07-03 03:05:28.457','2026-07-03 08:38:43.069',NULL),('cmr4dhqu90003ndpam64tnwiv','cmr4dhqu90001ndpa9d832p6r','cmr3kfsrx000vnd6o1umreto3',100,'斤',0.00,0.00,'2026-07-09 00:00:00.000',0,0,NULL,0.00,0,NULL,NULL,NULL,1,'2026-07-03 03:27:40.834','2026-07-03 03:27:48.975','cmr33sxut0004nd5sxslar4fc'),('cmr4dhx480007ndpagq9a2mcv','cmr4dhx480005ndpawj9yghok','cmr3kfsrx000vnd6o1umreto3',100,'斤',0.00,0.00,'2026-07-09 00:00:00.000',0,0,'cmr3gcakq000dnd8p0ubha0s4',2.00,105,NULL,'',NULL,0,'2026-07-03 03:27:48.968','2026-07-03 09:20:24.571','cmr33sxut0004nd5sxslar4fc');
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
INSERT INTO `purchase_plans` VALUES ('cmr3hcf61000undflj91gakx8','PP202607021ZNJA0','采购计划测试1','MONTHLY','2026-07-02 00:00:00.000',NULL,NULL,'cmr34c7oy0001ndimnx3t2ve5','APPROVED',0.00,'cmr2xthjt000fnddogkor8u3s','cmr2xthjt000fnddogkor8u3s','2026-07-02 12:27:50.640','2026-07-02 12:27:53.001',NULL,NULL,NULL,'2026-07-02 12:27:44.713','2026-07-02 12:27:53.002'),('cmr3hclk0000zndfl2wfotfbk','PP202607021ZNJA0-01','采购计划测试1（于雷）','MONTHLY','2026-07-02 12:27:52.991',NULL,NULL,'cmr34c7p50005ndimo6wdcsz5','CONFIRMED',0.00,'cmr2xthjt000fnddogkor8u3s',NULL,'2026-07-02 12:27:52.991','2026-07-02 12:27:52.991','cmr3hcf61000undflj91gakx8','cmr3gzz1q0001ndfl9rlzmkuu','由父计划 PP202607021ZNJA0 自动分配','2026-07-02 12:27:52.992','2026-07-02 12:32:03.839'),('cmr3hclk60013ndfl08zbnf65','PP202607021ZNJA0-02','采购计划测试1（吴月新）','MONTHLY','2026-07-02 12:27:52.997',NULL,NULL,'cmr34c7p50005ndimo6wdcsz5','CONFIRMED',0.00,'cmr2xthjt000fnddogkor8u3s',NULL,'2026-07-02 12:27:52.997','2026-07-02 12:27:52.997','cmr3hcf61000undflj91gakx8','cmr2xthn30012nddoaxv9bdn9','由父计划 PP202607021ZNJA0 自动分配','2026-07-02 12:27:52.998','2026-07-03 01:34:46.495'),('cmr3hdt8a0017ndflolzpsrhb','PP20260702OZ202F','采购计划测试2','MONTHLY','2026-07-02 00:00:00.000',NULL,NULL,'cmr34c7oy0001ndimnx3t2ve5','APPROVED',0.00,'cmr2xthjt000fnddogkor8u3s','cmr2xthjt000fnddogkor8u3s','2026-07-02 12:29:52.775','2026-07-02 12:29:59.602',NULL,NULL,NULL,'2026-07-02 12:28:49.594','2026-07-02 12:29:59.603'),('cmr3hebm8001bndfllxlr4gct','PP20260702GJG2HN','采购计划测试3','MONTHLY','2026-07-02 00:00:00.000',NULL,NULL,'cmr34c7oy0001ndimnx3t2ve5','APPROVED',0.00,'cmr2xthjt000fnddogkor8u3s','cmr2xthjt000fnddogkor8u3s','2026-07-02 12:29:54.410','2026-07-02 12:29:56.798',NULL,NULL,'[驳回原因]: 采购数量错了','2026-07-02 12:29:13.424','2026-07-02 12:29:56.799'),('cmr3hf92t001indfleie0msy7','PP20260702GJG2HN-01','采购计划测试3（吕永权）','MONTHLY','2026-07-02 12:29:56.788',NULL,NULL,'cmr34c7p20003ndimfr7nzkzp','APPROVED',0.00,'cmr2xthjt000fnddogkor8u3s',NULL,'2026-07-02 12:29:56.788','2026-07-02 12:29:56.788','cmr3hebm8001bndfllxlr4gct','cmr2xthn20010nddonsbyj3y7','由父计划 PP20260702GJG2HN 自动分配','2026-07-02 12:29:56.789','2026-07-02 12:29:56.789'),('cmr3hf92y001mndflrrzbxh04','PP20260702GJG2HN-02','采购计划测试3（王小明）','MONTHLY','2026-07-02 12:29:56.794',NULL,NULL,'cmr34c7p20003ndimfr7nzkzp','CONFIRMED',0.00,'cmr2xthjt000fnddogkor8u3s',NULL,'2026-07-02 12:29:56.794','2026-07-02 12:29:56.794','cmr3hebm8001bndfllxlr4gct','cmr2xthn40014nddomdsrpif1','由父计划 PP20260702GJG2HN 自动分配','2026-07-02 12:29:56.795','2026-07-02 12:36:56.546'),('cmr3hfb8u001qndfl7uxf365x','PP20260702OZ202F-01','采购计划测试2（吕永权）','MONTHLY','2026-07-02 12:29:59.598',NULL,NULL,'cmr34c7p20003ndimfr7nzkzp','APPROVED',0.00,'cmr2xthjt000fnddogkor8u3s',NULL,'2026-07-02 12:29:59.598','2026-07-02 12:29:59.598','cmr3hdt8a0017ndflolzpsrhb','cmr2xthn20010nddonsbyj3y7','由父计划 PP20260702OZ202F 自动分配','2026-07-02 12:29:59.599','2026-07-02 12:29:59.599'),('cmr3hn732001undfl1r7ljcab','PP20260702S1GEXR','采购计划测试3（吕永权）（转发）','MONTHLY','2026-07-02 12:36:07.454',NULL,NULL,'cmr34c7p50005ndimo6wdcsz5','CONFIRMED',0.00,'cmr2xthjt000fnddogkor8u3s',NULL,'2026-07-02 12:36:07.454','2026-07-02 12:36:07.454','cmr3hf92t001indfleie0msy7','cmr2xthn30012nddoaxv9bdn9','由管理员转发给吴月新','2026-07-02 12:36:07.455','2026-07-03 01:34:44.513'),('cmr3o164t0001nd8eentht9e0','PP20260702X2PICL','销售计划测试1','MONTHLY',NULL,'2026-07-02 00:00:00.000','2026-08-01 00:00:00.000',NULL,'APPROVED',0.00,'cmr2xthjt000fnddogkor8u3s','cmr2xthjt000fnddogkor8u3s','2026-07-03 02:02:20.761','2026-07-03 02:02:53.201',NULL,NULL,'由销售需求汇总推送生成','2026-07-02 15:34:57.101','2026-07-03 02:02:53.202'),('cmr41scgj0001nd7bbk5tgz8d','PP202607030CVDZX','自动采购计划 2026-07-03','MONTHLY','2026-07-02 22:00:00.018','2026-07-02 22:00:00.018','2026-08-01 22:00:00.018','cmr34c7p50005ndimo6wdcsz5','APPROVED',0.00,'cmr2xthjw000nnddoa651alvh',NULL,'2026-07-02 22:00:00.005','2026-07-02 22:00:00.037',NULL,NULL,'每日定时智能建议自动生成','2026-07-02 22:00:00.019','2026-07-02 22:00:00.038'),('cmr41scgu000and7bh5fu9quz','PP202607030CVDZX-01','自动采购计划 2026-07-03（王小明）','MONTHLY','2026-07-02 22:00:00.030','2026-07-02 22:00:00.018','2026-08-01 22:00:00.018','cmr34c7p20003ndimfr7nzkzp','APPROVED',0.00,'cmr2xthjw000nnddoa651alvh',NULL,'2026-07-02 22:00:00.030','2026-07-02 22:00:00.030','cmr41scgj0001nd7bbk5tgz8d','cmr2xthn40014nddomdsrpif1','定时自动生成并分配','2026-07-02 22:00:00.030','2026-07-02 22:00:00.030'),('cmr41scgw000end7bt261hxf2','PP202607030CVDZX-02','自动采购计划 2026-07-03（吕永权）','MONTHLY','2026-07-02 22:00:00.032','2026-07-02 22:00:00.018','2026-08-01 22:00:00.018','cmr34c7p20003ndimfr7nzkzp','CONFIRMED',0.00,'cmr2xthjw000nnddoa651alvh',NULL,'2026-07-02 22:00:00.032','2026-07-02 22:00:00.032','cmr41scgj0001nd7bbk5tgz8d','cmr2xthn20010nddonsbyj3y7','定时自动生成并分配','2026-07-02 22:00:00.033','2026-07-03 07:32:49.231'),('cmr41scgy000jnd7bo66npf0m','PP202607030CVDZX-03','自动采购计划 2026-07-03（吴月新）','MONTHLY','2026-07-02 22:00:00.034','2026-07-02 22:00:00.018','2026-08-01 22:00:00.018','cmr34c7p50005ndimo6wdcsz5','CONFIRMED',0.00,'cmr2xthjw000nnddoa651alvh',NULL,'2026-07-02 22:00:00.034','2026-07-02 22:00:00.034','cmr41scgj0001nd7bbk5tgz8d','cmr2xthn30012nddoaxv9bdn9','定时自动生成并分配','2026-07-02 22:00:00.035','2026-07-03 01:34:42.928'),('cmr41sch0000nnd7b5fl67qnq','PP202607030CVDZX-04','自动采购计划 2026-07-03（于雷）','MONTHLY','2026-07-02 22:00:00.035','2026-07-02 22:00:00.018','2026-08-01 22:00:00.018','cmr34c7p50005ndimo6wdcsz5','APPROVED',0.00,'cmr2xthjw000nnddoa651alvh',NULL,'2026-07-02 22:00:00.035','2026-07-02 22:00:00.035','cmr41scgj0001nd7bbk5tgz8d','cmr3gzz1q0001ndfl9rlzmkuu','定时自动生成并分配','2026-07-02 22:00:00.036','2026-07-02 22:00:00.036'),('cmr4agp70000jndwpu37mswim','PP20260702X2PICL-01','销售计划测试1（吴月新）','MONTHLY','2026-07-03 02:02:53.195','2026-07-02 00:00:00.000','2026-08-01 00:00:00.000','cmr34c7p50005ndimo6wdcsz5','APPROVED',0.00,'cmr2xthjt000fnddogkor8u3s',NULL,'2026-07-03 02:02:53.195','2026-07-03 02:02:53.195','cmr3o164t0001nd8eentht9e0','cmr2xthn30012nddoaxv9bdn9','由父计划 PP20260702X2PICL 自动分配','2026-07-03 02:02:53.196','2026-07-03 02:02:53.196'),('cmr4cov700001ndsd1t8zjcp3','PP20260703PKPNE3','采购计划测试5','MONTHLY','2026-07-03 00:00:00.000',NULL,NULL,'cmr34c7oy0001ndimnx3t2ve5','APPROVED',0.00,'cmr2xthjt000fnddogkor8u3s','cmr2xthjt000fnddogkor8u3s','2026-07-03 03:05:26.330','2026-07-03 03:05:28.462',NULL,NULL,NULL,'2026-07-03 03:05:13.452','2026-07-03 03:05:28.463'),('cmr4cp6rt0005ndsd5epv1m4m','PP20260703PKPNE3-01','采购计划测试5（王小明）','MONTHLY','2026-07-03 03:05:28.456',NULL,NULL,'cmr34c7p20003ndimfr7nzkzp','APPROVED',0.00,'cmr2xthjt000fnddogkor8u3s',NULL,'2026-07-03 03:05:28.456','2026-07-03 03:05:28.456','cmr4cov700001ndsd1t8zjcp3','cmr2xthn40014nddomdsrpif1','由父计划 PP20260703PKPNE3 自动分配','2026-07-03 03:05:28.457','2026-07-03 03:05:28.457'),('cmr4dhqu90001ndpa9d832p6r','PP20260703ZRAQNB','采购计划测试6','MONTHLY','2026-07-03 00:00:00.000',NULL,NULL,'cmr34c7oy0001ndimnx3t2ve5','APPROVED',0.00,'cmr2xthjt000fnddogkor8u3s','cmr2xthjt000fnddogkor8u3s','2026-07-03 03:27:46.875','2026-07-03 03:27:48.972',NULL,NULL,NULL,'2026-07-03 03:27:40.834','2026-07-03 03:27:48.972'),('cmr4dhx480005ndpawj9yghok','PP20260703ZRAQNB-01','采购计划测试6（吴月新）','MONTHLY','2026-07-03 03:27:48.967',NULL,NULL,'cmr34c7p50005ndimo6wdcsz5','CONFIRMED',0.00,'cmr2xthjt000fnddogkor8u3s',NULL,'2026-07-03 03:27:48.967','2026-07-03 03:27:48.967','cmr4dhqu90001ndpa9d832p6r','cmr2xthn30012nddoaxv9bdn9','由父计划 PP20260703ZRAQNB 自动分配','2026-07-03 03:27:48.968','2026-07-03 06:49:50.451');
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
INSERT INTO `purchase_receipt_items` VALUES ('cmr3k9scj0008nd6oazs78tn4','cmr3k9sci0006nd6o45z3q34q','cmr3k9p680003nd6oiqv6dj25','cmr2xthna001hnddoq2ir1lmi',138,2.90,0.00,400.20,'INSPECTED','/uploads/qc/qc_1783000223566-579428904.jpg','cmr3kaqa9000bnd6ohrpqrkjy','CONFIRMED','2026-07-02 13:49:40.675',NULL),('cmr3k9scj0009nd6ohj0q3pp2','cmr3k9sci0006nd6o45z3q34q','cmr3k9p680004nd6o1l603h91','cmr2xthnd001lnddo195l3his',115,2.60,0.00,299.00,'INSPECTED','/uploads/qc/qc_1783000223814-130092151.jpg','cmr3kaqb5000lnd6oj9gt856e','CONFIRMED','2026-07-02 13:49:40.675',NULL),('cmr4a7ybq000dndwptw0lzk23','cmr4a7ybq000bndwprnaqwkue','cmr4a73350008ndwpk0o68td5','cmr2xthnd001knddoknxi4yza',110,3.00,0.00,330.00,'INSPECTED','/uploads/qc/qc_1783066603149-941739112.jpg','cmr527b6c0001ndgx5yl0zkzb','CONFIRMED','2026-07-03 01:56:05.126','cmr33sxut0004nd5sxslar4fc'),('cmr4a7ybq000endwp5tyswimu','cmr4a7ybq000bndwprnaqwkue','cmr4a73350009ndwpoedt9us2','cmr2xthnd001knddoknxi4yza',105,4.00,0.00,420.00,'INSPECTED','/uploads/qc/qc_1783067167336-233501999.jpg','cmr527b6x000bndgxkbkhcmqo','CONFIRMED','2026-07-03 01:56:05.126','cmr33tjoy0005nd5s3vyojdc4');
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
INSERT INTO `purchase_receipts` VALUES ('cmr3k9sci0006nd6o45z3q34q','RC20260702AH1I9B','cmr3k9p680001nd6o5gujwo9p','cmr2xthn50018nddo04mkwiar',NULL,NULL,'2026-07-02 13:50:24.709',0,0.00,0.00,0.00,NULL,NULL,'PENDING',NULL,'CONFIRMED','由采购订单 PO20260702OGNWYQ 批准下单自动生成','2026-07-02 13:49:40.675'),('cmr4a7ybq000bndwprnaqwkue','RC202607033KH55Y','cmr4a73350006ndwpgrhxeodr','cmr3ge20j000lnd8p225f4h4a',NULL,NULL,'2026-07-03 14:59:24.407',0,0.00,0.00,0.00,NULL,NULL,'PENDING',NULL,'CONFIRMED','由采购订单 PO20260703AOY9QV 批准下单自动生成','2026-07-03 01:56:05.126');
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
INSERT INTO `purchaser_assignments` VALUES ('cmr3h0qve0003ndflmkqcoewh','cmr3gzz1q0001ndfl9rlzmkuu',NULL,'ACTIVE','2026-07-02 12:18:40.010','2026-07-02 12:18:40.010'),('cmr3h0v4w0007ndflr47n0ekc','cmr2xthn30012nddoaxv9bdn9','','ACTIVE','2026-07-02 12:18:45.536','2026-07-03 02:02:46.665'),('cmr3h0z4k000bndfly7fyb20o','cmr2xthn20010nddonsbyj3y7',NULL,'ACTIVE','2026-07-02 12:18:50.708','2026-07-02 12:18:50.708'),('cmr3h14p1000gndfla9os4ypm','cmr2xthn40014nddomdsrpif1',NULL,'ACTIVE','2026-07-02 12:18:57.925','2026-07-02 12:18:57.925');
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
INSERT INTO `purchaser_material_items` VALUES ('cmr3h0qve0005ndflk5i52qqk','cmr3h0qve0003ndflmkqcoewh','cmr2xthnd001lnddo195l3his','2026-07-02 12:18:40.010'),('cmr3h0z4k000dndflh80twxn8','cmr3h0z4k000bndfly7fyb20o','cmr2xthnc001jnddoukeowtrs','2026-07-02 12:18:50.708'),('cmr3h0z4k000endflw7clqgi7','cmr3h0z4k000bndfly7fyb20o','cmr2xthnb001inddo1pkoxafx','2026-07-02 12:18:50.708'),('cmr3h14p1000indfl5qf8us2n','cmr3h14p1000gndfla9os4ypm','cmr2xthna001hnddoq2ir1lmi','2026-07-02 12:18:57.925'),('cmr4agk5l000gndwpoik1qo3a','cmr3h0v4w0007ndflr47n0ekc','cmr2xthnd001knddoknxi4yza','2026-07-03 02:02:46.665'),('cmr4agk5l000hndwpfoq4smu7','cmr3h0v4w0007ndflr47n0ekc','cmr3kfsrx000vnd6o1umreto3','2026-07-03 02:02:46.665');
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
INSERT INTO `sales_order_items` VALUES ('cmr3nvaz9001sndwtc89r1huf','cmr3nvaz9001qndwtmf3u4133','cmr2xthnd001lnddo195l3his',100,4.63,3.86,0.00,463.09,NULL,NULL,NULL,'2026-07-02 15:30:23.445',NULL),('cmr3nvaz9001tndwtmjf4cxom','cmr3nvaz9001qndwtmf3u4133','cmr2xthna001hnddoq2ir1lmi',100,4.60,3.65,0.00,459.53,NULL,NULL,NULL,'2026-07-02 15:30:23.445',NULL),('cmr50koe40001ndxmbop9y8l9','cmr4puo4d0001nd0ulv4heibv','cmr2xthna001hnddoq2ir1lmi',10,5.00,3.93,0.00,50.00,NULL,NULL,NULL,'2026-07-03 14:13:48.796','cmr33sdj00000nd5s1xplmjrd'),('cmr50kujt0005ndxm2xn22e6v','cmr4bmvmq000tndwpdmcpssvf','cmr2xthna001hnddoq2ir1lmi',1,4.95,3.93,0.00,4.95,NULL,NULL,NULL,'2026-07-03 14:13:56.776','cmr33siqr0001nd5sy6p0jicq');
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
  KEY `sales_orders_addressId_fkey` (`addressId`),
  KEY `sales_orders_warehouseId_fkey` (`warehouseId`),
  KEY `sales_orders_salesRepId_fkey` (`salesRepId`),
  KEY `sales_orders_approvedById_fkey` (`approvedById`),
  KEY `sales_orders_salesPlanId_fkey` (`salesPlanId`),
  KEY `sales_orders_contractId_fkey` (`contractId`),
  CONSTRAINT `sales_orders_addressId_fkey` FOREIGN KEY (`addressId`) REFERENCES `customer_addresses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
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
INSERT INTO `sales_orders` VALUES ('cmr3nvaz9001qndwtmf3u4133','SO20260702TRB1I4','cmr3gaizj000bnd8p9spuljz4',NULL,'cmr2xthn50018nddo04mkwiar','cmr2xthjt000fnddogkor8u3s',NULL,'2026-07-02 00:00:00.000','2026-07-04 00:00:00.000','STANDARD',NULL,'cmr3o32f80001ndrgla0ayqv4',1,922.63,0.00,922.63,NULL,'APPROVED',NULL,'2026-07-02 15:54:45.591',NULL,'2026-07-02 15:30:23.445','2026-07-02 15:54:45.616'),('cmr4bmvmq000tndwpdmcpssvf','SO20260703R0QB29','cmr3gaizj000bnd8p9spuljz4',NULL,'cmr2xthn50018nddo04mkwiar','cmr2xthjt000fnddogkor8u3s',NULL,'2026-07-03 00:00:00.000',NULL,'STANDARD',NULL,NULL,1,4.95,0.00,4.95,NULL,'PENDING_APPROVAL',NULL,NULL,'','2026-07-03 02:35:41.090','2026-07-03 14:13:56.776'),('cmr4puo4d0001nd0ulv4heibv','SO20260703P1FATP','cmr3g93ss0007nd8p609wbjfr',NULL,'cmr2xthn50018nddo04mkwiar','cmr2xthjt000fnddogkor8u3s',NULL,'2026-07-03 00:00:00.000',NULL,'STANDARD',NULL,NULL,1,50.00,0.00,50.00,NULL,'PENDING_APPROVAL',NULL,NULL,'','2026-07-03 09:13:39.230','2026-07-03 14:13:48.796');
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
INSERT INTO `sales_plan_items` VALUES ('cmr3mu1lm0001ndwtlists0vk','cmr3meh6q000endzosr7pj2cl','cmr3gaizj000bnd8p9spuljz4','cmr3kfsrx000vnd6o1umreto3',NULL,100,0.00,0,0.00,'2026-07-02 00:00:00.000',1,NULL,'2026-07-02 15:01:25.019','cmr33sxut0004nd5sxslar4fc'),('cmr4bkf5i000rndwpxxtti506','cmr4bjaox000nndwpytakjzrt','cmr3g9pa50009nd8pzx9u9qxv','cmr2xthna001hnddoq2ir1lmi',NULL,300,0.00,0,0.00,'2026-07-04 00:00:00.000',0,NULL,'2026-07-03 02:33:46.422','cmr33sdj00000nd5s1xplmjrd');
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
INSERT INTO `sales_plans` VALUES ('cmr3meh6q000endzosr7pj2cl','SP202607028HPVK4','管理员-2026年7月第1周-周计划','WEEKLY','2026-06-29 15:01:25.018','2026-07-05 15:01:25.018','cmr2xthjt000fnddogkor8u3s','cmr34c7oy0001ndimnx3t2ve5',0.00,0.00,0.00,'APPROVED','cmr2xthjt000fnddogkor8u3s','2026-07-02 15:34:34.091',NULL,'2026-07-02 14:49:18.722','2026-07-02 15:34:34.092'),('cmr4bjaox000nndwpytakjzrt','SP20260703KIQDHD','管理员-2026年7月第1周-周计划','WEEKLY','2026-06-29 02:33:46.420','2026-07-05 02:33:46.420','cmr2xthjt000fnddogkor8u3s','cmr34c7oy0001ndimnx3t2ve5',0.00,0.00,0.00,'PENDING',NULL,NULL,NULL,'2026-07-03 02:32:53.986','2026-07-03 02:33:46.422');
/*!40000 ALTER TABLE `sales_plans` ENABLE KEYS */;
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
INSERT INTO `shipping_order_items` VALUES ('cmr3ot1pl0003ndhpp4tt4q3k','cmr3oqn760001ndhphjcyyubp','cmr3nvaz9001sndwtc89r1huf','cmr2xthnd001lnddo195l3his',100,90,'2026-07-02 15:56:37.737','2026-07-02 15:56:37.737'),('cmr3ot1pn0005ndhpc5vsijdn','cmr3oqn760001ndhphjcyyubp','cmr3nvaz9001tndwtmjf4cxom','cmr2xthna001hnddoq2ir1lmi',100,100,'2026-07-02 15:56:37.739','2026-07-02 15:56:37.739');
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
  `salesOrderId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `shipping_orders_shippingNo_key` (`shippingNo`),
  UNIQUE KEY `shipping_orders_salesOrderId_key` (`salesOrderId`),
  KEY `shipping_orders_salesOrderId_idx` (`salesOrderId`),
  KEY `shipping_orders_customerId_fkey` (`customerId`),
  KEY `shipping_orders_addressId_fkey` (`addressId`),
  KEY `shipping_orders_warehouseId_fkey` (`warehouseId`),
  KEY `shipping_orders_logisticsProviderId_fkey` (`logisticsProviderId`),
  KEY `shipping_orders_vehicleId_fkey` (`vehicleId`),
  CONSTRAINT `shipping_orders_addressId_fkey` FOREIGN KEY (`addressId`) REFERENCES `customer_addresses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `shipping_orders_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `shipping_orders_logisticsProviderId_fkey` FOREIGN KEY (`logisticsProviderId`) REFERENCES `logistics_providers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `shipping_orders_salesOrderId_fkey` FOREIGN KEY (`salesOrderId`) REFERENCES `sales_orders` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `shipping_orders_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `shipping_orders_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipping_orders`
--

LOCK TABLES `shipping_orders` WRITE;
/*!40000 ALTER TABLE `shipping_orders` DISABLE KEYS */;
INSERT INTO `shipping_orders` VALUES ('cmr3oqn760001ndhphjcyyubp','SH20260702SM80MT','cmr3nvaz9001qndwtmf3u4133','cmr3gaizj000bnd8p9spuljz4',NULL,'cmr2xthn50018nddo04mkwiar','cmr3h9xwz000ondfl8m4liha1','cmr3hb8y4000sndflmrzulkpe',NULL,NULL,NULL,'2026-07-02 15:56:37.740',100.00,'PENDING','READY','SHIPPED','ARRANGED','西楼','上海',700.00,'','审批通过自动生成','2026-07-02 15:54:45.619','2026-07-02 15:56:37.741');
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
INSERT INTO `stock_locks` VALUES ('cmr3nvazg001vndwtedpqz79x','cmr2xthnd001lnddo195l3his','cmr2xthn50018nddo04mkwiar',50,'SALES_ORDER','cmr3nvaz9001qndwtmf3u4133','LOCKED',NULL,'2026-07-02 15:30:23.452',NULL),('cmr3nvazj001xndwt3ftgdstp','cmr2xthna001hnddoq2ir1lmi','cmr2xthn50018nddo04mkwiar',60,'SALES_ORDER','cmr3nvaz9001qndwtmf3u4133','LOCKED',NULL,'2026-07-02 15:30:23.455',NULL),('cmr4bmvmx000xndwp7qxabaa4','cmr2xthna001hnddoq2ir1lmi','cmr2xthn50018nddo04mkwiar',0,'SALES_ORDER','cmr4bmvmq000tndwpdmcpssvf','RELEASED',NULL,'2026-07-03 02:35:41.097','2026-07-03 14:13:56.769'),('cmr4puo4j0005nd0uf1k6wevq','cmr2xthna001hnddoq2ir1lmi','cmr2xthn50018nddo04mkwiar',6,'SALES_ORDER','cmr4puo4d0001nd0ulv4heibv','RELEASED',NULL,'2026-07-03 09:13:39.236','2026-07-03 09:17:24.700'),('cmr4pzi3s0009nd0uqbpwc7lq','cmr2xthna001hnddoq2ir1lmi','cmr2xthn50018nddo04mkwiar',6,'SALES_ORDER','cmr4puo4d0001nd0ulv4heibv','RELEASED',NULL,'2026-07-03 09:17:24.712','2026-07-03 09:17:31.396'),('cmr4pzn9o000dnd0uzek1ry6q','cmr2xthna001hnddoq2ir1lmi','cmr2xthn50018nddo04mkwiar',6,'SALES_ORDER','cmr4puo4d0001nd0ulv4heibv','RELEASED',NULL,'2026-07-03 09:17:31.405','2026-07-03 09:17:35.151'),('cmr4pzq60000hnd0ujac6gszt','cmr2xthna001hnddoq2ir1lmi','cmr2xthn50018nddo04mkwiar',6,'SALES_ORDER','cmr4puo4d0001nd0ulv4heibv','RELEASED',NULL,'2026-07-03 09:17:35.160','2026-07-03 14:10:20.055'),('cmr50g7c2000lnd0ul2mmbmk5','cmr2xthna001hnddoq2ir1lmi','cmr2xthn50018nddo04mkwiar',6,'SALES_ORDER','cmr4puo4d0001nd0ulv4heibv','RELEASED',NULL,'2026-07-03 14:10:20.067','2026-07-03 14:13:48.791'),('cmr50koea0003ndxmbh57yzer','cmr2xthna001hnddoq2ir1lmi','cmr2xthn50018nddo04mkwiar',6,'SALES_ORDER','cmr4puo4d0001nd0ulv4heibv','LOCKED',NULL,'2026-07-03 14:13:48.802',NULL),('cmr50kujz0007ndxm7nqwgp3j','cmr2xthna001hnddoq2ir1lmi','cmr2xthn50018nddo04mkwiar',0,'SALES_ORDER','cmr4bmvmq000tndwpdmcpssvf','LOCKED',NULL,'2026-07-03 14:13:56.784',NULL);
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
  `qty` int NOT NULL,
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
INSERT INTO `stock_movements` VALUES ('cmr3kaqak000fnd6o4jjuwc4x','SM20260702WKE7QU','cmr2xthn50018nddo04mkwiar',NULL,'cmr2xthna001hnddoq2ir1lmi','cmr3kaqa9000bnd6ohrpqrkjy','PURCHASE_RECEIPT','IN',138,'PURCHASE_RECEIPT','cmr3k9sci0006nd6o45z3q34q','cmr2xthjt000fnddogkor8u3s','采购入库 RC20260702AH1I9B','2026-07-02 13:50:24.667','2026-07-02 13:50:24.668',NULL),('cmr3kaqbe000pnd6oz464ao0w','SM202607024DEV93','cmr2xthn50018nddo04mkwiar',NULL,'cmr2xthnd001lnddo195l3his','cmr3kaqb5000lnd6oj9gt856e','PURCHASE_RECEIPT','IN',115,'PURCHASE_RECEIPT','cmr3k9sci0006nd6o45z3q34q','cmr2xthjt000fnddogkor8u3s','采购入库 RC20260702AH1I9B','2026-07-02 13:50:24.697','2026-07-02 13:50:24.698',NULL),('cmr3nizt2000endwtmwsjvasz','SM20260702QHNCUJ','cmr2xthn50018nddo04mkwiar',NULL,'cmr2xthna001hnddoq2ir1lmi',NULL,'STOCK_TAKE_ADJUST','OUT',8,'STOCK_TAKE','cmr3nid9k0009ndwtyg97dyvv','cmr2xthjt000fnddogkor8u3s','盘点调整 ST202607029CEW9L','2026-07-02 15:20:49.094','2026-07-02 15:20:49.094',NULL),('cmr3niztc000gndwtgklv6q36','SM20260702LUVO2M','cmr2xthn50018nddo04mkwiar',NULL,'cmr2xthnd001lnddo195l3his',NULL,'STOCK_TAKE_ADJUST','OUT',5,'STOCK_TAKE','cmr3nid9k0009ndwtyg97dyvv','cmr2xthjt000fnddogkor8u3s','盘点调整 ST202607029CEW9L','2026-07-02 15:20:49.103','2026-07-02 15:20:49.104',NULL),('cmr3ot1pt0007ndhpruc3am3h','OUT20260702U0FSRV','cmr2xthn50018nddo04mkwiar',NULL,'cmr2xthnd001lnddo195l3his',NULL,'SALES_OUTBOUND','OUT',90,'SHIPPING_ORDER','cmr3oqn760001ndhphjcyyubp','cmr2xthjt000fnddogkor8u3s','发货单 - SH20260702SM80MT（销售订单 SO20260702TRB1I4，实际装车90）','2026-07-02 15:56:37.744','2026-07-02 15:56:37.745',NULL),('cmr3ot1pv0009ndhpmqddvxwq','OUT20260702YS9ZDD','cmr2xthn50018nddo04mkwiar',NULL,'cmr2xthna001hnddoq2ir1lmi',NULL,'SALES_OUTBOUND','OUT',100,'SHIPPING_ORDER','cmr3oqn760001ndhphjcyyubp','cmr2xthjt000fnddogkor8u3s','发货单 - SH20260702SM80MT（销售订单 SO20260702TRB1I4，实际装车100）','2026-07-02 15:56:37.747','2026-07-02 15:56:37.748',NULL),('cmr3owh8b000undhpndzpk8z7','SM2026070210XSGB','cmr2xthn50018nddo04mkwiar',NULL,'cmr2xthna001hnddoq2ir1lmi',NULL,'STOCK_TAKE_ADJUST','OUT',2,'STOCK_TAKE','cmr3ouyjt000hndhp9iadi7nf','cmr2xthjt000fnddogkor8u3s','盘点调整 ST20260702NWXF7W','2026-07-02 15:59:17.819','2026-07-02 15:59:17.820',NULL),('cmr3owh8l000wndhpv9okqmdb','SM20260702PUN8M6','cmr2xthn50018nddo04mkwiar',NULL,'cmr2xthnd001lnddo195l3his',NULL,'STOCK_TAKE_ADJUST','OUT',1,'STOCK_TAKE','cmr3ouyjt000hndhp9iadi7nf','cmr2xthjt000fnddogkor8u3s','盘点调整 ST20260702NWXF7W','2026-07-02 15:59:17.828','2026-07-02 15:59:17.829',NULL),('cmr3pdk1t0006nd1rbj6ry0un','SM20260703HVCGT7','cmr2xthn50018nddo04mkwiar',NULL,'cmr2xthna001hnddoq2ir1lmi',NULL,'STOCK_TAKE_ADJUST','OUT',2,'STOCK_TAKE','cmr3pd3ja0001nd1ruyu0ewbm','cmr2xthjt000fnddogkor8u3s','盘点调整 ST20260703P8GR60','2026-07-02 16:12:34.624','2026-07-02 16:12:34.625',NULL),('cmr3pdk220008nd1rlr5xfyej','SM20260703LZWF2G','cmr2xthn50018nddo04mkwiar',NULL,'cmr2xthnd001lnddo195l3his',NULL,'STOCK_TAKE_ADJUST','OUT',2,'STOCK_TAKE','cmr3pd3ja0001nd1ruyu0ewbm','cmr2xthjt000fnddogkor8u3s','盘点调整 ST20260703P8GR60','2026-07-02 16:12:34.634','2026-07-02 16:12:34.634',NULL),('cmr527b6k0005ndgxz575rb5g','SM20260703RRKT6X','cmr3ge20j000lnd8p225f4h4a',NULL,'cmr2xthnd001knddoknxi4yza','cmr527b6c0001ndgx5yl0zkzb','PURCHASE_RECEIPT','IN',110,'PURCHASE_RECEIPT','cmr4a7ybq000bndwprnaqwkue','cmr2xthjt000fnddogkor8u3s','采购入库 RC202607033KH55Y','2026-07-03 14:59:24.380','2026-07-03 14:59:24.381','cmr33sxut0004nd5sxslar4fc'),('cmr527b73000fndgxh7mctkt0','SM202607036UYRIO','cmr3ge20j000lnd8p225f4h4a',NULL,'cmr2xthnd001knddoknxi4yza','cmr527b6x000bndgxkbkhcmqo','PURCHASE_RECEIPT','IN',105,'PURCHASE_RECEIPT','cmr4a7ybq000bndwprnaqwkue','cmr2xthjt000fnddogkor8u3s','采购入库 RC202607033KH55Y','2026-07-03 14:59:24.399','2026-07-03 14:59:24.400','cmr33tjoy0005nd5s3vyojdc4');
/*!40000 ALTER TABLE `stock_movements` ENABLE KEYS */;
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
INSERT INTO `stock_take_items` VALUES ('cmr3nid9k000bndwtysmm9xwc','cmr3nid9k0009ndwtyg97dyvv','cmr2xthna001hnddoq2ir1lmi',NULL,NULL,138,130,-8,'损耗','ADJUSTED','cmr2xthjt000fnddogkor8u3s','2026-07-02 15:20:45.353','2026-07-02 15:20:19.881',0,NULL),('cmr3nid9k000cndwtvbilwdc3','cmr3nid9k0009ndwtyg97dyvv','cmr2xthnd001lnddo195l3his',NULL,NULL,115,110,-5,'损耗','ADJUSTED','cmr2xthjt000fnddogkor8u3s','2026-07-02 15:20:45.357','2026-07-02 15:20:19.881',0,NULL),('cmr3ouyjt000jndhpov08t0b2','cmr3ouyjt000hndhp9iadi7nf','cmr2xthna001hnddoq2ir1lmi',NULL,NULL,30,28,-2,'损耗','ADJUSTED','cmr2xthjt000fnddogkor8u3s','2026-07-02 15:58:24.908','2026-07-02 15:58:06.953',0,NULL),('cmr3ouyjt000kndhpabbw8426','cmr3ouyjt000hndhp9iadi7nf','cmr2xthnd001lnddo195l3his',NULL,NULL,20,19,-1,'损耗','ADJUSTED','cmr2xthjt000fnddogkor8u3s','2026-07-02 15:58:24.911','2026-07-02 15:58:06.953',0,NULL),('cmr3pd3ja0003nd1resmhhr8w','cmr3pd3ja0001nd1ruyu0ewbm','cmr2xthna001hnddoq2ir1lmi',NULL,NULL,28,26,-2,'损耗','ADJUSTED','cmr2xthjt000fnddogkor8u3s','2026-07-02 16:12:30.930','2026-07-02 16:12:13.222',1,'cmr3pdnbu0009nd1rf6pqbd0e'),('cmr3pd3ja0004nd1rvddhycby','cmr3pd3ja0001nd1ruyu0ewbm','cmr2xthnd001lnddo195l3his',NULL,NULL,19,17,-2,'损耗','ADJUSTED','cmr2xthjt000fnddogkor8u3s','2026-07-02 16:12:30.935','2026-07-02 16:12:13.222',1,'cmr3pdncz000dnd1r886zt4ne');
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
INSERT INTO `stock_takes` VALUES ('cmr3nid9k0009ndwtyg97dyvv','ST202607029CEW9L','cmr2xthn50018nddo04mkwiar',NULL,'FULL','COMPLETED','2026-07-02 00:00:00.000','2026-07-02 15:20:49.108',2,2,'cmr2xthjt000fnddogkor8u3s',NULL,NULL,'2026-07-02 15:20:19.881','2026-07-02 15:20:49.109'),('cmr3ouyjt000hndhp9iadi7nf','ST20260702NWXF7W','cmr2xthn50018nddo04mkwiar',NULL,'FULL','COMPLETED','2026-07-02 00:00:00.000','2026-07-02 15:59:17.833',2,2,'cmr2xthjt000fnddogkor8u3s',NULL,NULL,'2026-07-02 15:58:06.953','2026-07-02 15:59:17.834'),('cmr3pd3ja0001nd1ruyu0ewbm','ST20260703P8GR60','cmr2xthn50018nddo04mkwiar',NULL,'FULL','COMPLETED','2026-07-02 00:00:00.000','2026-07-02 16:12:34.638',2,2,'cmr2xthjt000fnddogkor8u3s',NULL,NULL,'2026-07-02 16:12:13.222','2026-07-02 16:12:34.639');
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
INSERT INTO `suppliers` VALUES ('cmr2xthng001qnddo563z1k6b','S001','山东食用菌种植基地','刘经理','13700000001','山东省淄博市','6222000000000001',NULL,'ACTIVE','2026-07-02 03:21:08.764','2026-07-02 03:21:08.764'),('cmr2xthng001rnddow2i8glcm','S002','河南食用菌合作社','陈经理','13700000002','河南省郑州市','6222000000000002',NULL,'ACTIVE','2026-07-02 03:21:08.765','2026-07-02 03:21:08.765'),('cmr3gbk5o000cnd8p58qm36zh','SUP20260702001','遵化市瑞杨食用菌种植专业合作社','王五','15098948442','','',NULL,'ACTIVE','2026-07-02 11:59:04.909','2026-07-02 11:59:04.909'),('cmr3gcakq000dnd8p0ubha0s4','SUP20260702002','杭州市上城区五润堂数补穆生馆(个体工商户)','张晶','15904909404','','',NULL,'ACTIVE','2026-07-02 11:59:39.146','2026-07-02 11:59:39.146');
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
INSERT INTO `users` VALUES ('cmr2xthn1000ynddo30j8rp1j','admin','$2a$10$fTXwhBn1hR9wbQRjn0GPoe2dQ7V0OepNl4gz09z85cyevzCFNrzdW','cmr2xthjt000fnddogkor8u3s','SUPER_ADMIN','ACTIVE','2026-07-03 14:12:20.101','2026-07-02 03:21:08.749','2026-07-03 14:12:20.102'),('cmr2xthn20010nddonsbyj3y7','sales','$2a$10$zhiAhUv1TEWWge9jtkEbIOSZfFEqFmPryOFeFoL4ZtIY8mUuD/6ZK','cmr2xthjv000jnddonu24ysj6','FINANCE_MANAGER','ACTIVE','2026-07-03 07:31:30.440','2026-07-02 03:21:08.751','2026-07-03 07:31:30.441'),('cmr2xthn30012nddoaxv9bdn9','purchase','$2a$10$zhiAhUv1TEWWge9jtkEbIOSZfFEqFmPryOFeFoL4ZtIY8mUuD/6ZK','cmr2xthjw000nnddoa651alvh','PURCHASE_MANAGER','ACTIVE','2026-07-03 07:31:18.082','2026-07-02 03:21:08.751','2026-07-03 07:31:18.083'),('cmr2xthn40014nddomdsrpif1','warehouse','$2a$10$zhiAhUv1TEWWge9jtkEbIOSZfFEqFmPryOFeFoL4ZtIY8mUuD/6ZK','cmr2xthjx000rnddozqsby7nq','FINANCE_MANAGER','ACTIVE','2026-07-03 08:34:49.894','2026-07-02 03:21:08.752','2026-07-03 08:34:49.894'),('cmr2xthn40016nddo8vpdubg2','finance','$2a$10$zhiAhUv1TEWWge9jtkEbIOSZfFEqFmPryOFeFoL4ZtIY8mUuD/6ZK','cmr2xthjx000vnddoo256ase1','FINANCE_STAFF','ACTIVE',NULL,'2026-07-02 03:21:08.753','2026-07-02 03:21:08.753'),('cmr3gd40t000hnd8polpb5rfg','EMP013','portal-sso-auto-created','cmr34c7rd0012ndimkxyexxel','WAREHOUSE_STAFF','ACTIVE',NULL,'2026-07-02 12:00:17.309','2026-07-02 12:00:17.309'),('cmr3gzz1q0001ndfl9rlzmkuu','emp009','$2a$10$6uhl.c0qZPcqSRYkXtQ.4./fEC8gPar6InNKAkq1n3fBY2Fg55d.6','cmr34c7ra000mndimuel8s3dv','PURCHASE_MANAGER','ACTIVE','2026-07-03 01:41:23.332','2026-07-02 12:18:03.950','2026-07-03 01:41:23.333');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
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
INSERT INTO `vehicles` VALUES ('cmr3h8xjp000lndflyvweu7oc','cmr3h2o15000jndfl7qgszpnb','司机A','13578784779','鲁C12345','4M',NULL,'ACTIVE','2026-07-02 12:25:01.909','2026-07-02 12:25:01.909'),('cmr3h9g0j000nndflyqgt8olj','cmr3h2o15000jndfl7qgszpnb','司机B','13567894949','鲁C56789','7m',NULL,'ACTIVE','2026-07-02 12:25:25.843','2026-07-02 12:25:25.843'),('cmr3harth000qndfljnauwtvt','cmr3h9xwz000ondfl8m4liha1','司机C','15898983633','鲁A11111','4米',NULL,'ACTIVE','2026-07-02 12:26:27.797','2026-07-02 12:26:27.797'),('cmr3hb8y4000sndflmrzulkpe','cmr3h9xwz000ondfl8m4liha1','司机D','13567327633','鲁A22222','7米',NULL,'ACTIVE','2026-07-02 12:26:49.996','2026-07-02 12:26:49.996');
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
INSERT INTO `warehouse_locations` VALUES ('cmr2xthn8001enddoe92h8ij3','cmr2xthn6001anddojq861xza','cmr2xthn50018nddo04mkwiar','C-01-01','C-01-01','C0101','STANDARD',0,'ACTIVE','2026-07-02 03:21:08.756'),('cmr2xthn9001gnddo6xg71vqw','cmr2xthn7001cnddo4ye3mkom','cmr2xthn50018nddo04mkwiar','N-01-01','N-01-01','N0101','STANDARD',0,'ACTIVE','2026-07-02 03:21:08.757');
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
INSERT INTO `warehouse_zones` VALUES ('cmr2xthn6001anddojq861xza','cmr2xthn50018nddo04mkwiar','冷链区','COLD','COLD',1,'ACTIVE','2026-07-02 03:21:08.755'),('cmr2xthn7001cnddo4ye3mkom','cmr2xthn50018nddo04mkwiar','常温区','NORMAL','STORAGE',2,'ACTIVE','2026-07-02 03:21:08.755');
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
INSERT INTO `warehouses` VALUES ('cmr2xthn50018nddo04mkwiar','杭州总仓','WH01','杭州市余杭区','cmr2xthjx000rnddozqsby7nq','cmr3gd40t000hnd8polpb5rfg',1,'ACTIVE','2026-07-02 03:21:08.754','2026-07-02 12:00:17.312'),('cmr3gcz2h000fnd8pd9m94347','西楼仓','WH20260702001','山东省淄博淄川区西楼村',NULL,'cmr2xthn40014nddomdsrpif1',1,'ACTIVE','2026-07-02 12:00:10.889','2026-07-02 12:00:10.889'),('cmr3gdk25000jnd8pkxg7f1er','青岛平度仓','WH20260702002','山东省青岛市平度',NULL,'cmr2xthn40014nddomdsrpif1',1,'ACTIVE','2026-07-02 12:00:38.093','2026-07-02 12:00:41.684'),('cmr3ge20j000lnd8p225f4h4a','东海仓','WH20260702003','江苏省连云港东海',NULL,'cmr2xthn40014nddomdsrpif1',1,'ACTIVE','2026-07-02 12:01:01.363','2026-07-02 12:01:01.363');
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

-- Dump completed on 2026-07-03 23:23:14
