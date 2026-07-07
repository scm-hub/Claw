// workflow-engine 审批回调接口
// workflow-engine 审批完成后回调 SCM，通知审批结果

import { Router } from 'express';
import prisma from '../../shared/prisma.js';

const router = Router();

// 内部回调密钥（与 workflow-engine flow_callback_config.secret 一致）
const INTERNAL_SECRET = process.env.WORKFLOW_CALLBACK_SECRET || 'xdj-internal-api-secret-2026';

function genNo(prefix) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${ymd}${rand}`;
}

/**
 * POST /api/workflow/callback
 * workflow-engine 审批流完成后回调此接口
 * payload: { event, instanceId, objectId, businessType, objectNo, finalResult, comment, finishedAt }
 */
router.post('/callback', async (req, res, next) => {
  try {
    // 验证内部调用密钥
    const secret = req.headers['x-internal-secret'];
    if (secret !== INTERNAL_SECRET) {
      return res.status(403).json({ success: false, message: '内部回调密钥验证失败' });
    }

    const { event, instanceId, objectId, businessType, objectNo, finalResult, comment, finishedAt } = req.body;

    console.log(`[Workflow Callback] event=${event}, businessType=${businessType}, objectId=${objectId}, finalResult=${finalResult}`);

    // 只处理 sales_order 类型
    if (businessType === 'sales_order') {
      const order = await prisma.salesOrder.findUnique({ where: { id: objectId } });
      if (!order) {
        console.warn(`[Workflow Callback] 销售订单不存在: ${objectId}`);
        return res.json({ success: true, message: '订单不存在，回调已接收' });
      }

      if (event === 'flow_approved') {
        // 审批通过 → 改状态为 APPROVED + 生成发货单
        const updated = await prisma.salesOrder.update({
          where: { id: objectId },
          data: {
            status: 'APPROVED',
            approvedAt: new Date(finishedAt || Date.now()),
            workflowInstanceId: instanceId,
          },
        });

        // 自动生成发货单（如果尚未存在）
        const existingShipping = await prisma.shippingOrder.findUnique({ where: { salesOrderId: objectId } });
        if (!existingShipping) {
          await prisma.shippingOrder.create({
            data: {
              shippingNo: genNo('SH'),
              salesOrderId: objectId,
              customerId: order.customerId,
              addressId: order.addressId || null,
              warehouseId: order.warehouseId,
              status: 'PENDING',
              notes: '审批通过自动生成',
            },
          });
        }

        console.log(`[Workflow Callback] 销售订单 ${order.orderNo} 审批通过`);
      } else if (event === 'flow_rejected') {
        // 审批拒绝 → 改状态为 REJECTED
        await prisma.salesOrder.update({
          where: { id: objectId },
          data: {
            status: 'REJECTED',
            workflowInstanceId: instanceId,
          },
        });

        console.log(`[Workflow Callback] 销售订单 ${order.orderNo} 审批拒绝`);
      } else if (event === 'flow_withdrawn' || event === 'flow_cancelled') {
        // 撤回/取消 → 状态回到 PENDING_APPROVAL
        await prisma.salesOrder.update({
          where: { id: objectId },
          data: {
            status: 'PENDING_APPROVAL',
            workflowInstanceId: null,
          },
        });

        console.log(`[Workflow Callback] 销售订单 ${order.orderNo} 流程${event === 'flow_withdrawn' ? '撤回' : '取消'}`);
      } else if (event === 'node_approved') {
        // 节点通过（中间状态），不做状态变更，仅记录
        console.log(`[Workflow Callback] 销售订单 ${order.orderNo} 节点通过，继续流转`);
      }
    }

    res.json({ success: true, message: '回调已处理' });
  } catch (err) {
    console.error('[Workflow Callback Error]', err);
    next(err);
  }
});

export default router;
