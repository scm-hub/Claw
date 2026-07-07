/**
 * 发货管理 — 智能拼车建议
 *
 * 算法流程：
 *   Step 1 — 拉取可拼车订单（shippingStatus=PENDING && logisticsStatus!=ARRANGED）
 *   Step 2 — 根据 shippingItem 估算每单重量(吨)/体积(m³)
 *   Step 3 — 按仓库分组（同一始发地）
 *   Step 4 — 组内按发货日期 ±1天 窗口分组
 *   Step 5 — 高德 API 计算最优路线 + 路线合并后的总距离
 *   Step 6 — 用车量约束过滤（如果指定了车辆）
 *   Step 7 — 多维度评分（路线重叠40% + 时间接近25% + 容量率20% + 同客户10% + 省里程5%）
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize, ROLES } from '../../middleware/rbac.js';
import prisma from '../../shared/prisma.js';

const router = Router();
router.use(authenticate);

// ============================================================
// 高德 API Key
// ============================================================
const AMAP_KEY = process.env.AMAP_KEY || '6565c50e114d45f004c60611406d099f';

// ============================================================
// 工具：高德驾车距离（strategy=2 距离最短）
// ============================================================
async function drivingDistance(originLng, originLat, destLng, destLat) {
  try {
    const url = `https://restapi.amap.com/v3/direction/driving?origin=${originLng},${originLat}&destination=${destLng},${destLat}&strategy=2&extensions=base&key=${AMAP_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.status === '1' && data.route?.paths?.[0]) {
      return Number(data.route.paths[0].distance) / 1000; // 米→公里
    }
    // 回退到 distance API
    const fallback = await fetch(
      `https://restapi.amap.com/v3/distance?origins=${originLng},${originLat}&destination=${destLng},${destLat}&type=1&key=${AMAP_KEY}`
    ).then(r => r.json());
    if (fallback.status === '1' && fallback.results?.length > 0) {
      return Math.round(Number(fallback.results[0].distance) / 10) / 100;
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================
// 工具：高德批量距离（供 route optimization 使用）
// ============================================================
async function batchDistances(points) {
  // points: [{lng, lat}, ...] — 返回 pairwise 距离矩阵
  const n = points.length;
  const matrix = Array.from({ length: n }, () => new Array(n).fill(null));

  // 高德批量距离 API：origins 用 | 分隔，但一次请求限制过多复杂度
  // 这里逐对查询（单组最多 6 点，即 15 对，可控）
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = await drivingDistance(points[i].lng, points[i].lat, points[j].lng, points[j].lat);
      matrix[i][j] = d;
      matrix[j][i] = d;
    }
  }
  return matrix;
}

// ============================================================
// 工具：最近邻路径贪心排序
// ============================================================
function nearestNeighborRoute(startIdx, matrix) {
  const n = matrix.length;
  const visited = new Set([startIdx]);
  const order = [startIdx];
  let current = startIdx;
  while (visited.size < n) {
    let bestIdx = -1, bestDist = Infinity;
    for (let j = 0; j < n; j++) {
      if (!visited.has(j) && matrix[current][j] != null && matrix[current][j] < bestDist) {
        bestDist = matrix[current][j];
        bestIdx = j;
      }
    }
    if (bestIdx === -1) break;
    visited.add(bestIdx);
    order.push(bestIdx);
    current = bestIdx;
  }
  return order;
}

// ============================================================
// POST /merge-suggestions — 生成智能拼车建议
// ============================================================
router.post('/merge-suggestions', authorize(ROLES.SUPER_ADMIN, ROLES.LOGISTICS_STAFF, ROLES.WAREHOUSE_MANAGER), async (req, res, next) => {
  try {
    const { dateFrom, dateTo, providerId, vehicleId, maxResults = 10 } = req.body;

    // ── 0. 读取车辆容量（如果指定） ──
    let vehicle = null;
    if (vehicleId) {
      vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    }

    // ── 1. 拉取可拼车订单 ──
    const where = {
      shippingStatus: 'PENDING',
      logisticsStatus: { not: 'ARRANGED' },
      isMerged: false,
    };
    if (dateFrom || dateTo) {
      where.shippingDate = {};
      if (dateFrom) where.shippingDate.gte = new Date(dateFrom);
      if (dateTo) where.shippingDate.lte = new Date(`${dateTo}T23:59:59`);
    }
    if (providerId) where.logisticsProviderId = providerId;

    const orders = await prisma.shippingOrder.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        address: { select: { id: true, destLng: true, destLat: true } },
        shippingItems: {
          include: {
            material: { select: { id: true, name: true, spec: true, unitVolume: true, unitWeight: true } },
          },
        },
      },
      orderBy: { shippingDate: 'asc' },
    });

    if (orders.length < 2) {
      return res.json({ success: true, data: { suggestions: [], totalSuggestions: 0, analyzedOrders: orders.length } });
    }

    // ── 2. 估算每单重量/体积 ──
    const enriched = orders.map(o => {
      let totalWeight = 0, totalVolume = 0;
      const itemDetails = [];
      for (const si of o.shippingItems) {
        const qty = si.actualQty || si.orderQty || 0;
        const uv = si.material?.unitVolume ? Number(si.material.unitVolume) : 0;
        const uw = si.material?.unitWeight ? Number(si.material.unitWeight) : 0;
        totalVolume += qty * uv;
        totalWeight += qty * uw;
        itemDetails.push({
          materialName: si.material?.name || '',
          qty,
          unitVolume: uv,
          unitWeight: uw,
        });
      }
      // 重量 kg → 吨
      totalWeight = totalWeight / 1000;
      // 取整到小数点后2位
      totalWeight = Math.round(totalWeight * 100) / 100;
      totalVolume = Math.round(totalVolume * 100) / 100;
      return {
        id: o.id,
        shippingNo: o.shippingNo,
        customerId: o.customer?.id,
        customerName: o.customer?.name || '',
        warehouseId: o.warehouse?.id,
        warehouseName: o.warehouse?.name || '',
        shippingDate: o.shippingDate ? o.shippingDate.toISOString().slice(0, 10) : '',
        origin: o.origin || o.warehouse?.name || '',
        destination: o.destination || '',
        transportCost: Number(o.transportCost) || 0,
        kilometers: Number(o.kilometers) || 0,
        addressLng: o.address?.destLng ? Number(o.address.destLng) : null,
        addressLat: o.address?.destLat ? Number(o.address.destLat) : null,
        totalWeight,
        totalVolume,
        itemDetails,
        status: o.status,
      };
    });

    // ── 3. 按仓库分组 ──
    const warehouseGroups = {};
    for (const e of enriched) {
      const key = e.warehouseId || '__no_warehouse__';
      if (!warehouseGroups[key]) warehouseGroups[key] = [];
      warehouseGroups[key].push(e);
    }

    // ── 4. 生成建议组 ──
    const suggestions = [];

    for (const [whId, group] of Object.entries(warehouseGroups)) {
      if (group.length < 2) continue;

      // 4a. 按发货日期 ±1天 子分组
      const dateGroups = [];
      const used = new Set();
      for (let i = 0; i < group.length; i++) {
        if (used.has(i)) continue;
        const cluster = [group[i]];
        used.add(i);
        const d1 = group[i].shippingDate;
        for (let j = i + 1; j < group.length; j++) {
          if (used.has(j)) continue;
          const d2 = group[j].shippingDate;
          if (!d1 || !d2) { cluster.push(group[j]); used.add(j); continue; }
          const diff = Math.abs(new Date(d1).getTime() - new Date(d2).getTime()) / (1000 * 60 * 60 * 24);
          if (diff <= 1) { cluster.push(group[j]); used.add(j); }
        }
        if (cluster.length >= 2) dateGroups.push(cluster);
      }

      // 4b. 对每个日期组进行方向分组
      for (const dg of dateGroups) {
        // 如果有坐标，按方向分组；否则直接作为一个组
        const withCoord = dg.filter(e => e.addressLng != null && e.addressLat != null);
        const withoutCoord = dg.filter(e => e.addressLng == null || e.addressLat == null);

        // 处理有坐标的：分为子两组比较方向
        if (withCoord.length >= 2) {
          // 计算方向向量，按方向相近度分组
          // 简化：取组内所有点计算 pairwise 距离，小于阈值则视为同方向
          const points = withCoord.map(e => ({ lng: e.addressLng, lat: e.addressLat }));
          const matrix = await batchDistances(points);

          // 贪心：每次取最相近的 2-5 个组成一个建议
          const usedIdx = new Set();
          for (let i = 0; i < withCoord.length; i++) {
            if (usedIdx.has(i)) continue;
            const cluster = [withCoord[i]];
            usedIdx.add(i);
            for (let j = 0; j < withCoord.length; j++) {
              if (usedIdx.has(j) || cluster.length >= 5) continue;
              // 如果 j 与 cluster 中任意点距离 < 300km，纳入同组
              const close = cluster.some(c => {
                const ci = withCoord.indexOf(c);
                return matrix[ci]?.[j] != null && matrix[ci][j] < 300;
              });
              if (close) { cluster.push(withCoord[j]); usedIdx.add(j); }
            }
            if (cluster.length >= 2) {
              suggestions.push({ cluster, matrix, withCoord });
            }
          }
        }

        // 无坐标的：如果 >= 2 个，作为一个独立建议（只按重量/体积匹配）
        if (withoutCoord.length >= 2) {
          suggestions.push({ cluster: withoutCoord, matrix: null, withCoord: [] });
        }
      }
    }

    // ── 5. 对每个建议组计算路线、容量、评分 ──
    const finalSuggestions = [];

    for (const { cluster, matrix, withCoord } of suggestions) {
      // 5a. 路线优化排序（对有坐标的）
      let routeOrder = [];
      let routeDesc = '';
      let totalKm = 0;
      let individualKmSum = 0;

      if (matrix && matrix.length >= 2) {
        const idxArr = cluster.map(e => withCoord.indexOf(e));
        const validIdx = idxArr.filter(i => i >= 0);
        // 最近邻贪心路径
        const nnOrder = nearestNeighborRoute(validIdx[0], matrix);
        routeOrder = nnOrder.map(i => withCoord[i]);

        // 计算合并路线总里程
        totalKm = 0;
        for (let i = 0; i < routeOrder.length - 1; i++) {
          const ci = withCoord.indexOf(routeOrder[i]);
          const cj = withCoord.indexOf(routeOrder[i + 1]);
          const d = matrix[ci]?.[cj];
          if (d != null) totalKm += d;
        }

        // 计算各自送达里程
        individualKmSum = 0;
        for (const e of cluster) {
          individualKmSum += e.kilometers || 0;
        }

        routeDesc = routeOrder.map(e => e.destination || e.customerName).join(' → ');
      } else {
        routeDesc = cluster.map(e => e.destination || e.customerName).join(' → ');
        totalKm = cluster.reduce((s, e) => s + (e.kilometers || 0), 0);
        individualKmSum = totalKm;
      }

      // 5b. 容量检查
      const totalWeight = cluster.reduce((s, e) => s + e.totalWeight, 0);
      const totalVolume = cluster.reduce((s, e) => s + e.totalVolume, 0);
      let capacityOk = true;
      let capacityNote = '';
      if (vehicle) {
        const maxW = vehicle.maxLoadWeight ? Number(vehicle.maxLoadWeight) : 0;
        const maxV = vehicle.maxLoadVolume ? Number(vehicle.maxLoadVolume) : 0;
        if (maxW > 0 && totalWeight > maxW) { capacityOk = false; capacityNote = `超载${(totalWeight - maxW).toFixed(1)}吨`; }
        if (maxV > 0 && totalVolume > maxV) { capacityOk = false; capacityNote += (capacityNote ? '，' : '') + `超容${(totalVolume - maxV).toFixed(1)}m³`; }
      }

      if (!capacityOk) continue; // 超载超容的直接跳过

      // 5c. 评分
      let score = 0;
      const reasons = [];

      // 路线重叠度（40%）
      if (individualKmSum > 0 && totalKm > 0) {
        const ratio = Math.min(individualKmSum / Math.max(totalKm, 1), 1);
        const routeScore = ratio * 40;
        score += routeScore;
        if (ratio >= 0.6) reasons.push('路线高度重叠');
        else if (ratio >= 0.3) reasons.push('路线部分重叠');
      }

      // 时间接近度（25%）
      const dates = cluster.map(e => e.shippingDate).filter(Boolean);
      if (dates.length >= 2) {
        const timestamps = dates.map(d => new Date(d).getTime());
        const maxDiff = Math.max(...timestamps) - Math.min(...timestamps);
        const dayDiff = maxDiff / (1000 * 60 * 60 * 24);
        const timeScore = Math.max(0, (1 - dayDiff / 3)) * 25;
        score += timeScore;
        if (dayDiff <= 0) reasons.push('同一天发货');
        else if (dayDiff <= 1) reasons.push('发货日期相近(1天内)');
      }

      // 容量利用率（20%）
      if (vehicle && vehicle.maxLoadWeight) {
        const maxW = Number(vehicle.maxLoadWeight);
        const util = maxW > 0 ? Math.min(totalWeight / maxW, 1) : 0;
        score += util * 20;
        if (util >= 0.7) reasons.push(`容量利用率高(${Math.round(util * 100)}%)`);
      } else {
        score += 15; // 无车辆数据，给默认分
      }

      // 同客户/同仓库（10%）
      const uniqueCustomers = new Set(cluster.map(e => e.customerId));
      if (uniqueCustomers.size < cluster.length) {
        score += 5;
        reasons.push('同一客户多单');
      }
      score += 5; // 同仓库固定加5分

      // 节省里程（5%）
      if (individualKmSum > 0 && totalKm < individualKmSum) {
        const saved = (individualKmSum - totalKm) / individualKmSum;
        score += saved * 5;
        if (saved >= 0.2) reasons.push(`节省里程${Math.round(saved * 100)}%`);
      }

      // 总运费
      const totalCost = cluster.reduce((s, e) => s + e.transportCost, 0);
      const costSaved = individualKmSum > 0
        ? Math.round(totalCost * (1 - totalKm / individualKmSum) * 100) / 100
        : 0;

      finalSuggestions.push({
        sourceOrders: cluster.map(e => ({
          id: e.id,
          shippingNo: e.shippingNo,
          customerId: e.customerId,
          customerName: e.customerName,
          destination: e.destination,
          estimatedWeight: e.totalWeight,
          estimatedVolume: e.totalVolume,
          shippingDate: e.shippingDate,
          transportCost: e.transportCost,
          kilometers: e.kilometers,
        })),
        totalWeight: Math.round(totalWeight * 100) / 100,
        totalVolume: Math.round(totalVolume * 100) / 100,
        totalKilometers: Math.round(totalKm * 100) / 100,
        estimatedCost: Math.round(totalCost * 100) / 100,
        costSaved: costSaved > 0 ? costSaved : 0,
        routeDesc,
        routeWaypoints: routeOrder.map(e => ({
          name: e.destination || e.customerName,
          lng: e.addressLng,
          lat: e.addressLat,
        })),
        matchScore: Math.round(score * 100) / 100,
        matchReasons: reasons,
        suggestedVehicle: vehicle ? {
          id: vehicle.id,
          plateNo: vehicle.plateNo,
          maxWeight: vehicle.maxLoadWeight ? Number(vehicle.maxLoadWeight) : 0,
          maxVolume: vehicle.maxLoadVolume ? Number(vehicle.maxLoadVolume) : 0,
          utilization: vehicle.maxLoadWeight ? Math.round(totalWeight / Number(vehicle.maxLoadWeight) * 100) : 0,
        } : null,
        warehouseName: cluster[0]?.warehouseName || '',
        capacityNote: capacityNote || undefined,
      });
    }

    // 按评分降序、取 top N
    finalSuggestions.sort((a, b) => b.matchScore - a.matchScore);
    const topN = finalSuggestions.slice(0, maxResults);

    // 保存建议记录
    const saved = [];
    for (const sug of topN) {
      const suggestionNo = `MS${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(saved.length + 1).padStart(3, '0')}`;
      const record = await prisma.mergeSuggestion.create({
        data: {
          suggestionNo,
          sourceOrderIds: sug.sourceOrders.map(o => o.id),
          totalWeight: sug.totalWeight,
          totalVolume: sug.totalVolume,
          totalKilometers: sug.totalKilometers,
          estimatedCost: sug.estimatedCost,
          costSaved: sug.costSaved,
          routeDesc: sug.routeDesc,
          matchScore: sug.matchScore,
          matchReasons: sug.matchReasons,
          status: 'PENDING',
        },
      });
      sug.id = record.id;
      sug.suggestionNo = record.suggestionNo;
      saved.push(sug);
    }

    res.json({
      success: true,
      data: {
        suggestions: saved,
        totalSuggestions: saved.length,
        analyzedOrders: enriched.length,
      },
    });
  } catch (err) { next(err); }
});

// ============================================================
// POST /merge — 确认合并
// ============================================================
router.post('/merge', authorize(ROLES.SUPER_ADMIN, ROLES.LOGISTICS_STAFF), async (req, res, next) => {
  try {
    const { sourceOrderIds, providerId, vehicleId, shippingDate, suggestionId } = req.body;
    if (!sourceOrderIds || sourceOrderIds.length < 2) {
      return res.status(400).json({ success: false, message: '至少需要2个发货单才能合并' });
    }

    // 1. 验证源单
    const sourceOrders = await prisma.shippingOrder.findMany({
      where: { id: { in: sourceOrderIds } },
      include: {
        customer: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        shippingItems: true,
      },
    });

    if (sourceOrders.length !== sourceOrderIds.length) {
      return res.status(400).json({ success: false, message: '部分发货单不存在' });
    }

    // 2. 汇总信息
    const totalTransportCost = sourceOrders.reduce((s, o) => s + Number(o.transportCost), 0);
    const totalKilometers = sourceOrders.reduce((s, o) => s + Number(o.kilometers || 0), 0);
    const warehouseId = sourceOrders[0].warehouseId;
    const customerId = sourceOrders[0].customerId;
    const destinations = sourceOrders.filter(o => o.destination).map(o => o.destination);
    const routeDesc = destinations.length > 0 ? destinations.join(' → ') : '合并发货';

    // 3. 费用按比例分摊到各源单（按运输费比例）
    const sourceCostSplit = {};
    if (totalTransportCost > 0) {
      for (const o of sourceOrders) {
        sourceCostSplit[o.id] = Number(o.transportCost);
      }
    }

    // 4. 生成合并发货单号
    const mergedCount = await prisma.shippingOrder.count({ where: { isMerged: true } });
    const mergedNo = `SH-M${String(mergedCount + 1).padStart(4, '0')}`;

    // 5. 创建合并发货单
    const mergedOrder = await prisma.shippingOrder.create({
      data: {
        shippingNo: mergedNo,
        customerId,
        warehouseId,
        logisticsProviderId: providerId || sourceOrders[0].logisticsProviderId,
        vehicleId: vehicleId || sourceOrders[0].vehicleId,
        shippingDate: shippingDate ? new Date(shippingDate) : sourceOrders[0].shippingDate,
        transportCost: totalTransportCost,
        kilometers: totalKilometers,
        origin: sourceOrders[0].origin || sourceOrders[0].warehouse?.name || '',
        destination: routeDesc,
        isMerged: true,
        mergedFromIds: sourceOrderIds,
        status: 'PENDING',
        shippingStatus: 'PENDING',
        stockingStatus: 'PENDING',
        logisticsStatus: 'PENDING',
        logisticsNotes: `合并${sourceOrders.length}单：${sourceOrders.map(o => o.shippingNo).join(', ')}`,
      },
    });

    // 6. 复制所有明细到合并单
    for (const src of sourceOrders) {
      for (const item of src.shippingItems) {
        await prisma.shippingOrderItem.create({
          data: {
            shippingOrderId: mergedOrder.id,
            salesOrderItemId: item.salesOrderItemId,
            materialId: item.materialId,
            orderQty: item.orderQty,
            actualQty: item.actualQty,
          },
        });
      }
    }

    // 7. 源单标记为已发货（按用户决策：合并后源单算发货）
    for (const id of sourceOrderIds) {
      await prisma.shippingOrder.update({
        where: { id },
        data: {
          shippingStatus: 'SHIPPED',
          status: 'SHIPPED',
        },
      });
    }

    // 8. 更新建议记录
    if (suggestionId) {
      await prisma.mergeSuggestion.update({
        where: { id: suggestionId },
        data: {
          status: 'CONFIRMED',
          mergedOrderId: mergedOrder.id,
          confirmedById: req.user?.id || req.user?.employeeId || '',
          confirmedAt: new Date(),
        },
      });
    }

    res.json({
      success: true,
      data: {
        mergedOrder: {
          id: mergedOrder.id,
          shippingNo: mergedOrder.shippingNo,
          isMerged: true,
          mergedFromIds: sourceOrderIds,
          totalTransportCost,
          sourceCostSplit,
        },
        message: `已合并${sourceOrders.length}个发货单为 ${mergedNo}`,
      },
    });
  } catch (err) { next(err); }
});

// ============================================================
// PUT /merge-suggestions/:id/ignore — 忽略建议
// ============================================================
router.put('/merge-suggestions/:id/ignore', authorize(ROLES.SUPER_ADMIN, ROLES.LOGISTICS_STAFF), async (req, res, next) => {
  try {
    await prisma.mergeSuggestion.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });
    res.json({ success: true, message: '已忽略该建议' });
  } catch (err) { next(err); }
});

// ============================================================
// GET /merge-suggestions — 历史建议列表
// ============================================================
router.get('/merge-suggestions', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, status = '' } = req.query;
    const where = {};
    if (status) where.status = status;
    const [list, total] = await Promise.all([
      prisma.mergeSuggestion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      prisma.mergeSuggestion.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

export default router;
