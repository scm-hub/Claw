import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize, ROLES } from '../../middleware/rbac.js';
import prisma from '../../shared/prisma.js';

const router = Router();
router.use(authenticate);

function genNo(prefix) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${ymd}${rand}`;
}

// ============================================================
// 温度看板
// ============================================================
router.get('/dashboard', async (req, res, next) => {
  try {
    const [totalSensors, activeSensors, activeAlerts, todayRecords] = await Promise.all([
      prisma.sensor.count(),
      prisma.sensor.count({ where: { status: 'ACTIVE' } }),
      prisma.temperatureAlert.count({ where: { status: 'ACTIVE' } }),
      prisma.temperatureRecord.count({ where: { recordedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    ]);

    // 获取各传感器最新读数
    const sensors = await prisma.sensor.findMany({
      where: { status: 'ACTIVE' },
      include: {
        warehouse: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
        temperatureRecords: { orderBy: { recordedAt: 'desc' }, take: 1 },
      },
    });

    const sensorStatuses = sensors.map(s => {
      const latest = s.temperatureRecords[0];
      return {
        id: s.id,
        sensorCode: s.sensorCode,
        name: s.name,
        warehouseName: s.warehouse?.name || '-',
        zoneName: s.zone?.name || '-',
        tempMin: s.tempMin,
        tempMax: s.tempMax,
        latestTemp: latest?.temperature || null,
        latestHumidity: latest?.humidity || null,
        isNormal: latest?.isNormal ?? true,
        lastReadingAt: s.lastReadingAt,
      };
    });

    res.json({
      success: true,
      data: {
        stats: { totalSensors, activeSensors, activeAlerts, todayRecords },
        sensors: sensorStatuses,
      },
    });
  } catch (err) { next(err); }
});

// ============================================================
// 传感器管理
// ============================================================
router.get('/sensors', async (req, res, next) => {
  try {
    const { keyword = '', status = '', warehouseId = '' } = req.query;
    const where = {};
    if (keyword) where.OR = [{ sensorCode: { contains: keyword } }, { name: { contains: keyword } }];
    if (status) where.status = status;
    if (warehouseId) where.warehouseId = warehouseId;
    const list = await prisma.sensor.findMany({
      where,
      include: {
        warehouse: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
        location: { select: { id: true, code: true, name: true } },
        _count: { select: { temperatureAlerts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
});

router.post('/sensors', authorize(ROLES.SUPER_ADMIN, ROLES.WAREHOUSE_STAFF), async (req, res, next) => {
  try {
    const { sensorCode, name, warehouseId, zoneId, locationId, sensorType, protocol, deviceAddress, tempMin, tempMax, humidityMin, humidityMax } = req.body;
    if (!sensorCode || !name) return res.status(400).json({ success: false, message: '传感器编号和名称必填' });
    const sensor = await prisma.sensor.create({
      data: {
        sensorCode, name,
        warehouseId: warehouseId || null,
        zoneId: zoneId || null,
        locationId: locationId || null,
        sensorType: sensorType || 'TEMP_HUMIDITY',
        protocol: protocol || 'MQTT',
        deviceAddress: deviceAddress || null,
        tempMin: tempMin || null,
        tempMax: tempMax || null,
        humidityMin: humidityMin || null,
        humidityMax: humidityMax || null,
      },
    });
    res.json({ success: true, data: sensor });
  } catch (err) { next(err); }
});

router.put('/sensors/:id', authorize(ROLES.SUPER_ADMIN, ROLES.WAREHOUSE_STAFF), async (req, res, next) => {
  try {
    const { name, warehouseId, zoneId, locationId, sensorType, protocol, deviceAddress, tempMin, tempMax, humidityMin, humidityMax, status } = req.body;
    const sensor = await prisma.sensor.update({
      where: { id: req.params.id },
      data: { name, warehouseId, zoneId, locationId, sensorType, protocol, deviceAddress, tempMin, tempMax, humidityMin, humidityMax, status },
    });
    res.json({ success: true, data: sensor });
  } catch (err) { next(err); }
});

router.delete('/sensors/:id', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    await prisma.sensor.update({ where: { id: req.params.id }, data: { status: 'INACTIVE' } });
    res.json({ success: true, message: '已停用' });
  } catch (err) { next(err); }
});

// ============================================================
// 温度记录
// ============================================================
router.get('/records', async (req, res, next) => {
  try {
    const { sensorId, page = 1, pageSize = 50, startDate = '', endDate = '', abnormalOnly = '' } = req.query;
    const where = {};
    if (sensorId) where.sensorId = sensorId;
    if (abnormalOnly === 'true') where.isNormal = false;
    if (startDate || endDate) {
      where.recordedAt = {};
      if (startDate) where.recordedAt.gte = new Date(startDate);
      if (endDate) where.recordedAt.lte = new Date(endDate);
    }
    const [list, total] = await Promise.all([
      prisma.temperatureRecord.findMany({
        where,
        include: { sensor: { select: { id: true, sensorCode: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { recordedAt: 'desc' },
      }),
      prisma.temperatureRecord.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 上报温度记录（模拟设备上报）
router.post('/records', async (req, res, next) => {
  try {
    const { sensorId, temperature, humidity } = req.body;
    if (!sensorId) return res.status(400).json({ success: false, message: '传感器ID必填' });
    const sensor = await prisma.sensor.findUnique({ where: { id: sensorId } });
    if (!sensor) return res.status(400).json({ success: false, message: '传感器不存在' });

    // 判断是否正常
    let isNormal = true;
    if (sensor.tempMin != null && temperature != null && Number(temperature) < Number(sensor.tempMin)) isNormal = false;
    if (sensor.tempMax != null && temperature != null && Number(temperature) > Number(sensor.tempMax)) isNormal = false;
    if (sensor.humidityMin != null && humidity != null && Number(humidity) < Number(sensor.humidityMin)) isNormal = false;
    if (sensor.humidityMax != null && humidity != null && Number(humidity) > Number(sensor.humidityMax)) isNormal = false;

    const record = await prisma.temperatureRecord.create({
      data: { sensorId, temperature: temperature || null, humidity: humidity || null, isNormal, recordedAt: new Date() },
    });

    // 更新传感器最后读数时间
    await prisma.sensor.update({ where: { id: sensorId }, data: { lastReadingAt: new Date() } });

    // 如果异常，自动创建告警
    if (!isNormal) {
      const alertNo = genNo('TA');
      const alertType = temperature != null && Number(temperature) > Number(sensor.tempMax) ? 'HIGH_TEMP'
        : temperature != null && Number(temperature) < Number(sensor.tempMin) ? 'LOW_TEMP'
        : 'HUMIDITY';
      await prisma.temperatureAlert.create({
        data: {
          alertNo,
          sensorId,
          alertType,
          value: temperature || humidity,
          threshold: alertType.startsWith('HIGH') ? sensor.tempMax : alertType.startsWith('LOW') ? sensor.tempMin : null,
          startedAt: new Date(),
          status: 'ACTIVE',
        },
      });
    }

    res.json({ success: true, data: record });
  } catch (err) { next(err); }
});

// ============================================================
// 温度告警
// ============================================================
router.get('/alerts', async (req, res, next) => {
  try {
    const { status = '', sensorId = '', page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (sensorId) where.sensorId = sensorId;
    const [list, total] = await Promise.all([
      prisma.temperatureAlert.findMany({
        where,
        include: {
          sensor: { select: { id: true, sensorCode: true, name: true, warehouse: { select: { name: true } } } },
          handler: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.temperatureAlert.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 处理告警
router.put('/alerts/:id/handle', authorize(ROLES.SUPER_ADMIN, ROLES.WAREHOUSE_STAFF), async (req, res, next) => {
  try {
    const { handleRemark } = req.body;
    const alert = await prisma.temperatureAlert.update({
      where: { id: req.params.id },
      data: {
        status: 'RESOLVED',
        handledBy: req.user.employeeId,
        handleRemark: handleRemark || null,
        endedAt: new Date(),
        durationMinutes: 0, // 简化处理
      },
    });
    res.json({ success: true, data: alert });
  } catch (err) { next(err); }
});

export default router;
