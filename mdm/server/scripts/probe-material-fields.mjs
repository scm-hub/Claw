#!/usr/bin/env node
/**
 * 查询物料表字段结构
 */
import dotenv from 'dotenv';
dotenv.config({ override: true });

import { getKingdeeAdapter } from '../src/services/kingdee-adapter.js';

const a = getKingdeeAdapter();
await a.client.login();

const r = await a._executeBillQuery(
  'BD_MATERIAL',
  'FNumber,FName,FIDAuxProp',
  "FNumber like '0502%'",
  '0', '3'
);
console.log('返回条数:', r.length);
if (r[0]) {
  console.log('字段名: 值');
  for (const k of Object.keys(r[0])) {
    console.log('  ' + k + ': ' + JSON.stringify(r[0][k]).substring(0, 100));
  }
}
process.exit(0);
