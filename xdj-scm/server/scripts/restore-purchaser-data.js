/**
 * 从备份文件恢复采购员分配数据
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function restorePurchaserData() {
  console.log('=== 恢复采购员分配数据 ===\n');
  
  try {
    // 1. 先检查当前是否有数据
    const existingAssignments = await prisma.purchaserAssignment.findMany();
    if (existingAssignments.length > 0) {
      console.log('⚠️  采购员分配表已有数据（', existingAssignments.length, '条），跳过恢复');
      await prisma.$disconnect();
      return;
    }
    
    console.log('开始恢复数据...\n');
    
    // 2. 恢复采购员分配数据
    const assignments = [
      {
        id: 'cmr3h0qve0003ndflmkqcoewh',
        userId: 'cmr3gzz1q0001ndfl9rlzmkuu',
        status: 'ACTIVE',
        createdAt: new Date('2026-07-02T12:18:40.010Z'),
        updatedAt: new Date('2026-07-02T12:18:40.010Z')
      },
      {
        id: 'cmr3h0v4w0007ndflr47n0ekc',
        userId: 'cmr2xthn30012nddoaxv9bdn9',
        status: 'ACTIVE',
        createdAt: new Date('2026-07-02T12:18:45.536Z'),
        updatedAt: new Date('2026-07-03T02:02:46.665Z')
      },
      {
        id: 'cmr3h0z4k000bndfly7fyb20o',
        userId: 'cmr2xthn20010nddonsbyj3y7',
        status: 'ACTIVE',
        createdAt: new Date('2026-07-02T12:18:50.708Z'),
        updatedAt: new Date('2026-07-02T12:18:50.708Z')
      },
      {
        id: 'cmr3h14p1000gndfla9os4ypm',
        userId: 'cmr2xthn40014nddomdsrpif1',
        status: 'ACTIVE',
        createdAt: new Date('2026-07-02T12:18:57.925Z'),
        updatedAt: new Date('2026-07-02T12:18:57.925Z')
      }
    ];
    
    console.log('1. 恢复采购员分配表（', assignments.length, '条）...');
    for (const assignment of assignments) {
      await prisma.purchaserAssignment.create({
        data: assignment
      });
    }
    console.log('   ✅ 已完成\n');
    
    // 3. 恢复采购员物料分配数据
    const materialItems = [
      {
        id: 'cmr3h0qve0005ndflk5i52qqk',
        assignmentId: 'cmr3h0qve0003ndflmkqcoewh',
        materialId: 'cmr2xthnd001lnddo195l3his',
        createdAt: new Date('2026-07-02T12:18:40.010Z')
      },
      {
        id: 'cmr3h0z4k000dndflh80twxn8',
        assignmentId: 'cmr3h0z4k000bndfly7fyb20o',
        materialId: 'cmr2xthnc001jnddoukeowtrs',
        createdAt: new Date('2026-07-02T12:18:50.708Z')
      },
      {
        id: 'cmr3h0z4k000endflw7clqgi7',
        assignmentId: 'cmr3h0z4k000bndfly7fyb20o',
        materialId: 'cmr2xthnb001inddo1pkoxafx',
        createdAt: new Date('2026-07-02T12:18:50.708Z')
      },
      {
        id: 'cmr3h14p1000indfl5qf8us2n',
        assignmentId: 'cmr3h14p1000gndfla9os4ypm',
        materialId: 'cmr2xthna001hnddoq2ir1lmi',
        createdAt: new Date('2026-07-02T12:18:57.925Z')
      },
      {
        id: 'cmr4agk5l000gndwpoik1qo3a',
        assignmentId: 'cmr3h0v4w0007ndflr47n0ekc',
        materialId: 'cmr2xthnd001knddoknxi4yza',
        createdAt: new Date('2026-07-03T02:02:46.665Z')
      },
      {
        id: 'cmr4agk5l000hndwpfoq4smu7',
        assignmentId: 'cmr3h0v4w0007ndflr47n0ekc',
        materialId: 'cmr3kfsrx000vnd6o1umreto3',
        createdAt: new Date('2026-07-03T02:02:46.665Z')
      }
    ];
    
    console.log('2. 恢复采购员物料分配表（', materialItems.length, '条）...');
    for (const item of materialItems) {
      await prisma.purchaserMaterialItem.create({
        data: item
      });
    }
    console.log('   ✅ 已完成\n');
    
    // 4. 验证恢复结果
    console.log('3. 验证恢复结果...');
    const restoredAssignments = await prisma.purchaserAssignment.findMany({
      include: { user: true }
    });
    console.log('   采购员分配：', restoredAssignments.length, '条');
    restoredAssignments.forEach(a => {
      console.log('   -', a.user.username, '(' + a.userId + ')');
    });
    
    const restoredItems = await prisma.purchaserMaterialItem.findMany();
    console.log('   物料分配明细：', restoredItems.length, '条');
    console.log('   ✅ 验证通过\n');
    
    console.log('=== 恢复完成 ===');
    
  } catch (error) {
    console.error('❌ 恢复失败：', error.message);
    console.error('详细错误：', error);
  } finally {
    await prisma.$disconnect();
  }
}

restorePurchaserData();
