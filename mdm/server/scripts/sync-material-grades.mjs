#!/usr/bin/env node
/**
 * 物料-等级关联同步脚本
 * 从金蝶的 BOS_ASSISTANTDATA_DETAIL 拉取每个物料关联的等级值
 *
 * 数据结构：
 *   - BD_MATERIAL.FIDAuxProp 字段包含物料关联的辅助属性
 *   - BOS_ASSISTANTDATA_DETAIL 是辅助属性的具体值
 */

import dotenv from 'dotenv';
const envResult = dotenv.config({ override: true });
console.log('Loaded env vars:', envResult.parsed ? Object.keys(envResult.parsed).length : 0);
console.log('KINGDEE_ACCT_ID:', process.env.KINGDEE_ACCT_ID);

import { getKingdeeAdapter } from '../src/services/kingdee-adapter.js';
import prisma from '../src/prisma.js';

async function syncMaterialGrades() {
  const adapter = getKingdeeAdapter();
  console.log('开始同步物料等级关联...');

  // 1. 拉取所有物料
  console.log('1. 拉取物料数据...');
  const materials = await adapter._executeBillQuery(
    'BD_MATERIAL',
    'FNumber,FName',
    "FNumber like '0502%'"
  );
  console.log(`   共 ${materials.length} 条物料`);

  // 2. 拉取物料等级组下的所有等级
  console.log('2. 拉取物料等级...');
  const allGrades = await adapter._executeBillQuery(
    'BOS_ASSISTANTDATA_DETAIL',
    'FEntryID,FNumber,FDataValue,FID,FID.FNumber',
    "FID.FNUMBER='DJ' and FDocumentStatus='C' and FForbidStatus='A'"
  );
  console.log(`   共 ${allGrades.length} 条等级`);

  // 去重
  const seen = new Set();
  const gradeList = [];
  for (const g of allGrades) {
    if (!seen.has(g.FNumber)) {
      seen.add(g.FNumber);
      gradeList.push({ FNumber: g.FNumber, FName: g.FDataValue });
    }
  }
  console.log(`   去重后 ${gradeList.length} 条`);

  // 建立 物料编码 -> 等级数组 的映射
  // 实际关联由 View API/单据决定；这里默认每个物料可分配物料等级组下的全部等级
  const gradesByMaterial = new Map();
  for (const m of materials) {
    gradesByMaterial.set(m.FNumber, [...gradeList]);
  }

  // 2. 收集所有用到的辅助属性组 ID
  const auxPropIds = new Set();
  for (const m of materials) {
    const aux = m['FIDAuxProp'];
    if (aux) {
      const list = Array.isArray(aux) ? aux : [aux];
      for (const item of list) {
        const fid = item?.FID || item?.FPropID;
        if (fid) auxPropIds.add(String(fid));
      }
    }
  }
  console.log(`2. 共 ${auxPropIds.size} 个辅助属性组`);

  // 3. 拉取每个辅助属性组下的所有等级
  const gradesByGroup = new Map();
  for (const fid of auxPropIds) {
    try {
      const grades = await adapter._executeBillQuery(
        'BOS_ASSISTANTDATA_DETAIL',
        'FNumber,FDataValue,FID',
        `FID=${fid}`,
      );
      const seen = new Set();
      const unique = [];
      for (const g of grades) {
        if (!seen.has(g.FNumber)) {
          seen.add(g.FNumber);
          unique.push({ FNumber: g.FNumber, FName: g.FDataValue });
        }
      }
      gradesByGroup.set(fid, unique);
      console.log(`   组 ${fid}: ${unique.length} 个等级`);
    } catch (e) {
      console.log(`   组 ${fid} 拉取失败: ${e.message.substring(0, 100)}`);
    }
  }

  // 收集所有用到的辅助属性组 ID（保留作为参考，暂不调用）
  console.log(`3. 跳过辅助属性组反查（金蝶物料表 WebAPI 无 FIDAuxProp 字段）`);

  // 4. 更新每个物料的等级
  console.log('4. 更新物料等级...');
  let updated = 0;
  let failed = 0;

  // 准备等级查找映射
  const gradeMap = new Map();
  for (const g of gradeList) gradeMap.set(g.FNumber, g);

  // 按物料编码取物料组（050201 香菇、050202 平菇、050203 杏鲍菇...）
  // 预定义的物料-等级映射
  const groupToGrades = {
    '香菇': ['0201', '0202', '0203', '0211', '0212', '0213', '0214', '0221', '0222', '0223', '0224', '0225', '0226'],
    '花菇': ['0201', '0211', '0212', '0213', '0214'],
    '平菇': ['0100', '0101', '0102', '0103', '0291', '0292', '0293', '0294'],
    '杏鲍菇': ['0100', '0101', '0102', '0103', '0291', '0292', '0293', '0294', '0295'],
    '白玉菇': ['0100', '0101', '0102', '0103', '0291'],
    '蟹味菇': ['0100', '0101', '0102', '0291', '0292'],
    '海鲜菇': ['0100', '0101', '0102', '0291'],
    '金针菇': ['0100', '0101', '0102', '0103', '0291', '0292', '0293'],
    '灵芝': ['0100', '0101', '0102', '0291', '0292'],
    '舞茸菇': ['0100', '0101', '0102', '0291'],
    '黑木耳': ['0100', '0101', '0102', '0103'],
    '银耳': ['0100', '0101'],
    '猴头菇': ['0100', '0101', '0102', '0291'],
    '茶树菇': ['0100', '0101', '0102'],
    '鸡腿菇': ['0100', '0101', '0102'],
    '白灵菇': ['0100', '0101', '0102'],
    '草菇': ['0100', '0101', '0102'],
    '榆黄菇': ['0100', '0101', '0102'],
    '滑子菇': ['0100', '0101', '0102'],
    '灰树花': ['0100', '0101', '0102'],
    '牛排菇': ['0100', '0101', '0102'],
    '牛肚菌': ['0100', '0101', '0102'],
    '猪肚菌': ['0100', '0101', '0102'],
    '白参': ['0100', '0101', '0102'],
    '秀珍菇': ['0100', '0101', '0102'],
    '绣球菌': ['0100', '0101', '0102'],
    '松茸': ['0100', '0101', '0102'],
    '双孢菇': ['0100', '0101', '0102', '0291'],
    '国外其他品种': ['0601', '0602', '0603', '0604'],
    '快乐蘑菇园': ['0100', '0101', '0102', '0291', '0292', '0293', '0294', '0295', '0296', '0297', '0299'],
  };
  // 默认等级（覆盖所有公共等级）
  const defaultGrades = ['0100', '0101', '0102', '0103', '0291', '0292', '0293', '0294', '0295', '0296', '0297', '0299'];

  for (const m of materials) {
    try {
      // 先查物料组
      const existing = await prisma.kingdeeMasterData.findFirst({
        where: { entityType: 'material', code: m.FNumber },
      });
      if (!existing) continue;

      const extra = typeof existing.extra === 'string' ? JSON.parse(existing.extra) : (existing.extra || {});
      const groupName = extra.materialGroupName || '';

      // 找匹配的等级
      const gradeCodes = groupToGrades[groupName] || defaultGrades;
      const grades = gradeCodes
        .map(code => gradeMap.get(code))
        .filter(Boolean);

      extra.grades = grades;
      await prisma.kingdeeMasterData.update({
        where: { id: existing.id },
        data: { extra: JSON.stringify(extra) },
      });
      updated++;
    } catch (e) {
      failed++;
      console.log(`   ${m.FNumber} 更新失败: ${e.message.substring(0, 100)}`);
    }
  }

  console.log(`\n完成！更新 ${updated} 条，失败 ${failed} 条`);
  await prisma.$disconnect();
  process.exit(0);
}

syncMaterialGrades().catch(err => {
  console.error('同步失败:', err);
  process.exit(1);
});
