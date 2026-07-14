// 异步同步任务管理器（以 sync_log 表为持久化存储，内存仅作临时进度补充）
import prisma from '../prisma.js';

const memoryTasks = new Map();

const STATUS_PRIORITY = {
  PENDING: 1,
  RUNNING: 2,
  PARTIAL: 3,
  SUCCESS: 4,
  FAILED: 4,
};

function getHigherStatus(a, b) {
  if (!a) return b;
  if (!b) return a;
  return (STATUS_PRIORITY[a] || 0) >= (STATUS_PRIORITY[b] || 0) ? a : b;
}

export async function createTask(syncType, entityType) {
  const log = await prisma.syncLog.create({
    data: {
      syncType,
      entityType: entityType.toUpperCase(),
      status: 'PENDING',
      totalRecords: 0,
      successCount: 0,
      failedCount: 0,
      details: '',
    },
  });
  memoryTasks.set(log.id, { status: 'PENDING' });
  return {
    id: log.id,
    type: log.syncType,
    entityType: log.entityType,
    status: 'PENDING',
    progress: 0,
    total: 0,
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
    result: null,
    error: null,
    startedAt: log.createdAt,
    finishedAt: null,
  };
}

export async function startTask(id) {
  const memory = memoryTasks.get(id);
  if (memory) memory.status = 'RUNNING';
  // 同步写入数据库，避免 PM2 多实例时内存状态不一致
  await prisma.syncLog.update({
    where: { id },
    data: { status: 'RUNNING' },
  });
  return getTask(id);
}

export async function updateTask(id, updates) {
  const memory = memoryTasks.get(id);
  if (memory) Object.assign(memory, updates);
  // 更新进度时，同时确保数据库状态为 RUNNING（幂等）
  await prisma.syncLog.update({
    where: { id },
    data: { status: 'RUNNING' },
  });
  return getTask(id);
}

export async function finishTask(id, result, status = 'SUCCESS') {
  const memory = memoryTasks.get(id);
  if (memory) {
    memory.status = status;
    memory.result = result;
  }
  const log = await prisma.syncLog.findUnique({ where: { id } });
  if (log) {
    const successCount = (result?.created || 0) + (result?.updated || 0);
    const failedCount = result?.failed || 0;
    const totalRecords = result?.total || 0;
    await prisma.syncLog.update({
      where: { id },
      data: {
        status,
        totalRecords,
        successCount,
        failedCount,
        details: JSON.stringify(result),
        finishedAt: new Date(),
      },
    });
  }
  return getTask(id);
}

export async function failTask(id, error) {
  const memory = memoryTasks.get(id);
  if (memory) {
    memory.status = 'FAILED';
    memory.error = typeof error === 'string' ? error : error?.message || '未知错误';
  }
  await prisma.syncLog.update({
    where: { id },
    data: {
      status: 'FAILED',
      details: typeof error === 'string' ? error : error?.message || '未知错误',
      finishedAt: new Date(),
    },
  });
  return getTask(id);
}

export async function getTask(id) {
  const log = await prisma.syncLog.findUnique({ where: { id } });
  if (!log) return null;
  const memory = memoryTasks.get(id) || {};
  const total = log.totalRecords || 0;
  const successCount = log.successCount || 0;
  const failedCount = log.failedCount || 0;
  const processed = successCount + failedCount;
  // 多实例安全：取 memory 和 DB 中更高级的状态，避免内存 PENDING 覆盖 DB SUCCESS
  const status = getHigherStatus(memory.status, log.status);
  return {
    id: log.id,
    type: log.syncType,
    entityType: log.entityType,
    status,
    progress: total > 0 ? Math.round((processed / total) * 100) : 0,
    total,
    processed,
    created: memory.created || 0,
    updated: memory.updated || 0,
    failed: failedCount,
    result: memory.result || null,
    error: memory.error || null,
    startedAt: log.createdAt,
    finishedAt: log.finishedAt,
  };
}

export async function getTasks(limit = 50) {
  const logs = await prisma.syncLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return logs.map((log) => {
    const memory = memoryTasks.get(log.id) || {};
    const total = log.totalRecords || 0;
    const processed = (log.successCount || 0) + (log.failedCount || 0);
    // 多实例安全：取更高级的状态
    const status = getHigherStatus(memory.status, log.status);
    return {
      id: log.id,
      type: log.syncType,
      entityType: log.entityType,
      status,
      progress: total > 0 ? Math.round((processed / total) * 100) : 0,
      total,
      processed,
      created: memory.created || 0,
      updated: memory.updated || 0,
      failed: log.failedCount || 0,
      result: memory.result || null,
      error: memory.error || null,
      startedAt: log.createdAt,
      finishedAt: log.finishedAt,
    };
  });
}
