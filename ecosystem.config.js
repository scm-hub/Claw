/**
 * PM2 Ecosystem 配置 — 杭州鲜当家全品类食用菌综合管理平台
 * 使用方式：
 *   pm2 start ecosystem.config.js          # 启动所有服务
 *   pm2 restart all                        # 重启所有
 *   pm2 stop all                           # 停止所有
 *   pm2 logs                               # 查看日志
 *   pm2 monit                              # 监控面板
 */

module.exports = {
  apps: [
    // ========== Portal 统一平台 (SSO) ==========
    {
      name: 'portal-server',
      cwd: './portal/server',
      script: 'src/index.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 4001,
      },
      // 内存超过 300MB 自动重启
      max_memory_restart: '300M',
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/portal-error.log',
      out_file: './logs/portal-out.log',
      merge_logs: true,
      // 崩溃自动重启
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },

    // ========== HRMS 人力资源 ==========
    {
      name: 'hrms-server',
      cwd: './hrms/server',
      script: 'src/index.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 4002,
      },
      max_memory_restart: '300M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/hrms-error.log',
      out_file: './logs/hrms-out.log',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },

    // ========== SCM 供应链管理 ==========
    {
      name: 'scm-server',
      cwd: './xdj-scm/server',
      script: 'src/index.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 4003,
      },
      // SCM 业务最重，内存限制放宽
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/scm-error.log',
      out_file: './logs/scm-out.log',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },

    // ========== AI Service 智能服务 ==========
    {
      name: 'ai-server',
      cwd: './ai-service/server',
      script: 'src/index.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 4004,
      },
      max_memory_restart: '300M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/ai-error.log',
      out_file: './logs/ai-out.log',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },

    // ========== MDM 主数据管理 ==========
    {
      name: 'mdm-server',
      cwd: './mdm/server',
      script: 'src/index.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 4005,
      },
      max_memory_restart: '300M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/mdm-error.log',
      out_file: './logs/mdm-out.log',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },

    // ========== Workflow Engine 审批流 ==========
    {
      name: 'workflow-engine',
      cwd: './workflow-engine/server',
      script: 'src/index.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 4011,
      },
      max_memory_restart: '300M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/workflow-error.log',
      out_file: './logs/workflow-out.log',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },

    // ========== Gateway 统一网关 ==========
    {
      name: 'gateway',
      cwd: './',
      script: 'gateway.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 5174,
      },
      max_memory_restart: '200M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/gateway-error.log',
      out_file: './logs/gateway-out.log',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
