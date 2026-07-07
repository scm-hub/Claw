// 审批流核心引擎 — 流程启动、节点流转、审批动作、回调通知

import prisma from '../prisma.js';
import axios from 'axios';
import { BUSINESS_TYPE_SYSTEM, INSTANCE_STATUS, TASK_STATUS } from '../config/constants.js';
import { resolveNodeApprover } from './approverResolver.js';

/**
 * 发起审批流程
 * @param {Object} params - { businessType, system, objectId, objectNo, objectTitle, objectData, submitterId, submitterName, submitterEmail }
 */
export async function startFlow(params) {
  const { businessType, system, objectId, objectNo, objectTitle, objectData, submitterId, submitterName, submitterEmail } = params;

  // 1. 查找匹配的流程模板
  const template = await prisma.flowTemplate.findFirst({
    where: { businessType, isActive: true },
  });

  if (!template) {
    throw new Error(`未找到业务类型 "${businessType}" 的启用模板，请先配置流程模板`);
  }

  // 2. 检查同一单据是否已有进行中的流程
  const existing = await prisma.flowInstance.findFirst({
    where: { businessType, objectId, status: 'pending' },
  });
  if (existing) {
    throw new Error(`单据 "${objectNo || objectId}" 已有进行中的审批流程（实例 ${existing.id}）`);
  }

  // 3. 解析模板
  const rawNodes = JSON.parse(template.nodes);
  const { nodes, connections, isLegacy } = normalizeTemplate(rawNodes);
  if (!nodes || nodes.length === 0) {
    throw new Error(`模板 "${template.name}" 没有配置审批节点`);
  }

  // 4. 创建流程实例
  const instance = await prisma.flowInstance.create({
    data: {
      templateId: template.id,
      businessType,
      system: system || BUSINESS_TYPE_SYSTEM[businessType] || 'portal',
      objectId,
      objectNo: objectNo || '',
      objectTitle: objectTitle || '',
      objectData: objectData ? JSON.stringify(objectData) : null,
      submitterId,
      submitterName: submitterName || '',
      submitterEmail: submitterEmail || '',
      status: 'pending',
      currentNodeId: nodes[0].id,
      startAt: new Date(),
    },
  });

  // 5. 路由到第一个审批节点
  let firstNode = nodes[0];

  if (firstNode.type === 'condition') {
    if (!isLegacy && connections.length > 0) {
      // === 新格式：连线路由 ===
      const resolved = findConnection(connections, firstNode.id, instance);
      if (!resolved) {
        await prisma.flowInstance.update({
          where: { id: instance.id },
          data: { status: 'rejected', currentNodeId: null, finishedAt: new Date(), reason: '条件节点无匹配连线' },
        });
        return { instanceId: instance.id, status: 'rejected', message: '条件节点无匹配连线，流程已自动终止' };
      }
      if (resolved.to === 'end' || resolved.to === 'END') {
        await prisma.flowInstance.update({
          where: { id: instance.id },
          data: { status: 'approved', currentNodeId: null, finishedAt: new Date(), reason: '条件匹配结束' },
        });
        return { instanceId: instance.id, status: 'approved', message: '条件匹配结束，流程已完成' };
      }
      firstNode = nodes.find(n => n.id === resolved.to || n.nodeId === resolved.to);
      if (!firstNode) {
        throw new Error(`连线目标节点不存在: ${resolved.to}`);
      }
    } else {
      // === 旧格式：branches 路由 ===
      const resolved = resolveConditionNode(firstNode, instance, nodes);
      if (!resolved) {
        await prisma.flowInstance.update({
          where: { id: instance.id },
          data: { status: 'rejected', currentNodeId: null, finishedAt: new Date(), reason: `条件节点 "${firstNode.nodeName || firstNode.name}" 无匹配分支` },
        });
        return { instanceId: instance.id, status: 'rejected', message: '条件节点无匹配分支，流程已自动终止' };
      }
      firstNode = resolved;
    }

    // 更新 currentNodeId 为实际审批节点
    await prisma.flowInstance.update({
      where: { id: instance.id },
      data: { currentNodeId: firstNode.id },
    });
    instance.currentNodeId = firstNode.id;
  }

  if (firstNode.type === 'condition') {
    throw new Error(`条件分支链路过长或配置错误，请检查模板`);
  }

  // 6. 创建第一个审批节点的任务 + 通知
  const approvers = await resolveNodeApprover(firstNode, submitterId);

  const tasks = [];
  for (const approver of approvers) {
    const task = await prisma.flowTask.create({
      data: {
        instanceId: instance.id,
        nodeId: firstNode.id,
        nodeName: firstNode.name || firstNode.nodeName || `节点${firstNode.id}`,
        approverId: approver.id,
        approverName: approver.name || '',
        approverEmail: approver.email || '',
        status: 'pending',
        dueAt: firstNode.timeout ? new Date(Date.now() + firstNode.timeout * 3600000) : null,
      },
    });
    tasks.push(task);

    await prisma.flowNotification.create({
      data: {
        instanceId: instance.id,
        taskId: task.id,
        recipientId: approver.id,
        recipientEmail: approver.email || '',
        type: 'task_assigned',
        title: `待您审批：${objectTitle || objectNo || businessType}`,
        content: `${submitterName} 提交了 ${firstNode.name || firstNode.nodeName || businessType}，请您审批`,
      },
    });
  }

  return {
    instanceId: instance.id,
    status: instance.status,
    currentNodeId: instance.currentNodeId,
    currentNodeName: firstNode.name || firstNode.nodeName,
    tasks: tasks.map(t => ({ id: t.id, approverName: t.approverName, status: t.status })),
  };
}

