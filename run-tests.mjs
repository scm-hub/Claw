/**
 * 测试运行脚本 — 分批运行避免 vi.mock 冲突
 * 用法: node run-tests.mjs
 */
import { execSync } from 'child_process';

const VITEST = 'node node_modules/vitest/vitest.mjs run';
const BASE = process.cwd();

const batches = [
  // 批次 1：无 mock 依赖的纯逻辑测试
  {
    name: '基础设施与安全策略',
    files: [
      'tests/shared-security.test.js',
      'tests/scm-upload-security.test.js',
      'tests/gateway.test.js',
    ],
  },
  // 批次 2：Portal Auth Service（含 prisma mock）
  {
    name: 'Portal Auth Service',
    files: [
      'portal/server/tests/auth-service.test.js',
    ],
  },
  // 批次 3：Portal Auth 中间件测试
  {
    name: 'Portal Auth Middleware',
    files: [
      'portal/server/tests/auth.test.js',
    ],
  },
  // 批次 4：HRMS 测试
  {
    name: 'HRMS 路由与安全',
    files: [
      'hrms/server/tests/routes.test.js',
      'hrms/server/tests/security.test.js',
    ],
  },
];

let totalPassed = 0;
let totalFailed = 0;
const failedBatches = [];

for (const batch of batches) {
  console.log(`\n━━━ ${batch.name} ━━━`);
  const files = batch.files.join(' ');
  try {
    const output = execSync(`${VITEST} ${files}`, {
      cwd: BASE,
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    // 解析输出获取通过/失败数
    console.log(output);
    const match = output.match(/Tests\s+(\d+)\s+failed\s+\|\s+(\d+)\s+passed/);
    if (match) {
      totalFailed += parseInt(match[1]);
      totalPassed += parseInt(match[2]);
    } else {
      const passMatch = output.match(/(\d+)\s+passed/);
      if (passMatch) totalPassed += parseInt(passMatch[1]);
    }
  } catch (e) {
    failedBatches.push(batch.name);
    const output = e.stdout || e.message;
    console.log(output);
    const match = output.match(/Tests\s+(\d+)\s+failed\s+\|\s+(\d+)\s+passed/);
    if (match) {
      totalFailed += parseInt(match[1]);
      totalPassed += parseInt(match[2]);
    }
  }
}

console.log('\n═══════════════════════════════════════');
console.log(`  总计: ${totalPassed} 通过, ${totalFailed} 失败`);
if (failedBatches.length > 0) {
  console.log(`  失败批次: ${failedBatches.join(', ')}`);
  process.exit(1);
}
console.log('═══════════════════════════════════════');
