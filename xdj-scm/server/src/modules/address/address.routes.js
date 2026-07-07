import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize, ROLES } from '../../middleware/rbac.js';
import prisma from '../../shared/prisma.js';

const router = Router();
router.use(authenticate);

// ============================================================
// ⚠️ 高德地图 Web API Key — 请替换为你的实际 Key
// ============================================================
const AMAP_KEY = process.env.AMAP_KEY || '6565c50e114d45f004c60611406d099f'; // Web服务 Key

// ============================================================
// 地址列表（分页 + 搜索）
// ============================================================
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 50, keyword = '', status = '' } = req.query;
    const where = {};
    if (keyword) {
      where.OR = [
        { originName: { contains: keyword } },
        { originAddress: { contains: keyword } },
        { destName: { contains: keyword } },
        { destAddress: { contains: keyword } },
      ];
    }
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      prisma.address.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.address.count({ where }),
    ]);

    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// ============================================================
// 新增地址
// ============================================================
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.SALES_MANAGER, ROLES.LOGISTICS_STAFF), async (req, res, next) => {
  try {
    const { originName, originAddress, originLng, originLat, destName, destAddress, destLng, destLat, distance, remark } = req.body;
    if (!originName || !originAddress || !destName || !destAddress) {
      return res.status(400).json({ success: false, message: '起始地名称/地址和目的地名称/地址为必填' });
    }

    const record = await prisma.address.create({
      data: {
        title: `${originName}至${destName}`,
        originName, originAddress,
        originLng: originLng || null,
        originLat: originLat || null,
        destName, destAddress,
        destLng: destLng || null,
        destLat: destLat || null,
        distance: distance !== undefined && distance !== '' ? Number(distance) : null,
        remark: remark || null,
      },
    });

    res.json({ success: true, data: record });
  } catch (err) { next(err); }
});

// ============================================================
// 编辑地址
// ============================================================
router.put('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.SALES_MANAGER, ROLES.LOGISTICS_STAFF), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { originName, originAddress, originLng, originLat, destName, destAddress, destLng, destLat, distance, status, remark } = req.body;

    // 先取已有记录用于拼接 title
    const existing = await prisma.address.findUnique({ where: { id }, select: { originName: true, destName: true } });
    if (!existing) return res.status(404).json({ success: false, message: '地址不存在' });

    const record = await prisma.address.update({
      where: { id },
      data: {
        title: `${originName || existing.originName}至${destName || existing.destName}`,
        ...(originName !== undefined && { originName }),
        ...(originAddress !== undefined && { originAddress }),
        ...(originLng !== undefined && { originLng: originLng || null }),
        ...(originLat !== undefined && { originLat: originLat || null }),
        ...(destName !== undefined && { destName }),
        ...(destAddress !== undefined && { destAddress }),
        ...(destLng !== undefined && { destLng: destLng || null }),
        ...(destLat !== undefined && { destLat: destLat || null }),
        ...(distance !== undefined && { distance: distance !== '' ? Number(distance) : null }),
        ...(status !== undefined && { status }),
        ...(remark !== undefined && { remark: remark || null }),
      },
    });

    res.json({ success: true, data: record });
  } catch (err) { next(err); }
});

// ============================================================
// 删除地址
// ============================================================
router.delete('/:id', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { id } = req.params;

    // 先查出地址数据
    const addr = await prisma.address.findUnique({ where: { id } });
    if (!addr) return res.status(404).json({ success: false, message: '地址记录不存在' });

    const refs = [];
    const MAX_ITEMS = 5;

    // Address 没有外键引用，但被 shipping_orders 通过文本字段引用
    //   origin  → 存 addr.title / addr.originName
    //   destination → 存 addr.destName
    const shippingOrders = await prisma.shippingOrder.findMany({
      where: {
        OR: [
          { origin: addr.title || addr.originName },
          { destination: addr.destName },
          { destination: { contains: addr.destName } },
        ],
      },
      select: { shippingNo: true, status: true, origin: true, destination: true },
    });
    if (shippingOrders.length > 0) {
      refs.push({
        type: '发货单',
        count: shippingOrders.length,
        items: shippingOrders.slice(0, MAX_ITEMS).map(o => ({ code: o.shippingNo, title: `${o.origin || ''} → ${o.destination || ''}`, status: o.status })),
        more: shippingOrders.length > MAX_ITEMS ? shippingOrders.length - MAX_ITEMS : 0,
      });
    }

    if (refs.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该地址记录已被发货单引用，无法删除',
        references: refs,
      });
    }

    await prisma.address.delete({ where: { id } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: '地址记录不存在' });
    next(err);
  }
});