/**
 * 审批通过
 */
export async function approveTask(taskId, approverComment, actionBy) {
  const task = await prisma.flowTask.findUnique({ where: { id: taskId } });
  if (!task) throw new Error('任务不存在');
  if (task.status !== 'pending') throw new Error(`任务状态为 "${task.status}"，无法审批`);
  if (task.approverId !== actionBy && task.delegatedTo !== actionBy) {
    throw new Error('您不是该任务的审批人');
  }

  const instance = await prisma.flowInstance.findUnique({
    where: { id: task.instanceId },
    include: { template: true },
  });
  if (!instance || instance.status !== 'pending') throw new Error('流程实例不存在或已结束');

  // 1. 更新任务状态
  await prisma.flowTask.update({
    where: { id: taskId },
    data: {
      status: 'approved',
      action: 'pass',
      comment: approverComment || '',
      actionAt: new Date(),
    },
  });

  // 2. 解析模板，判断当前节点是否全部通过
  const rawNodes = JSON.parse(instance.template.nodes);
  const { nodes, connections, isLegacy } = normalizeTemplate(rawNodes);
  const currentId = instance.currentNodeId;
  const currentNode = nodes.find(n => n.id === currentId || n.nodeId === currentId);
  const currentTasks = await prisma.flowTask.findMany({
    where: { instanceId: instance.id, nodeId: currentId },
  });

  // 检查当前节点是否完成
  const isNodeComplete = checkNodeComplete(currentNode, currentTasks);

  if (!isNodeComplete) {
    return {
      instanceId: instance.id,
      status: 'pending',
      currentNodeId: instance.currentNodeId,
      currentNodeName: currentNode?.name || currentNode?.nodeName || '',
      message: '当前节点还有其他审批人待审',
    };
  }

  // 3. 当前节点通过，查找下一节点
  let nextNode = null;
  let isEnd = false;

  if (!isLegacy && connections.length > 0) {
    // === 新格式：连线路由 ===
    const result = resolveByConnections(connections, currentId, nodes, instance);
    if (result.nodeId === 'end') {
      isEnd = true;
    } else {
      nextNode = result.node;
    }
  } else {
    // === 旧格式：顺序流转 + 条件分支 ===
    nextNode = getNextNode(nodes, currentNode, instance);
  }

  if (isEnd || !nextNode) {
    // 流程结束
    await prisma.flowInstance.update({
      where: { id: instance.id },
      data: {
        status: 'approved',
        currentNodeId: null,
        finishedAt: new Date(),
        reason: approverComment || '审批通过',
      },
    });

    await prisma.flowNotification.create({
      data: {
        instanceId: instance.id,
        recipientId: instance.submitterId,
        recipientEmail: instance.submitterEmail,
        type: 'completed',
        title: `审批通过：${instance.objectTitle || instance.objectNo}`,
        content: `您提交的 ${instance.objectTitle || instance.objectNo} 已审批通过`,
      },
    });

    await triggerCallback(instance, 'flow_approved', approverComment);

    return {
      instanceId: instance.id,
      status: 'approved',
      currentNodeId: null,
      message: '审批流程已通过',
    };
  }

  // 4. 流转到下一节点
  const nextNodeId = nextNode.id || nextNode.nodeId;
  await prisma.flowInstance.update({
    where: { id: instance.id },
    data: { currentNodeId: nextNodeId },
  });

  // 创建下一节点审批任务
  const nextApprover = await resolveNodeApprover(nextNode, instance.submitterId);
  const nextTasks = [];
  for (const approver of nextApprover) {
    const nt = await prisma.flowTask.create({
      data: {
        instanceId: instance.id,
        nodeId: nextNodeId,
        nodeName: nextNode.name || nextNode.nodeName || `节点${nextNodeId}`,
        approverId: approver.id,
        approverName: approver.name || '',
        approverEmail: approver.email || '',
        status: 'pending',
        dueAt: nextNode.timeout ? new Date(Date.now() + nextNode.timeout * 3600000) : null,
      },
    });
    nextTasks.push(nt);

    await prisma.flowNotification.create({
      data: {
        instanceId: instance.id,
        taskId: nt.id,
        recipientId: approver.id,
        recipientEmail: approver.email || '',
        type: 'task_assigned',
        title: `待您审批：${instance.objectTitle || instance.objectNo}`,
        content: `${instance.submitterName} 提交的 ${instance.objectTitle || instance.objectNo} 已通过 "${currentNode?.name || currentNode?.nodeName}"，请您审批`,
      },
    });
  }

  await triggerCallback(instance, 'node_approved', approverComment);

  return {
    instanceId: instance.id,
    status: 'pending',
    currentNodeId: nextNodeId,
    currentNodeName: nextNode.name || nextNode.nodeName,
    nextTasks: nextTasks.map(t => ({ id: t.id, approverName: t.approverName })),
    message: `已流转到 "${nextNode.name || nextNode.nodeName}"`,
  };
}

