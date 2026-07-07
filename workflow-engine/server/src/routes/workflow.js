// 审批流程 API 路由

import express from 'express';
import { authenticate, internalAuth } from '../middleware/auth.js';
import * as wf from '../services/workflow.service.js';
import prisma from '../prisma.js';
import { SYSTEMS, SYSTEM_MODULES, MODULE_BUSINESS_TYPES } from '../config/constants.js';

const router = express.Router();

// ============================================================
// 子系统 + 模块映射（供前端级联选择）
// ============================================================
router.get('/system-modules', authenticate, async (req, res) => {
  try {
    const result = Object.entries(SYSTEMS).map(([code, sys]) => ({
      code,
      name: sys.name,
      modules: (SYSTEM_MODULES[code] || []).map(m => ({
        ...m,
        businessTypes: MODULE_BUSINESS_TYPES[m.code] || [],
      })),
    }));
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ============================================================
// 发起审批（子系统调用 或 Portal 前端调用）
// ============================================================
router.post('/start', internalAuth, async (req, res) => {
  try {
    const { businessType, system, objectId, objectNo, objectTitle, objectData, submitterId, submitterName, submitterEmail } = req.body;

    if (!businessType || !objectId) {
      return res.status(400).json({ success: false, message: 'businessType 和 objectId 必填' });
    }

    // 优先使用请求体中的提交人信息（内部服务调用），否则从 token 中解析
    const finalSubmitterId = submitterId || req.user?.globalId || req.user?.userId || '';
    const finalSubmitterName = submitterName || req.user?.name || '';
    const finalSubmitterEmail = submitterEmail || req.user?.email || '';

    const result = await wf.startFlow({
      businessType,
      system,
      objectId,
      objectNo,
      objectTitle,
      objectData,
      submitterId: finalSubmitterId,
      submitterName: finalSubmitterName,
      submitterEmail: finalSubmitterEmail,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Workflow] start error:', err.message);
    res.status(err.message.includes('未找到') ? 404 : 400).json({ success: false, message: err.message });
  }
});

// ============================================================
// 审批通过
// ============================================================
router.post('/tasks/:taskId/approve', authenticate, async (req, res) => {
  try {
    const { comment } = req.body;
    const { globalId, userId } = req.user;
    const result = await wf.approveTask(req.params.taskId, comment, globalId || userId);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Workflow] approve error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ============================================================
// 审批拒绝
// ============================================================
router.post('/tasks/:taskId/reject', authenticate, async (req, res) => {
  try {
    const { comment, rejectTo } = req.body;
    const { globalId, userId } = req.user;
    const result = await wf.rejectTask(req.params.taskId, comment, globalId || userId, rejectTo || 'start');
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Workflow] reject error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ============================================================
// 转审
// ============================================================
router.post('/tasks/:taskId/delegate', authenticate, async (req, res) => {
  try {
    const { delegateToId, delegateToName, delegateToEmail, comment } = req.body;
    const { globalId, userId } = req.user;
    const result = await wf.delegateTask(
      req.params.taskId,
      delegateToId, delegateToName, delegateToEmail, comment,
      globalId || userId
    );
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Workflow] delegate error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ============================================================
// 撤回流程（发起人）
// ============================================================
router.post('/withdraw/:instanceId', authenticate, async (req, res) => {
  try {
    const { globalId, userId } = req.user;
    const result = await wf.withdrawFlow(req.params.instanceId, globalId || userId);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Workflow] withdraw error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ============================================================
// 撤销流程（管理员）
// ============================================================
router.post('/cancel/:instanceId', authenticate, async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await wf.cancelFlow(req.params.instanceId, reason);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Workflow] cancel error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ============================================================
// 查询流程实例详情 + timeline
// ============================================================
router.get('/instance/:instanceId', authenticate, async (req, res) => {
  try {
    const result = await wf.getFlowInstance(req.params.instanceId);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Workflow] instance error:', err.message);
    res.status(404).json({ success: false, message: err.message });
  }
});

// ============================================================
// 待我审批
// ============================================================
router.get('/tasks/pending', authenticate, async (req, res) => {
  try {
    const { globalId, userId } = req.user;
    const result = await wf.getPendingTasks(globalId || userId);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Workflow] pending error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ============================================================
// 已处理的审批
// ============================================================
router.get('/tasks/done', authenticate, async (req, res) => {
  try {
    const { globalId, userId } = req.user;
    const result = await wf.getDoneTasks(globalId || userId);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Workflow] done error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ============================================================
// 我发起的流程
// ============================================================
router.get('/my-flows', authenticate, async (req, res) => {
  try {
    const { globalId, userId } = req.user;
    const { status } = req.query;
    const result = await wf.getMyFlows(globalId || userId, status || null);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Workflow] my-flows error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ============================================================
// 通知列表
// ============================================================
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const { globalId, userId } = req.user;
    const { isRead } = req.query;
    const result = await wf.getNotifications(globalId || userId, isRead === 'true' ? true : isRead === 'false' ? false : null);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Workflow] notifications error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ============================================================
// 标记通知已读
// ============================================================
router.post('/notifications/:id/read', authenticate, async (req, res) => {
  try {
    const result = await wf.markNotificationRead(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Workflow] mark-read error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ============================================================
// 未读通知数量
// ============================================================
router.get('/notifications/unread-count', authenticate, async (req, res) => {
  try {
    const { globalId, userId } = req.user;
    const count = await wf.getUnreadCount(globalId || userId);
    res.json({ success: true, data: { count } });
  } catch (err) {
    console.error('[Workflow] unread-count error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ============================================================
// 回调配置（管理）
// ============================================================
router.get('/callback-configs', authenticate, async (req, res) => {
  try {
    const configs = await prisma.flowCallbackConfig.findMany();
    res.json({ success: true, data: configs });
  } catch (err) {
    console.error('[Workflow] callback-configs error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/callback-configs', authenticate, async (req, res) => {
  try {
    const { system, callbackUrl, secret } = req.body;
    const config = await prisma.flowCallbackConfig.upsert({
      where: { system },
      create: { system, callbackUrl, secret },
      update: { callbackUrl, secret },
    });
    res.json({ success: true, data: config });
  } catch (err) {
    console.error('[Workflow] callback-config create error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ============================================================
// 流程模板管理
// ============================================================
router.get('/templates', authenticate, async (req, res) => {
  try {
    const templates = await prisma.flowTemplate.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: templates.map(t => ({
      ...t,
      nodes: JSON.parse(t.nodes),
      conditions: t.conditions ? JSON.parse(t.conditions) : null,
    })) });
  } catch (err) {
    console.error('[Workflow] templates error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/templates', authenticate, async (req, res) => {
  try {
    const { name, businessType, system, module, description, nodes, conditions } = req.body;
    if (!name || !businessType || !nodes || nodes.length === 0) {
      return res.status(400).json({ success: false, message: 'name、businessType、nodes 必填' });
    }

    const template = await prisma.flowTemplate.upsert({
      where: { businessType },
      create: {
        name,
        businessType,
        system: system || 'scm',
        module: module || '',
        description: description || '',
        nodes: JSON.stringify(nodes),
        conditions: conditions ? JSON.stringify(conditions) : null,
      },
      update: {
        name,
        system,
        module,
        description,
        nodes: JSON.stringify(nodes),
        conditions: conditions ? JSON.stringify(conditions) : null,
      },
    });

    res.json({ success: true, data: { ...template, nodes: JSON.parse(template.nodes) } });
  } catch (err) {
    console.error('[Workflow] template create error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/templates/:id', authenticate, async (req, res) => {
  try {
    const { name, description, nodes, conditions, isActive, system, module } = req.body;
    const template = await prisma.flowTemplate.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        system,
        module,
        nodes: nodes ? JSON.stringify(nodes) : undefined,
        conditions: conditions ? JSON.stringify(conditions) : undefined,
        isActive,
      },
    });
    res.json({ success: true, data: { ...template, nodes: JSON.parse(template.nodes) } });
  } catch (err) {
    console.error('[Workflow] template update error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/templates/:id', authenticate, async (req, res) => {
  try {
    await prisma.flowTemplate.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: '模板已停用' });
  } catch (err) {
    console.error('[Workflow] template delete error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