// ============================================================
// 地址搜索（代理高德 inputtips，前端跨域用）
// ============================================================
router.get('/search', async (req, res, next) => {
  try {
    const { keyword } = req.query;
    if (!keyword) return res.json({ success: false, message: '请输入搜索关键词' });
    const url = `https://restapi.amap.com/v3/assistant/inputtips?key=${AMAP_KEY}&keywords=${encodeURIComponent(keyword)}&city=全国`;
    const data = await fetch(url).then(r => r.json());
    if (data.status === '1' && data.tips) {
      res.json({ success: true, data: data.tips.filter(t => t.location && t.location.length > 0) });
    } else {
      res.json({ success: true, data: [], info: data.info || '无结果' });
    }
  } catch (err) { next(err); }
});

// ============================================================
// 高德地图地理编码：地址 → 经纬度
// ============================================================
router.get('/geocode', async (req, res, next) => {
  try {
    const { address } = req.query;
    if (!address) return res.status(400).json({ success: false, message: '请提供地址' });

    const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${AMAP_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.status === '1' && data.geocodes?.length > 0) {
      const location = data.geocodes[0].location.split(',');
      res.json({
        success: true,
        data: { lng: location[0], lat: location[1], formattedAddress: data.geocodes[0].formatted_address },
      });
    } else {
      res.json({ success: false, message: data.info || '地理编码失败' });
    }
  } catch (err) { next(err); }
});

// ============================================================
// 高德地图驾车距离计算（起终点经纬度 → 距离）
// ============================================================
router.get('/distance', async (req, res, next) => {
  try {
    const { originLng, originLat, destLng, destLat } = req.query;
    if (!originLng || !originLat || !destLng || !destLat) {
      return res.status(400).json({ success: false, message: '请提供起终点经纬度' });
    }

    // 优先使用路径规划API（strategy=2 距离最短，更符合物流实际行驶路线）
    try {
      const routeUrl = `https://restapi.amap.com/v3/direction/driving?origin=${originLng},${originLat}&destination=${destLng},${destLat}&strategy=2&extensions=base&key=${AMAP_KEY}`;
      const routeResp = await fetch(routeUrl);
      const routeData = await routeResp.json();
      if (routeData.status === '1' && routeData.route?.paths?.length > 0) {
        const distance = routeData.route.paths[0].distance;
        const km = Math.round(Number(distance) / 10) / 100;
        return res.json({ success: true, data: { distance: km, unit: '公里' } });
      }
    } catch (err) {
      console.warn('[distance] 路径规划API失败，回退到distance API:', err.message);
    }

    // 回退到distance API（type=1 驾车距离）
    const url = `https://restapi.amap.com/v3/distance?origins=${originLng},${originLat}&destination=${destLng},${destLat}&type=1&key=${AMAP_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.status === '1' && data.results?.length > 0) {
      const km = Math.round(Number(data.results[0].distance) / 10) / 100;
      res.json({ success: true, data: { distance: km, unit: '公里' } });
    } else {
      res.json({ success: false, message: data.info || '距离计算失败' });
    }
  } catch (err) { next(err); }
});

// ============================================================
// 便捷接口：输入地址文本，一步完成地理编码+距离计算
// ============================================================
router.get('/calc-distance', async (req, res, next) => {
  try {
    const { origin, dest } = req.query;
    if (!origin || !dest) return res.status(400).json({ success: false, message: '请提供起始地和目的地地址' });

    // 1. 起终点分别地理编码
    const [geoOrigin, geoDest] = await Promise.all([
      fetch(`https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(origin)}&key=${AMAP_KEY}`).then(r => r.json()),
      fetch(`https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(dest)}&key=${AMAP_KEY}`).then(r => r.json()),
    ]);

    if (geoOrigin.status !== '1' || !geoOrigin.geocodes?.length) {
      return res.json({ success: false, message: `起始地地理编码失败: ${geoOrigin.info || '未知错误'}` });
    }
    if (geoDest.status !== '1' || !geoDest.geocodes?.length) {
      return res.json({ success: false, message: `目的地地理编码失败: ${geoDest.info || '未知错误'}` });
    }

    const originLoc = geoOrigin.geocodes[0].location.split(',');
    const destLoc = geoDest.geocodes[0].location.split(',');

    // 2. 距离计算
    const distResp = await fetch(
      `https://restapi.amap.com/v3/distance?origins=${originLoc[0]},${originLoc[1]}&destination=${destLoc[0]},${destLoc[1]}&type=1&key=${AMAP_KEY}`
    );
    const distData = await distResp.json();

    let distance = null;
    if (distData.status === '1' && distData.results?.length > 0) {
      distance = Math.round(Number(distData.results[0].distance) / 10) / 100;
    }

    res.json({
      success: true,
      data: {
        origin: { lng: originLoc[0], lat: originLoc[1], formattedAddress: geoOrigin.geocodes[0].formatted_address },
        dest: { lng: destLoc[0], lat: destLoc[1], formattedAddress: geoDest.geocodes[0].formatted_address },
        distance,
        unit: '公里',
      },
    });
  } catch (err) { next(err); }
});

export default router;
