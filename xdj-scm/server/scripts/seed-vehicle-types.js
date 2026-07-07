import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const data = [
  // 普通货车 25 种
  { code: 'VAN_MICRO', name: '微面', category: 'NORMAL', boxLength: 1.4, boxWidth: 1.4, boxHeight: 1.0, loadVolume: 1.7, loadWeight: 0.3 },
  { code: 'VAN_SMALL', name: '小面', category: 'NORMAL', boxLength: 2.0, boxWidth: 1.4, boxHeight: 1.0, loadVolume: 2.5, loadWeight: 0.5 },
  { code: 'VAN_MEDIUM', name: '中面', category: 'NORMAL', boxLength: 2.4, boxWidth: 1.3, boxHeight: 1.2, loadVolume: 3.5, loadWeight: 0.8 },
  { code: 'VAN_LARGE', name: '大面', category: 'NORMAL', boxLength: 3.1, boxWidth: 1.5, boxHeight: 1.5, loadVolume: 6.2, loadWeight: 1.0 },
  { code: 'TRUCK_MICRO', name: '微货', category: 'NORMAL', boxLength: 1.8, boxWidth: 1.4, boxHeight: 1.0, loadVolume: 3.8, loadWeight: 0.5 },
  { code: 'TRUCK_SMALL', name: '小货', category: 'NORMAL', boxLength: 2.5, boxWidth: 1.6, boxHeight: 1.8, loadVolume: 7.2, loadWeight: 1.0 },
  { code: 'TRUCK_MEDIUM', name: '中货', category: 'NORMAL', boxLength: 3.8, boxWidth: 1.8, boxHeight: 1.8, loadVolume: 12.5, loadWeight: 1.5 },
  { code: 'TRUCK_3M8', name: '3.8米车', category: 'NORMAL', boxLength: 3.8, boxWidth: 1.8, boxHeight: 1.8, loadVolume: 12.5, loadWeight: 2.5 },
  { code: 'TRUCK_4M2', name: '4.2米车', category: 'NORMAL', boxLength: 4.2, boxWidth: 1.8, boxHeight: 1.8, loadVolume: 14.0, loadWeight: 3.5 },
  { code: 'TRUCK_5M', name: '5米车', category: 'NORMAL', boxLength: 5.0, boxWidth: 1.8, boxHeight: 2.0, loadVolume: 17.0, loadWeight: 5.0 },
  { code: 'TRUCK_6M', name: '6米车', category: 'NORMAL', boxLength: 5.8, boxWidth: 1.8, boxHeight: 2.0, loadVolume: 20.0, loadWeight: 6.0 },
  { code: 'TRUCK_6M8', name: '6.8米车', category: 'NORMAL', boxLength: 6.8, boxWidth: 2.2, boxHeight: 2.6, loadVolume: 25.5, loadWeight: 6.0 },
  { code: 'TRUCK_7M', name: '7米车', category: 'NORMAL', boxLength: 7.0, boxWidth: 2.2, boxHeight: 2.6, loadVolume: 30.0, loadWeight: 6.0 },
  { code: 'TRUCK_7M6', name: '7.6米车', category: 'NORMAL', boxLength: 7.6, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 35.0, loadWeight: 6.0 },
  { code: 'TRUCK_8M', name: '8米车', category: 'NORMAL', boxLength: 8.0, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 40.0, loadWeight: 6.0 },
  { code: 'TRUCK_8M6', name: '8.6米车', category: 'NORMAL', boxLength: 8.6, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 45.0, loadWeight: 6.0 },
  { code: 'TRUCK_9M', name: '9米车', category: 'NORMAL', boxLength: 9.0, boxWidth: 2.2, boxHeight: 2.6, loadVolume: 48.0, loadWeight: 8.0 },
  { code: 'TRUCK_9M6', name: '9.6米车', category: 'NORMAL', boxLength: 9.6, boxWidth: 2.2, boxHeight: 2.6, loadVolume: 55.0, loadWeight: 10.0 },
  { code: 'TRUCK_11M', name: '11米车', category: 'NORMAL', boxLength: 11.0, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 57.0, loadWeight: 10.0 },
  { code: 'TRUCK_12M', name: '12米车', category: 'NORMAL', boxLength: 12.0, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 63.0, loadWeight: 10.0 },
  { code: 'TRUCK_13M', name: '13米车', category: 'NORMAL', boxLength: 13.0, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 70.0, loadWeight: 18.0 },
  { code: 'TRUCK_13M7', name: '13.7米车', category: 'NORMAL', boxLength: 13.7, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 75.0, loadWeight: 20.0 },
  { code: 'TRUCK_15M', name: '15米车', category: 'NORMAL', boxLength: 15.0, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 80.0, loadWeight: 20.0 },
  { code: 'TRUCK_16M', name: '16米车', category: 'NORMAL', boxLength: 16.0, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 85.0, loadWeight: 25.0 },
  { code: 'TRUCK_17M5', name: '17.5米车', category: 'NORMAL', boxLength: 17.5, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 90.0, loadWeight: 25.0 },
  // 冷藏车 7 种
  { code: 'REF_4M2', name: '冷藏车4米2', category: 'REFRIGERATED', boxLength: 3.8, boxWidth: 1.8, boxHeight: 1.8, loadVolume: 12.3, loadWeight: 1.5 },
  { code: 'REF_5M2', name: '冷藏车5米2', category: 'REFRIGERATED', boxLength: 5.0, boxWidth: 1.8, boxHeight: 2.0, loadVolume: 18.0, loadWeight: 2.0 },
  { code: 'REF_6M8', name: '冷藏车6米8', category: 'REFRIGERATED', boxLength: 6.4, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 35.2, loadWeight: 6.0 },
  { code: 'REF_7M6', name: '冷藏车7米6', category: 'REFRIGERATED', boxLength: 7.4, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 40.7, loadWeight: 8.0 },
  { code: 'REF_9M6', name: '冷藏车9米6', category: 'REFRIGERATED', boxLength: 9.0, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 49.5, loadWeight: 10.0 },
  { code: 'REF_13M', name: '冷藏车13米', category: 'REFRIGERATED', boxLength: 12.5, boxWidth: 2.3, boxHeight: 2.5, loadVolume: 71.9, loadWeight: 18.0 },
  { code: 'REF_17M5', name: '冷藏车17米5', category: 'REFRIGERATED', boxLength: 16.0, boxWidth: 2.3, boxHeight: 2.5, loadVolume: 92.0, loadWeight: 25.0 },
];

async function main() {
  let created = 0, skipped = 0;
  for (const item of data) {
    const exists = await prisma.vehicleType.findUnique({ where: { code: item.code } });
    if (exists) { skipped++; continue; }
    await prisma.vehicleType.create({ data: item });
    created++;
  }
  console.log(`Done: ${created} created, ${skipped} skipped`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
