/**
 * 金蝶云星空定时同步调度器
 * 每天凌晨 3:00 自动执行全量同步
 */

import prisma from '../prisma.js';
import {
  pullCustomersFromKingdee,
  pullSuppliersFromKingdee,
  pullMaterialsFromKingdee,
  pullWarehousesFromKingdee,
  pullReceiveSendTypesFromKingdee,
  updateKingdeeSyncTime,
} from './kingdee-sync.js';
import { reLoginKingdee } from './kingdee-adapter.js';

const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 小时
const SYNC_HOUR = 3; // 凌晨 3 点
const SYNC_MINUTE = 0;

let timer = null;

/**
 * 执行一次金蝶全量同步
 */
async function runKingdeeSync() {
  console.log(`[Kingdee Scheduler] 开始定时同步 - ${new Date().toISOString()}`);

  const log = await prisma.syncLog.create({
    data: {
      syncType: 'KINGDEE_AUTO_SYNC',
      entityType: 'ALL',
      status: 'RUNNING',
    },
  });

  try {
    // 重新登录，防止 session 过期
    await reLoginKingdee();

    // 拉取金蝶基础数据
    const pullResults = {
      customers: await pullCustomersFromKingdee(),
      suppliers: await pullSuppliersFromKingdee(),
      materials: await pullMaterialsFromKingdee(),
      warehouses: await pullWarehousesFromKingdee(),
      receiveSendTypes: await pullReceiveSendTypesFromKingdee(),
    };

    const totalPull =
      (pullResults.customers.total || 0) +
      (pullResults.suppliers.total || 0) +
      (pullResults.materials.total || 0) +
      (pullResults.warehouses.total || 0) +
      (pullResults.receiveSendTypes.total || 0);
    const successCount =
      (pullResults.customers.created || 0) + (pullResults.customers.updated || 0) +
      (pullResults.suppliers.created || 0) + (pullResults.suppliers.updated || 0) +
      (pullResults.materials.created || 0) + (pullResults.materials.updated || 0) +
      (pullResults.warehouses.created || 0) + (pullResults.warehouses.updated || 0) +
      (pullResults.receiveSendTypes.created || 0) + (pullResults.receiveSendTypes.updated || 0);

    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: 'SUCCESS',
        totalRecords: totalPull,
        successCount,
        failedCount: 0,
        details: JSON.stringify({ pull: pullResults }),
        finishedAt: new Date(),
      },
    });

    await updateKingdeeSyncTime();
    console.log(`[Kingdee Scheduler] 同步完成 - 拉取 ${totalPull} 条`);
  } catch (err) {
    console.error(`[Kingdee Scheduler] 同步失败: ${err.message}`);
    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILED',
        details: err.message,
        finishedAt: new Date(),
      },
    });
  }
}

/**
 * 计算到下一次凌晨 3:00 的毫秒数
 */
function getDelayUntilNextSync() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(SYNC_HOUR, SYNC_MINUTE, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
}

/**
 * 启动定时同步
 */
export function startKingdeeScheduler() {
  // 先检查金蝶同步配置是否启用
  checkAndSchedule();

  // 每天检查一次配置状态
  setInterval(checkAndSchedule, SYNC_INTERVAL_MS);
}

async function checkAndSchedule() {
  try {
    const config = await prisma.syncConfig.findUnique({
      where: { systemCode: 'KINGDEE' },
    });

    if (config?.autoSync) {
      if (!timer) {
        const delay = getDelayUntilNextSync();
        console.log(
          `[Kingdee Scheduler] 下次同步: ${new Date(Date.now() + delay).toLocaleString('zh-CN')}`,
        );
        timer = setTimeout(() => {
          runKingdeeSync();
          // 之后每天执行一次
          timer = setInterval(runKingdeeSync, SYNC_INTERVAL_MS);
        }, delay);
      }
    } else {
      if (timer) {
        clearTimeout(timer);
        clearInterval(timer);
        timer = null;
        console.log('[Kingdee Scheduler] 自动同步已关闭');
      }
    }
  } catch (err) {
    console.error(`[Kingdee Scheduler] 检查配置失败: ${err.message}`);
  }
}

/**
 * 停止定时同步
 */
export function stopKingdeeScheduler() {
  if (timer) {
    clearTimeout(timer);
    clearInterval(timer);
    timer = null;
  }
}
