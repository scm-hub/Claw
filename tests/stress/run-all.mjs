/**
 * 压测运行脚本 — 一键执行所有压测场景
 *
 * 使用方式：
 *   node tests/stress/run-all.mjs              # 运行全部
 *   node tests/stress/run-all.mjs --quick      # 快速模式（30s）
 *   node tests/stress/run-all.mjs --scenario=login  # 只运行登录压测
 */

import { execSync, spawn } from 'child_process';
import { parseArgs } from 'node:util';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const { values: args } = parseArgs({
  options: {
    quick: { type: 'boolean', default: false },
    scenario: { type: 'string', default: 'all' },
    vus: { type: 'string', default: '' },
    duration: { type: 'string', default: '' },
  },
});

const RESULTS_DIR = join(import.meta.dirname || process.cwd() + '/tests/stress', 'results');
mkdirSync(RESULTS_DIR, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const logFile = join(RESULTS_DIR, `stress-run-${timestamp}.log`);

function log(message) {
  const line = `[${new Date().toLocaleTimeString()}] ${message}`;
  console.log(line);
  writeFileSync(logFile, line + '\n', { flag: 'a' });
}

function checkService(name, url) {
  try {
    const res = execSync(`curl -s -o /dev/null -w "%{http_code}" --max-time 3 ${url}`, {
      encoding: 'utf8',
    });
    const ok = res === '200';
    log(`${ok ? '✅' : '⚠️'} ${name} (${url}): ${res}`);
    return ok;
  } catch {
    log(`❌ ${name} (${url}): 不可达`);
    return false;
  }
}

function runK6(script, extraArgs = '') {
  const cmd = `k6 run ${script} ${extraArgs}`;
  log(`\n▶ 执行: ${cmd}`);

  try {
    execSync(cmd, {
      stdio: 'inherit',
      timeout: 600000, // 10 分钟超时
      cwd: process.cwd(),
    });
    return true;
  } catch (e) {
    log(`❌ 执行失败: ${e.message}`);
    return false;
  }
}

function runAutocannon(script, extraArgs = '') {
  const cmd = `node ${script} ${extraArgs}`;
  log(`\n▶ 执行: ${cmd}`);

  try {
    execSync(cmd, {
      stdio: 'inherit',
      timeout: 300000,
      cwd: process.cwd(),
    });
    return true;
  } catch (e) {
    log(`❌ 执行失败: ${e.message}`);
    return false;
  }
}

// ========== 主流程 ==========

log('═'.repeat(60));
log('🚀 压力测试执行开始');
log('═'.repeat(60));

// 1. 服务可达性检查
log('\n📡 服务可达性检查...');
const services = [
  ['Portal', 'http://localhost:4001/health'],
  ['HRMS', 'http://localhost:4002/api/health'],
  ['SCM', 'http://localhost:4003/health'],
  ['AI', 'http://localhost:4004/health'],
  ['MDM', 'http://localhost:4005/health'],
  ['Workflow', 'http://localhost:4011/health'],
  ['Gateway', 'http://localhost:5174/health'],
];

const available = [];
for (const [name, url] of services) {
  if (checkService(name, url)) {
    available.push(name);
  }
}

if (available.length === 0) {
  log('\n⚠️ 没有可用服务！请先启动后端服务。');
  log('   可使用: pm2 start ecosystem.config.js');
  log('   或: node gateway.js & node portal/server/src/index.js & ...');
  process.exit(1);
}

log(`\n✅ 可用服务 (${available.length}/${services.length}): ${available.join(', ')}`);

// 2. 根据场景选择运行
const scenario = args.scenario;
const quick = args.quick;
const k6Args = [];
if (args.vus) k6Args.push(`--vus ${args.vus}`);
if (args.duration) k6Args.push(`--duration ${args.duration}`);

const k6ExtraArgs = k6Args.join(' ');

if (scenario === 'all' || scenario === 'quick') {
  // 快速 autocannon 测试（本地验证）
  log('\n📊 阶段 A: Autocannon 快速压测...');
  const acArgs = quick ? '--connections=20 --duration=15' : '--connections=50 --duration=30';
  runAutocannon('tests/stress/autocannon-quick.mjs', acArgs);

  if (!quick) {
    // 完整 k6 场景测试
    log('\n📊 阶段 B: K6 登录压测...');
    runK6('tests/stress/login-stress.js', k6ExtraArgs);

    log('\n📊 阶段 C: K6 混合负载压测...');
    runK6('tests/stress/api-mixed-load.js', k6ExtraArgs);

    log('\n📊 阶段 D: K6 峰值压力测试...');
    runK6('tests/stress/spike-test.js', k6ExtraArgs);
  }
} else if (scenario === 'login') {
  runK6('tests/stress/login-stress.js', k6ExtraArgs);
} else if (scenario === 'mixed') {
  runK6('tests/stress/api-mixed-load.js', k6ExtraArgs);
} else if (scenario === 'spike') {
  runK6('tests/stress/spike-test.js', k6ExtraArgs);
} else if (scenario === 'quick') {
  runAutocannon('tests/stress/autocannon-quick.mjs', '--connections=50 --duration=30');
}

log('\n' + '═'.repeat(60));
log('✅ 压力测试执行完成');
log(`📁 日志文件: ${logFile}`);
log('═'.repeat(60));
