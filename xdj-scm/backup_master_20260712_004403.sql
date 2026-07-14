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

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '67bba922-5a4b-11f1-a5a7-bf2478eb333d:1-3383959';

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
INSERT INTO `materials` VALUES ('cmr2xthna001hnddoq2ir1lmi','M001','香菇鲜品','300g/盒','斤','斤','盒',1.0000,0.6000,'grp-xg','鲜品',7,2.0,6.0,NULL,'ACTIVE',8.50,4.50,26.00,3,2.00,'2026-07-03 15:58:39.848','2026-07-02 03:21:08.758','2026-07-03 15:58:39.849',NULL,NULL,NULL),('cmr2xthnb001inddo1pkoxafx','M002','金针菇鲜品','200g/袋','斤','斤','袋',1.0000,0.4000,'grp-jzg','鲜品',10,2.0,6.0,NULL,'ACTIVE',3.50,1.80,15.00,3,0.00,NULL,'2026-07-02 03:21:08.759','2026-07-02 11:55:21.577',NULL,NULL,NULL),('cmr2xthnc001jnddoukeowtrs','M003','杏鲍菇鲜品','125g/袋','斤','斤','袋',1.0000,0.2500,'grp-xbg','鲜品',10,2.0,6.0,NULL,'ACTIVE',6.00,4.60,27.00,8,2.75,'2026-07-03 15:58:47.170','2026-07-02 03:21:08.760','2026-07-03 15:58:47.171',NULL,NULL,NULL),('cmr2xthnd001knddoknxi4yza','M004','干香菇','500g/袋','斤','斤','袋',1.0000,1.0000,'grp-gxg','干品',365,0.0,0.0,NULL,'ACTIVE',35.00,2.60,22.00,5,4.00,'2026-07-03 14:59:24.402','2026-07-02 03:21:08.761','2026-07-03 14:59:24.403',NULL,NULL,NULL),('cmr2xthnd001lnddo195l3his','M005','木耳干品','250g/袋','斤','斤','袋',1.0000,0.5000,'grp-me','干品',365,0.0,0.0,NULL,'ACTIVE',28.00,2.50,20.00,6,2.60,'2026-07-02 13:50:24.702','2026-07-02 03:21:08.762','2026-07-02 14:46:46.344',NULL,NULL,NULL),('cmr3kfsrx000vnd6o1umreto3','MAT20260702001','本来菇事金针菇','125g','斤','斤','盒',1.0000,0.2500,'grp-jzg','鲜品',3,0.0,0.0,NULL,'ACTIVE',0.00,5.40,25.00,3,2.10,'2026-07-05 14:25:57.598','2026-07-02 13:54:21.165','2026-07-05 14:25:57.599',NULL,NULL,NULL),('cmremit230004nd5b1jb8857u','MAT20260710001','榆黄菇',' 一级','千克','斤','斤',0.5000,0.5000,NULL,'',3,NULL,NULL,NULL,'ACTIVE',0.00,2.50,30.00,3,0.00,NULL,'2026-07-10 07:38:08.667','2026-07-10 07:38:08.667',NULL,NULL,'平菇');
/*!40000 ALTER TABLE `materials` ENABLE KEYS */;
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
INSERT INTO `material_groups` VALUES ('grp-gxg','GXG','干香菇','干品','干香菇系列产品','ACTIVE','2026-07-02 11:29:43.000','2026-07-06 01:33:22.615',NULL),('grp-jzg','JZG','金针菇','鲜品','金针菇系列产品','ACTIVE','2026-07-02 11:29:43.000','2026-07-02 11:29:43.000',NULL),('grp-me','ME','木耳','干品','木耳系列产品','ACTIVE','2026-07-02 11:29:43.000','2026-07-02 11:29:43.000',NULL),('grp-xbg','XBG','杏鲍菇','鲜品','杏鲍菇系列产品','ACTIVE','2026-07-02 11:29:43.000','2026-07-02 11:29:43.000',NULL),('grp-xg','XG','香菇','鲜品','香菇系列产品','ACTIVE','2026-07-02 11:29:43.000','2026-07-02 11:29:43.000',NULL);
/*!40000 ALTER TABLE `material_groups` ENABLE KEYS */;
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
INSERT INTO `material_grades` VALUES ('cmr33sdj00000nd5s1xplmjrd','MG20260702T01B10','花菇',NULL,0,'ACTIVE','2026-07-02 06:08:14.460','2026-07-06 01:24:27.519'),('cmr33siqr0001nd5sy6p0jicq','MG20260702ZS359B','一级',NULL,0,'ACTIVE','2026-07-02 06:08:21.220','2026-07-02 06:08:21.220'),('cmr33snmp0002nd5st5l05epq','MG202607020E7NQE','二级',NULL,0,'ACTIVE','2026-07-02 06:08:27.554','2026-07-02 06:08:27.554'),('cmr33ss3u0003nd5swzjxzjeo','MG2026070227TPPT','大片',NULL,0,'ACTIVE','2026-07-02 06:08:33.354','2026-07-02 06:08:33.354'),('cmr33sxut0004nd5sxslar4fc','MG20260702R8DPKS','40A',NULL,0,'ACTIVE','2026-07-02 06:08:40.806','2026-07-02 06:08:40.806'),('cmr33tjoy0005nd5s3vyojdc4','MG20260702JCXKPC','20B',NULL,0,'ACTIVE','2026-07-02 06:09:09.107','2026-07-02 06:09:09.107');
/*!40000 ALTER TABLE `material_grades` ENABLE KEYS */;
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
INSERT INTO `customers` VALUES ('cmr2xthne001nnddolp0hyhk2','C001','杭州生鲜超市','周经理','13900000001','杭州市西湖区','cmr2xthjv000jnddonu24ysj6',NULL,500000.00,30,'ACTIVE','2026-07-02 03:21:08.763','2026-07-02 03:21:08.763',NULL),('cmr2xthnf001pnddood5a6pht','C002','上海餐饮连锁','吴总','13900000002','上海市浦东新区','cmr2xthjv000jnddonu24ysj6',NULL,1000000.00,45,'ACTIVE','2026-07-02 03:21:08.763','2026-07-02 03:21:08.763',NULL),('cmr3g93ss0007nd8p609wbjfr','CUS20260702001','山东麦便利商业有限公司','戴安国','14588858884','','cmr2xthjw000nnddoa651alvh',NULL,1500000.00,30,'ACTIVE','2026-07-02 11:57:10.397','2026-07-05 14:01:22.239',NULL),('cmr3g9pa50009nd8pzx9u9qxv','CUS20260702002','青岛利群 ','张三','15800490400','','cmr2xthjx000rnddozqsby7nq',NULL,700000.00,30,'ACTIVE','2026-07-02 11:57:38.238','2026-07-05 14:01:14.998',NULL),('cmr3gaizj000bnd8p9spuljz4','CUS20260702003','庆云县俊成商厦','李四','15094994999','','cmr34c7ra000mndimuel8s3dv',NULL,3500.00,30,'ACTIVE','2026-07-02 11:58:16.735','2026-07-05 16:13:58.690',NULL),('cmrf8qh5y0001ndkb9exgoda1','CUS20260711001','四川-曹汝刚','','','',NULL,NULL,0.00,30,'ACTIVE','2026-07-10 17:59:58.054','2026-07-10 17:59:58.054',NULL);
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
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
INSERT INTO `inventory` VALUES ('cmr54bilf000bndczgrn2cghx','cmr2xthna001hnddoq2ir1lmi','cmr3ge20j000lnd8p225f4h4a',NULL,0.00,0.00,'2026-07-05 13:32:30.320'),('cmr54bo8q000lndczdv84ixbd','cmr2xthnc001jnddoukeowtrs','cmr3ge20j000lnd8p225f4h4a',NULL,0.00,0.00,'2026-07-08 13:31:54.573'),('cmr559ckj000hndt9vamm3k07','cmr3kfsrx000vnd6o1umreto3','cmr3gcz2h000fnd8pd9m94347',NULL,0.00,0.00,'2026-07-04 09:34:31.006'),('cmr7vw02g000bndtk2utrqdwb','cmr3kfsrx000vnd6o1umreto3','cmr3ge20j000lnd8p225f4h4a',NULL,0.00,0.00,'2026-07-08 13:31:54.567');
/*!40000 ALTER TABLE `inventory` ENABLE KEYS */;
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

-- Dump completed on 2026-07-12  0:44:03