/**
 * 审批拒绝
 */
export async function rejectTask(taskId, rejectComment, actionBy, rejectTo = 'start') {
  const task = await prisma.flowTask.findUnique({ where: { id: taskId } });
  if (!task) throw new Error('任务不存在');
  if (task.status !== 'pending') throw new Error(`任务状态为 "${task.status}"，无法操作`);
  if (task.approverId !== actionBy && task.delegatedTo !== actionBy) {
    throw new Error('您不是该任务的审批人');
  }

  const instance = await prisma.flowInstance.findUnique({ where: { id: task.instanceId } });
  if (!instance || instance.status !== 'pending') throw new Error('流程实例不存在或已结束');

  // 更新任务
  await prisma.flowTask.update({
    where: { id: taskId },
    data: {
      status: 'rejected',
      action: 'reject',
      comment: rejectComment || '',
      actionAt: new Date(),
    },
  });

  // 拒绝 → 流程直接结束为 rejected
  // （如需支持"退回到指定节点重新审批"，可在此处实现）
  await prisma.flowInstance.update({
    where: { id: instance.id },
    data: {
      status: 'rejected',
      currentNodeId: null,
      finishedAt: new Date(),
      reason: rejectComment || '审批拒绝',
    },
  });

  // 通知发起人
  await prisma.flowNotification.create({
    data: {
      instanceId: instance.id,
      recipientId: instance.submitterId,
      recipientEmail: instance.submitterEmail,
      type: 'rejected',
      title: `审批拒绝：${instance.objectTitle || instance.objectNo}`,
      content: `${task.approverName} 拒绝了您提交的 ${instance.objectTitle || instance.objectNo}，原因：${rejectComment || '无'}`,
    },
  });

  // 回调子系统
  await triggerCallback(instance, 'flow_rejected', rejectComment);

  return {
    instanceId: instance.id,
    status: 'rejected',
    message: '审批流程已拒绝',
  };
}

