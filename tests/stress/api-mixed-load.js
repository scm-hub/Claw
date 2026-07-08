/**
 * K6 场景 3：混合负载压测
 * 模拟真实业务场景：
 *   - 70% 查询操作（健康检查、系统列表、用户信息）
 *   - 20% 写入操作（登录、日志上报）
 *   - 10% 复杂查询（系统列表、审计日志）
 *
 * 使用方式：
 *   k6 run tests/stress/api-mixed-load.js
 *   k6 run --vus 200 --duration 10m tests/stress/api-mixed-load.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const queryDuration = new Trend('query_duration');
const writeDuration = new Trend('write_duration');
const complexDuration = new Trend('complex_duration');
const requestCounter = new Counter('total_requests');

export const options = {
  stages: [
    { duration: '1m', target: 50 },    // 1 分钟内从 0 增加到 50 VUs
    { duration: '3m', target: 100 },    // 3 分钟内从 50 增加到 100 VUs
    { duration: '5m', target: 100 },    // 保持 100 VUs 持续 5 分钟
    { duration: '1m', target: 0 },      // 1 分钟内降到 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    errors: ['rate<0.02'],
    http_req_failed: ['rate<0.02'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

// 基础 URL 列表（含正确的 health 路径）
const BASE_URLS = {
  portal: 'http://localhost:4001',
  hrms: 'http://localhost:4002',
  scm: 'http://localhost:4003',
  ai: 'http://localhost:4004',
  mdm: 'http://localhost:4005',
  workflow: 'http://localhost:4011',
  gateway: 'http://localhost:5174',
};

const HEALTH_PATHS = {
  portal: '/health',
  hrms: '/api/health',
  scm: '/health',
  ai: '/health',
  mdm: '/health',
  workflow: '/health',
  gateway: '/health',
};

export function setup() {
  // 检查各服务是否可达
  const services = {};
  for (const [name, url] of Object.entries(BASE_URLS)) {
    try {
      const healthPath = HEALTH_PATHS[name];
      const res = http.get(`${url}${healthPath}`, { timeout: '3s' });
      services[name] = res.status === 200;
      console.log(`${name}: ${res.status === 200 ? '✅' : '❌'} (${res.status})`);
    } catch (e) {
      services[name] = false;
      console.log(`${name}: ❌ 不可达`);
    }
  }
  return { services };
}

export default function (data) {
  requestCounter.add(1);
  const rand = Math.random();

  if (rand < 0.7) {
    // 70% 查询操作
    queryOperations(data.services);
  } else if (rand < 0.9) {
    // 20% 写入操作
    writeOperations(data.services);
  } else {
    // 10% 复杂查询
    complexOperations(data.services);
  }

  sleep(Math.random() * 2 + 0.5);
}

function queryOperations(services) {
  const op = Math.floor(Math.random() * 4);

  if (services.portal && op === 0) {
    group('查询 - Portal 健康检查', () => {
      const res = http.get(`${BASE_URLS.portal}/api/health`, {
        tags: { name: 'GET /api/health (portal)' },
      });
      check(res, { 'status 200': (r) => r.status === 200 });
      queryDuration.add(res.timings.duration);
    });
  } else if (services.hrms && op === 1) {
    group('查询 - HRMS 健康检查', () => {
      const res = http.get(`${BASE_URLS.hrms}/api/health`, {
        tags: { name: 'GET /api/health (hrms)' },
      });
      check(res, { 'status 200': (r) => r.status === 200 });
      queryDuration.add(res.timings.duration);
    });
  } else if (services.scm && op === 2) {
    group('查询 - SCM 健康检查', () => {
      const res = http.get(`${BASE_URLS.scm}/api/health`, {
        tags: { name: 'GET /api/health (scm)' },
      });
      check(res, { 'status 200': (r) => r.status === 200 });
      queryDuration.add(res.timings.duration);
    });
  } else if (services.gateway) {
    group('查询 - Gateway 代理', () => {
      const res = http.get(`${BASE_URLS.gateway}/api/health`, {
        tags: { name: 'GET /api/health (gateway)' },
      });
      check(res, { 'status 2xx': (r) => r.status >= 200 && r.status < 500 });
      queryDuration.add(res.timings.duration);
    });
  }
}

function writeOperations(services) {
  const op = Math.floor(Math.random() * 3);

  if (services.portal && op === 0) {
    group('写入 - 尝试登录', () => {
      const payload = JSON.stringify({
        email: `load-test-${__VU}-${__ITER}@xdj.com`,
        password: 'TestPass@123',
      });
      const res = http.post(`${BASE_URLS.portal}/api/auth/login`, payload, {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'POST /api/auth/login' },
      });
      check(res, { '登录响应': (r) => r.status === 200 || r.status === 401 });
      writeDuration.add(res.timings.duration);
      errorRate.add(res.status >= 500);
    });
  } else if (services.portal && op === 1) {
    group('写入 - 日志上报', () => {
      const payload = JSON.stringify({
        systemId: 'load-test',
        action: 'stress-test',
        userId: `vu-${__VU}`,
        details: { iteration: __ITER },
      });
      const res = http.post(`${BASE_URLS.portal}/api/logs/report`, payload, {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'POST /api/logs/report' },
      });
      check(res, { '日志上报响应': (r) => r.status < 500 });
      writeDuration.add(res.timings.duration);
    });
  } else if (services.portal && op === 2) {
    group('写入 - 系统注册', () => {
      const payload = JSON.stringify({
        systemId: `stress-${__VU}-${Date.now()}`,
        name: `压力测试系统 ${__VU}`,
        apiBase: `http://test-${__VU}.local`,
      });
      const res = http.post(`${BASE_URLS.portal}/api/systems`, payload, {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'POST /api/systems' },
      });
      check(res, { '系统注册响应': (r) => r.status < 500 });
      writeDuration.add(res.timings.duration);
    });
  }
}

function complexOperations(services) {
  const op = Math.floor(Math.random() * 2);

  if (services.portal && op === 0) {
    group('复杂查询 - 系统列表', () => {
      const res = http.get(`${BASE_URLS.portal}/api/systems`, {
        tags: { name: 'GET /api/systems' },
      });
      check(res, { '系统列表返回': (r) => r.status < 500 });
      complexDuration.add(res.timings.duration);
    });
  } else if (services.portal) {
    group('复杂查询 - 审计日志', () => {
      const res = http.get(`${BASE_URLS.portal}/api/logs?page=1&pageSize=10`, {
        tags: { name: 'GET /api/logs' },
      });
      check(res, { '审计日志返回': (r) => r.status < 500 });
      complexDuration.add(res.timings.duration);
    });
  }
}

export function teardown(data) {
  console.log('✅ 混合负载压测完成');
  console.log(`可用服务: ${Object.entries(data.services).filter(([, v]) => v).map(([k]) => k).join(', ')}`);
}
