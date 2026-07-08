/**
 * Commitlint 配置 — Conventional Commits 规范
 * 参考: https://www.conventionalcommits.org/zh-hans/v1.0.0/
 *
 * 允许的提交类型:
 *   feat:     新功能
 *   fix:      修复 bug
 *   refactor: 代码重构
 *   perf:     性能优化
 *   test:     测试相关
 *   docs:     文档更新
 *   style:    代码格式
 *   chore:    构建/工具链
 *   ci:       CI/CD 配置
 *   build:    构建系统
 *   revert:   回滚
 */

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'refactor',
        'perf',
        'test',
        'docs',
        'style',
        'chore',
        'ci',
        'build',
        'revert',
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'subject-min-length': [2, 'always', 3],
    'subject-full-stop': [0, 'never'],
    'header-max-length': [2, 'always', 100],
  },
};
