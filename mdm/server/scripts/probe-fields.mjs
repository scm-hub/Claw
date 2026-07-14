#!/usr/bin/env node
/**
 * 查询辅助资料表字段结构
 */
import dotenv from 'dotenv';
dotenv.config({ override: true });

import { getKingdeeAdapter } from '../src/services/kingdee-adapter.js';

const a = getKingdeeAdapter();
await a.client.login();

const r = await a._executeBillQuery(
  'BOS_ASSISTANTDATA_DETAIL',
  'FEntryID,FNumber,FDataValue,FID,FID.FNumber,FMaterialID,FMaterialID.FNumber,FMaterialId,FMaterialId.FNumber,FMaterialName,FMATERIALNUMBER,FOrgId',
  "FID.FNUMBER='DJ'",
  '0', '5'
);
console.log('返回条数:', r.length);
if (r[0]) {
  console.log('字段名: 值');
  for (const k of Object.keys(r[0])) {
    console.log('  ' + k + ': ' + JSON.stringify(r[0][k]).substring(0, 100));
  }
}
process.exit(0);
