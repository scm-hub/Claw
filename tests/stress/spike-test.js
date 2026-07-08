/**
 * K6 场景 4：峰值/压力测试
 * 从 10 VUs 逐步增加到 500 VUs，找到系统瓶颈
 *
 * 使用方式：
 *   k6 run tests/stress/spike-test.js
 *   k6 run --vus 500 --duration 5m tests/stress/spike-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const spikeDuration = new Trend('spike_duration');

export const options = {
  stages: [
    { duration: '30s', target: 10 },     // 30s → 10 VUs
    { duration: '1m', target: 50 },       // 1m → 50 VUs
    { duration: '1m', target: 100 },      // 1m → 100 VUs
    { duration: '1m', target: 200 },      // 1m → 200 VUs
    { duration: '1m', target: 300 },      // 1m → 300 VUs
    { duration: '1m', target: 400 },      // 1m → 400 VUs
    { duration: '30s', target: 500 },     // 30s → 500 VUs
    { duration: '1m', target: 500 },      // 保持 500 VUs
    { duration: '1m', target: 0 },        // 1m 降到 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    errors: ['rate<0.05'],
    http_req_failed: ['rate<0.05'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const TARGET_URLS = [
  { url: 'http://localhost:4001/health', name: 'Portal' },
  { url: 'http://localhost:4002/api/health', name: 'HRMS' },
  { url: 'http://localhost:4003/health', name: 'SCM' },
  { url: 'http://localhost:4004/health', name: 'AI' },
  { url: 'http://localhost:4005/health', name: 'MDM' },
  { url: 'http://localhost:4011/health', name: 'Workflow' },
  { url: 'http://localhost:5174/health', name: 'Gateway' },
];

export function setup() {
  console.log(`准备峰值测试，目标：${TARGET_URLS.length} 个端点`);
  return { targets: TARGET_URLS };
}

export default function (data) {
  const target = data.targets[Math.floor(Math.random() * data.targets.length)];

  group(`峰值测试 - ${target.name}`, () => {
    const res = http.get(target.url, {
      timeout: '5s',
      tags: { name: `GET ${target.name} health` },
    });

    spikeDuration.add(res.timings.duration);

    const ok = check(res, {
      [`${target.name} 响应`]: (r) => r.status < 500,
    });
    errorRate.add(!ok);

    if (!ok) {
      console.error(`${target.name} 失败: ${res.status} - ${res.body.substring(0, 100)}`);
    }
  });

  // 峰值测试中减少等待时间
  sleep(0.5 + Math.random() * 1);
}

export function teardown(data) {
  console.log('✅ 峰值压力测试完成');
}
