/**
 * K6 场景 1：登录压测
 * 50 VUs 并发登录，持续 2 分钟
 *
 * 使用方式：
 *   k6 run tests/stress/login-stress.js
 *   k6 run --vus 100 --duration 3m tests/stress/login-stress.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const verifyDuration = new Trend('verify_duration');

// 测试配置（可通过命令行参数覆盖）
export const options = {
  vus: 50,              // 50 个虚拟用户
  duration: '2m',       // 持续 2 分钟
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // P95<500ms, P99<1000ms
    errors: ['rate<0.01'],                            // 错误率 < 1%
    http_req_failed: ['rate<0.01'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

// 测试用户池
const TEST_USERS = Array.from({ length: 50 }, (_, i) => ({
  email: `test-user-${i + 1}@xdj.com`,
  password: 'Test@123456',
}));

// 每个 VU 的初始化
export function setup() {
  // 预热：检查服务是否可达
  const healthRes = http.get('http://localhost:4001/health');
  check(healthRes, {
    'Portal 服务可达': (r) => r.status === 200,
  });
  console.log(`✅ Portal 服务可达 (${healthRes.status})`);
  return { users: TEST_USERS };
}

export default function (data) {
  const user = data.users[Math.floor(Math.random() * data.users.length)];

  group('SSO 登录流程', () => {
    // 步骤 1：登录获取令牌
    const loginPayload = JSON.stringify({
      email: user.email,
      password: user.password,
    });

    const loginRes = http.post('http://localhost:4001/api/auth/login', loginPayload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'POST /api/auth/login' },
    });
    loginDuration.add(loginRes.timings.duration);

    const loginOk = check(loginRes, {
      '登录返回 200/401': (r) => r.status === 200 || r.status === 401,
    });
    errorRate.add(!loginOk);

    // 如果登录成功，继续验证令牌
    if (loginRes.status === 200) {
      try {
        const body = JSON.parse(loginRes.body);
        const token = body.token || body.data?.token;

        if (token) {
          // 步骤 2：验证令牌
          const verifyRes = http.get('http://localhost:4001/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            tags: { name: 'GET /api/auth/me' },
          });
          verifyDuration.add(verifyRes.timings.duration);

          check(verifyRes, {
            '令牌验证成功': (r) => r.status === 200,
          });

          // 步骤 3：刷新令牌
          const refreshRes = http.post('http://localhost:4001/api/auth/refresh', JSON.stringify({ token }), {
            headers: { 'Content-Type': 'application/json' },
            tags: { name: 'POST /api/auth/refresh' },
          });

          check(refreshRes, {
            '刷新令牌返回': (r) => r.status === 200 || r.status === 400 || r.status === 401,
          });
        }
      } catch (e) {
        console.error(`解析响应失败: ${e.message}`);
      }
    }
  });

  // 随机等待 1-3 秒
  sleep(Math.random() * 2 + 1);
}

export function teardown(data) {
  console.log('✅ 登录压测完成');
}