/**
 * 发起人撤回（仅 pending 状态，且第一节点未操作时）
 */
export async function withdrawFlow(instanceId, actionBy) {
  const instance = await prisma.flowInstance.findUnique({
    where: { id: instanceId },
    include: { tasks: true },
  });
  if (!instance) throw new Error('流程实例不存在');
  if (instance.status !== 'pending') throw new Error(`流程状态为 "${instance.status}"，无法撤回`);
  if (instance.submitterId !== actionBy) throw new Error('只有发起人可以撤回');

  // 检查是否有已操作的审批任务（已有审批意见则不允许撤回）
  const actedTasks = instance.tasks.filter(t => t.status !== 'pending');
  if (actedTasks.length > 0) {
    throw new Error('已有审批人进行了操作，无法撤回。请联系审批人或管理员处理');
  }

  await prisma.flowInstance.update({
    where: { id: instanceId },
    data: {
      status: 'withdrawn',
      currentNodeId: null,
      finishedAt: new Date(),
      reason: '发起人撤回',
    },
  });

  // 通知所有待审人
  const pendingTasks = instance.tasks.filter(t => t.status === 'pending');
  for (const pt of pendingTasks) {
    await prisma.flowNotification.create({
      data: {
        instanceId: instanceId,
        taskId: pt.id,
        recipientId: pt.approverId,
        recipientEmail: pt.approverEmail,
        type: 'withdrawn',
        title: `流程已撤回：${instance.objectTitle || instance.objectNo}`,
        content: `${instance.submitterName} 撤回了 ${instance.objectTitle || instance.objectNo}`,
      },
    });
  }

  // 回调子系统
  await triggerCallback(instance, 'flow_withdrawn', '发起人撤回');

  return { instanceId, status: 'withdrawn', message: '流程已撤回' };
}

/**
 * 管理员撤销流程
 */
export async function cancelFlow(instanceId, reason) {
  const instance = await prisma.flowInstance.findUnique({ where: { id: instanceId } });
  if (!instance) throw new Error('流程实例不存在');
  if (instance.status !== 'pending') throw new Error(`流程状态为 "${instance.status}"，无法撤销`);

  await prisma.flowInstance.update({
    where: { id: instanceId },
    data: {
      status: 'cancelled',
      currentNodeId: null,
      finishedAt: new Date(),
      reason: reason || '管理员撤销',
    },
  });

  await triggerCallback(instance, 'flow_cancelled', reason);

  return { instanceId, status: 'cancelled', message: '流程已撤销' };
}

/**
 * 转审 — 将当前任务转给其他人
 */
export async function delegateTask(taskId, delegateToId, delegateToName, delegateToEmail, comment, actionBy) {
  const task = await prisma.flowTask.findUnique({ where: { id: taskId } });
  if (!task) throw new Error('任务不存在');
  if (task.status !== 'pending') throw new Error('任务已操作，无法转审');
  if (task.approverId !== actionBy) throw new Error('您不是该任务的审批人');

  // 创建新任务给被转审人
  const newTask = await prisma.flowTask.create({
    data: {
      instanceId: task.instanceId,
      nodeId: task.nodeId,
      nodeName: task.nodeName,
      approverId: delegateToId,
      approverName: delegateToName || '',
      approverEmail: delegateToEmail || '',
      status: 'pending',
      comment: `转审自 ${task.approverName}：${comment || ''}`,
    },
  });

  // 原任务标记为 delegated
  await prisma.flowTask.update({
    where: { id: taskId },
    data: {
      status: 'delegated',
      action: 'delegate',
      comment: comment || `转审给 ${delegateToName}`,
      delegatedTo: delegateToId,
      delegatedName: delegateToName,
      actionAt: new Date(),
    },
  });

  // 通知被转审人
  await prisma.flowNotification.create({
    data: {
      instanceId: task.instanceId,
      taskId: newTask.id,
      recipientId: delegateToId,
      recipientEmail: delegateToEmail || '',
      type: 'task_assigned',
      title: `转审给您：${task.instanceId}`,
      content: `${task.approverName} 将审批任务转审给您`,
    },
  });

  return {
    originalTaskId: taskId,
    newTaskId: newTask.id,
    delegatedTo: delegateToName,
    message: `已转审给 ${delegateToName}`,
  };
}

