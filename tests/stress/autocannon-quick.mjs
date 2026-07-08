/**
 * Autocannon 快速压测脚本
 * 对各个后端服务的 health 端点进行快速压测
 *
 * 使用方式：
 *   node tests/stress/autocannon-quick.mjs
 *   node tests/stress/autocannon-quick.mjs --connections=100 --duration=30
 */

import autocannon from 'autocannon';
import { spawn } from 'child_process';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    connections: { type: 'string', default: '50' },
    duration: { type: 'string', default: '30' },
    pipelining: { type: 'string', default: '1' },
  },
});

const CONNECTIONS = parseInt(args.connections, 10);
const DURATION = parseInt(args.duration, 10);
const PIPELINING = parseInt(args.pipelining, 10);

const SERVICES = [
  { name: 'Portal (4001)', url: 'http://localhost:4001/health' },
  { name: 'HRMS (4002)', url: 'http://localhost:4002/api/health' },
  { name: 'SCM (4003)', url: 'http://localhost:4003/health' },
  { name: 'AI (4004)', url: 'http://localhost:4004/health' },
  { name: 'MDM (4005)', url: 'http://localhost:4005/health' },
  { name: 'Workflow (4011)', url: 'http://localhost:4011/health' },
  { name: 'Gateway (5174)', url: 'http://localhost:5174/health' },
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatResult(name, result) {
  return `
┌─────────────────────────────────────────────────────────────┐
│  ${name.padEnd(55)}│
├─────────────────────────────────────────────────────────────┤
│  请求总数:    ${String(result.requests.total).padStart(8)}                          │
│  持续时间:    ${String(result.duration).padStart(8)}s                         │
│  平均延迟:    ${String(Math.round(result.latency.average)).padStart(8)} ms                       │
│  P99 延迟:    ${String(Math.round(result.latency.p99)).padStart(8)} ms                       │
│  最大延迟:    ${String(Math.round(result.latency.max)).padStart(8)} ms                       │
│  吞吐量:      ${String(Math.round(result.requests.average)).padStart(8)} req/s                    │
│  错误数:      ${String(result.errors || 0).padStart(8)}                           │
│  超时数:      ${String(result.timeouts || 0).padStart(8)}                           │
│  总数据量:    ${formatBytes(result.throughput.total || 0).padStart(8)}                           │
├─────────────────────────────────────────────────────────────┤
│  状态码分布:                                                │
${Object.entries(result.statusCodeStats || {})
  .map(([code, count]) => `│    ${code}: ${String(count).padEnd(10)}`)
  .join('\n')}
└─────────────────────────────────────────────────────────────┘`;
}

async function runAutocannon(name, url) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url,
        connections: CONNECTIONS,
        duration: DURATION,
        pipelining: PIPELINING,
        timeout: 10,
        headers: {
          'Accept': 'application/json',
        },
      },
      (err, result) => {
        if (err) {
          console.error(`❌ ${name} 压测出错: ${err.message}`);
          resolve(null);
        } else {
          resolve(result);
        }
      },
    );

    // 实时进度
    autocannon.track(instance, {
      renderProgressBar: true,
      renderResultsTable: false,
      renderLatencyTable: false,
    });

    process.once('SIGINT', () => {
      instance.stop();
    });
  });
}

// 汇总表格
function printSummary(results) {
  console.log('\n\n');
  console.log('═'.repeat(100));
  console.log('  📊 压测结果汇总');
  console.log('═'.repeat(100));
  console.log(
    `  ${'服务'.padEnd(22)} ${'请求数'.padStart(8)} ${'平均延迟'.padStart(10)} ${'P99延迟'.padStart(10)} ${'吞吐量'.padStart(10)} ${'错误数'.padStart(8)} ${'状态'}`,
  );
  console.log('─'.repeat(100));

  for (const { name } of SERVICES) {
    const r = results[name];
    if (!r) {
      console.log(`  ${name.padEnd(22)} ${'N/A'.padStart(8)} ${'N/A'.padStart(10)} ${'N/A'.padStart(10)} ${'N/A'.padStart(10)} ${'N/A'.padStart(8)} ❌ 不可达`);
      continue;
    }

    const avgLat = Math.round(r.latency.average);
    const p99 = Math.round(r.latency.p99);
    const throughput = Math.round(r.requests.average);
    const errors = (r.errors || 0) + (r.timeouts || 0);
    const status = errors === 0 ? '✅ 正常' : errors < 10 ? '⚠️ 少量错误' : '❌ 异常';

    console.log(
      `  ${name.padEnd(22)} ${String(r.requests.total).padStart(8)} ${String(avgLat + 'ms').padStart(10)} ${String(p99 + 'ms').padStart(10)} ${String(throughput + '/s').padStart(10)} ${String(errors).padStart(8)} ${status}`,
    );
  }
  console.log('═'.repeat(100));
}

// 主函数
async function main() {
  console.log('🚀 Autocannon 压力测试开始');
  console.log(`   并发连接: ${CONNECTIONS} | 持续时间: ${DURATION}s | 管道化: ${PIPELINING}`);
  console.log('═'.repeat(100));

  const results = {};

  for (const { name, url } of SERVICES) {
    console.log(`\n📡 测试: ${name} → ${url}`);
    const result = await runAutocannon(name, url);
    if (result) {
      console.log(formatResult(name, result));
    } else {
      console.log(`\n❌ ${name} 测试失败（服务可能未启动）`);
    }
    results[name] = result;
  }

  printSummary(results);

  // 保存 JSON 结果
  const fs = await import('fs');
  const jsonResult = {};
  for (const [name, result] of Object.entries(results)) {
    if (result) {
      jsonResult[name] = {
        requests: result.requests,
        latency: result.latency,
        throughput: result.throughput,
        errors: result.errors,
        timeouts: result.timeouts,
        statusCodeStats: result.statusCodeStats,
      };
    }
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultFile = `tests/stress/results/autocannon-${timestamp}.json`;
  fs.mkdirSync('tests/stress/results', { recursive: true });
  fs.writeFileSync(resultFile, JSON.stringify(jsonResult, null, 2));
  console.log(`\n📁 详细结果已保存: ${resultFile}`);
}

main().catch(console.error);