/**
 * 获取流程实例详情 + timeline
 */
export async function getFlowInstance(instanceId) {
  const instance = await prisma.flowInstance.findUnique({
    where: { id: instanceId },
    include: {
      template: true,
      tasks: { orderBy: { createdAt: 'asc' } },
      notifications: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!instance) throw new Error('流程实例不存在');

  const rawNodes = JSON.parse(instance.template.nodes);
  const { nodes, connections } = normalizeTemplate(rawNodes);

  return {
    ...instance,
    objectData: instance.objectData ? JSON.parse(instance.objectData) : null,
    nodes,
    connections: connections.length > 0 ? connections : undefined,
    timeline: instance.tasks.map(t => ({
      taskId: t.id,
      nodeId: t.nodeId,
      nodeName: t.nodeName,
      approverName: t.approverName,
      status: t.status,
      action: t.action,
      comment: t.comment,
      actionAt: t.actionAt,
      createdAt: t.createdAt,
    })),
  };
}

/**
 * 获取待审任务列表（按审批人）
 */
export async function getPendingTasks(approverId) {
  const tasks = await prisma.flowTask.findMany({
    where: { approverId, status: 'pending' },
    include: { instance: { include: { template: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return tasks.map(t => ({
    taskId: t.id,
    instanceId: t.instanceId,
    businessType: t.instance.businessType,
    system: t.instance.system,
    objectTitle: t.instance.objectTitle,
    objectNo: t.instance.objectNo,
    objectData: t.instance.objectData ? JSON.parse(t.instance.objectData) : null,
    submitterName: t.instance.submitterName,
    nodeId: t.nodeId,
    nodeName: t.nodeName,
    dueAt: t.dueAt,
    createdAt: t.createdAt,
  }));
}

/**
 * 获取已审任务列表（按审批人）
 */
export async function getDoneTasks(approverId) {
  const tasks = await prisma.flowTask.findMany({
    where: {
      approverId,
      status: { in: ['approved', 'rejected', 'delegated'] },
    },
    include: { instance: true },
    orderBy: { actionAt: 'desc' },
    take: 50,
  });

  return tasks.map(t => ({
    taskId: t.id,
    instanceId: t.instanceId,
    businessType: t.instance.businessType,
    objectTitle: t.instance.objectTitle,
    objectNo: t.instance.objectNo,
    nodeName: t.nodeName,
    status: t.status,
    action: t.action,
    comment: t.comment,
    actionAt: t.actionAt,
  }));
}

/**
 * 获取我发起的流程
 */
export async function getMyFlows(submitterId, status = null) {
  const where = { submitterId };
  if (status) where.status = status;

  const instances = await prisma.flowInstance.findMany({
    where,
    include: { template: true, tasks: true },
    orderBy: { startAt: 'desc' },
    take: 50,
  });

  return instances.map(i => ({
    instanceId: i.id,
    businessType: i.businessType,
    system: i.system,
    objectTitle: i.objectTitle,
    objectNo: i.objectNo,
    status: i.status,
    currentNodeId: i.currentNodeId,
    startAt: i.startAt,
    finishedAt: i.finishedAt,
    reason: i.reason,
    templateName: i.template.name,
    pendingTasks: i.tasks.filter(t => t.status === 'pending').length,
    totalTasks: i.tasks.length,
  }));
}

/**
 * 获取通知列表
 */
export async function getNotifications(recipientId, isRead = null) {
  const where = { recipientId };
  if (isRead !== null) where.isRead = isRead;

  return await prisma.flowNotification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

/**
 * 标记通知已读
 */
export async function markNotificationRead(notificationId) {
  return await prisma.flowNotification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

/**
 * 获取未读通知数量
 */
export async function getUnreadCount(recipientId) {
  return await prisma.flowNotification.count({
    where: { recipientId, isRead: false },
  });
}

// ============================================================
// 模板解析（支持新旧两种格式）
// ============================================================

/**
 * 标准化模板结构
 * 旧格式：nodes = [{ nodeId, ... }]
 * 新格式：nodes = { nodes: [{ id, ... }], connections: [{ from, to, condition }] }
 * @returns {{ nodes: Array, connections: Array, isLegacy: boolean }}
 */
function normalizeTemplate(templateNodes) {
  // 新格式：{ nodes: [...], connections: [...] }
  if (templateNodes && !Array.isArray(templateNodes) && templateNodes.nodes) {
    return {
      nodes: (templateNodes.nodes || []).map(n => ({ ...n, id: n.id || n.nodeId })),
      connections: templateNodes.connections || [],
      isLegacy: false,
    };
  }
  // 旧格式：扁平数组
  return {
    nodes: (Array.isArray(templateNodes) ? templateNodes : []).map(n => ({ ...n, id: n.id || n.nodeId })),
    connections: [],
    isLegacy: true,
  };
}

/**
 * 根据连线查找下一个节点
 * @param {Array} connections - 连线列表
 * @param {string} fromNodeId - 当前节点 ID
 * @param {Object} instance - 流程实例（含 objectData）
 * @returns {Object|null} { connection, targetNode } 或 null
 */
function findConnection(connections, fromNodeId, instance) {
  if (!connections || connections.length === 0) return null;
  const objectData = instance.objectData ? JSON.parse(instance.objectData) : {};
  for (const conn of connections) {
    if (conn.from !== fromNodeId) continue;
    if (evaluateCondition(conn.condition || 'default', objectData)) {
      console.log(`[Workflow] 连线匹配: ${fromNodeId} → ${conn.to} (${conn.condition || 'default'})`);
      return conn;
    }
  }
  return null;
}

/**
 * 通过连线查找目标节点
 * @returns {{ node: Object|null, nodeId: string|null }} 目标节点或结束标识
 */
function resolveByConnections(connections, fromNodeId, nodes, instance) {
  const conn = findConnection(connections, fromNodeId, instance);
  if (!conn) return { node: null, nodeId: null };
  if (conn.to === 'end' || conn.to === 'END') {
    console.log(`[Workflow] 连线指向结束: ${fromNodeId} → end`);
    return { node: null, nodeId: 'end' };
  }
  const target = nodes.find(n => n.id === conn.to || n.nodeId === conn.to);
  if (!target) {
    console.error(`[Workflow] 连线目标节点不存在: ${conn.to}`);
    return { node: null, nodeId: null };
  }
  return { node: target, nodeId: target.id };
}

// ============================================================
// 条件分支引擎
// ============================================================

/**
 * 安全的条件表达式求值器
 * @param {string} expr - 表达式，如 "marginRate >= 25", "default"
 * @param {Object} data - objectData 对象
 * @returns {boolean}
 */
function evaluateCondition(expr, data) {
  if (!expr || expr.trim() === 'default') return true;

  const trimmed = expr.trim();

  // 安全检查：只允许字母数字、比较符、逻辑符、括号、空格、小数点、下划线
  // eslint-disable-next-line no-useless-escape
  if (!/^[\w\d\.\s\(\)>=<!&|+\-*/%]+$/.test(trimmed)) {
    console.warn(`[Workflow] 条件表达式包含非法字符: ${trimmed}`);
    return false;
  }

  // 替换变量引用：marginRate → data.marginRate
  // 提取所有变量名（以字母开头的标识符，排除运算符关键字）
  const varNames = [...new Set(trimmed.match(/[a-zA-Z_]\w*/g) || [])];
  const validVars = [];

  for (const v of varNames) {
    // 跳过运算符关键字
    if (['true', 'false', 'null', 'undefined', 'typeof', 'instanceof', 'new', 'delete', 'void'].includes(v)) {
      continue;
    }
    if (data !== undefined && data !== null && Object.prototype.hasOwnProperty.call(data, v)) {
      validVars.push(v);
    } else if (data !== undefined && data !== null) {
      console.warn(`[Workflow] 条件表达式引用了未定义的变量: ${v}，上下文仅有: ${Object.keys(data).join(', ')}`);
    }
  }

  // 构建执行函数：只允许访问 data 对象的指定属性
  try {
    const safeData = {};
    for (const v of validVars) {
      safeData[v] = data[v];
    }
    const fn = new Function(...validVars, `"use strict"; return (${trimmed});`);
    return Boolean(fn(...validVars.map(v => safeData[v])));
  } catch (err) {
    console.error(`[Workflow] 条件表达式求值失败: ${trimmed}`, err.message);
    return false;
  }
}

/**
 * 解析条件分支节点，返回匹配的目标节点
 * @param {Object} conditionNode - 条件节点 { nodeId, nodeName, type: 'condition', branches: [...] }
 * @param {Object} instance - 流程实例（含 objectData）
 * @param {Array} nodes - 模板所有节点
 * @returns {Object|null} 匹配的目标节点，或 null
 */
function resolveConditionNode(conditionNode, instance, nodes) {
  if (!conditionNode || conditionNode.type !== 'condition') return null;

  const objectData = instance.objectData ? JSON.parse(instance.objectData) : {};
  const branches = conditionNode.branches || [];

  if (branches.length === 0) {
    console.warn(`[Workflow] 条件节点 "${conditionNode.nodeName}" 未配置分支`);
    return null;
  }

  // 按顺序匹配分支，命中第一个就停止
  for (const branch of branches) {
    const expr = (branch.condition || '').trim();
    if (evaluateCondition(expr, objectData)) {
      console.log(`[Workflow] 条件匹配: "${conditionNode.nodeName}" → "${branch.targetNodeName}"` + (expr ? ` (${expr})` : ' (default)'));

      // 保存匹配结果到实例
      setTimeout(async () => {
        try {
          await prisma.flowInstance.update({
            where: { id: instance.id },
            data: { currentNodeId: conditionNode.nodeId },
          });
        } catch { /* 异步更新，不阻塞主流程 */ }
      }, 0);

      // 查找目标节点
      const target = nodes.find(n => n.nodeName === branch.targetNodeName || n.nodeId === branch.targetNodeName);
      if (!target) {
        console.error(`[Workflow] 条件分支目标节点未找到: "${branch.targetNodeName}"`);
        return null;
      }
      return target;
    }
  }

  // 无匹配且无 default 分支
  console.warn(`[Workflow] 条件节点 "${conditionNode.nodeName}" 无匹配分支且无 default`);
  return null;
}

// ============================================================
// 内部辅助函数
// ============================================================

/**
 * 检查当前节点是否全部完成
 * 串行节点：任一通过即可流转
 * 会签节点：全部通过才流转
 * 或签节点：任一通过即可流转
 */
function checkNodeComplete(node, tasks) {
  const nodeType = node?.type || 'role';

  if (nodeType === 'countersign') {
    // 会签：全部通过
    return tasks.every(t => t.status === 'approved');
  }

  if (nodeType === 'any_sign') {
    // 或签：一人通过即可
    return tasks.some(t => t.status === 'approved');
  }

  // 条件分支节点不需要审批，始终视为完成
  if (nodeType === 'condition') return true;

  // 串行/角色/固定人员：该任务的审批人通过即可
  return tasks.some(t => t.status === 'approved');
}

/**
 * 获取下一个有效节点（自动跳过条件节点）
 */
function getNextNode(nodes, currentNode, instance) {
  if (!currentNode) return null;

  // 条件分支支持：nextNodeId 直接跳转
  if (currentNode.nextNodeId) {
    let next = nodes.find(n => n.nodeId === currentNode.nextNodeId);
    return _skipConditionNodes(next, nodes, instance);
  }

  // 默认：按顺序找下一个节点
  const currentIndex = nodes.findIndex(n => n.nodeId === currentNode.nodeId);
  if (currentIndex < nodes.length - 1) {
    let next = nodes[currentIndex + 1];
    return _skipConditionNodes(next, nodes, instance);
  }

  // 没有下一个节点 → 流程完成
  return null;
}

/**
 * 递归跳过条件节点，返回第一个非条件节点
 * 条件节点自动求值并路由
 */
function _skipConditionNodes(node, nodes, instance, depth = 0) {
  if (!node) return null;
  if (depth > 10) {
    console.warn('[Workflow] 条件分支链路过长（>10），返回第一个节点');
    return node;
  }

  if (node.type !== 'condition') return node;

  const resolved = resolveConditionNode(node, instance, nodes);
  if (!resolved) return null;

  return _skipConditionNodes(resolved, nodes, instance, depth + 1);
}

/**
 * 回调子系统
 */
async function triggerCallback(instance, event, comment) {
  // 查找该系统的回调配置
  const config = await prisma.flowCallbackConfig.findFirst({
    where: { system: instance.system, isActive: true },
  });

  if (!config) {
    console.log(`[Workflow] 无回调配置: system=${instance.system}, event=${event}`);
    return;
  }

  const payload = {
    event,
    instanceId: instance.id,
    objectId: instance.objectId,
    businessType: instance.businessType,
    objectNo: instance.objectNo,
    finalResult: instance.status,
    comment: comment || '',
    finishedAt: instance.finishedAt?.toISOString() || new Date().toISOString(),
  };

  // 记录回调日志
  const callback = await prisma.flowCallback.create({
    data: {
      instanceId: instance.id,
      event,
      callbackUrl: config.callbackUrl,
      requestBody: JSON.stringify(payload),
      status: 'pending',
    },
  });

  // 发起 HTTP POST 回调
  try {
    const resp = await axios.post(config.callbackUrl, payload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': config.secret || '',
      },
    });

    await prisma.flowCallback.update({
      where: { id: callback.id },
      data: {
        status: 'success',
        responseBody: JSON.stringify(resp.data),
      },
    });
    console.log(`[Workflow] 回调成功: ${config.callbackUrl} event=${event}`);
  } catch (err) {
    await prisma.flowCallback.update({
      where: { id: callback.id },
      data: {
        status: 'failed',
        errorMsg: err.message,
        retryCount: 0,
      },
    });
    console.error(`[Workflow] 回调失败: ${config.callbackUrl} error=${err.message}`);
  }
}

/**
 * 重试失败的回调
 */
export async function retryFailedCallbacks() {
  const failedCallbacks = await prisma.flowCallback.findMany({
    where: { status: 'failed', retryCount: { lt: 3 } },
    take: 20,
  });

  for (const cb of failedCallbacks) {
    const config = await prisma.flowCallbackConfig.findFirst({
      where: { system: 'scm', isActive: true }, // 简化：从 instance 推断
    });

    try {
      const payload = JSON.parse(cb.requestBody);
      const resp = await axios.post(cb.callbackUrl, payload, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      });

      await prisma.flowCallback.update({
        where: { id: cb.id },
        data: {
          status: 'success',
          responseBody: JSON.stringify(resp.data),
          retryCount: { increment: 1 },
        },
      });
    } catch (err) {
      await prisma.flowCallback.update({
        where: { id: cb.id },
        data: {
          retryCount: { increment: 1 },
          errorMsg: err.message,
        },
      });
    }
  }

  return failedCallbacks.length;
}
