import js from "@eslint/js";
import globals from "globals";

export default [
  // 全局忽略
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/uploads/**",
      "**/.vite/**",
      "**/.snapshots/**",
      "**/.workbuddy/**",
    ],
  },

  // 推荐规则基础
  js.configs.recommended,

  // Node.js 后端代码
  {
    files: ["**/server/src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      "no-debugger": "warn",
      "no-duplicate-imports": "warn",
      "no-template-curly-in-string": "warn",
      "no-unreachable": "warn",
      "no-unsafe-optional-chaining": "warn",
      "valid-typeof": "error",
    },
  },

  // React 前端代码
  {
    files: ["**/client/src/**/*.{js,jsx}", "**/mobile/src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      "no-debugger": "warn",
      "no-undef": "off",
      "no-unreachable": "warn",
    },
  },

  // Prisma schema 文件
  {
    files: ["**/prisma/**/*.js"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "no-unused-vars": "off",
    },
  },

  // 根目录脚本
  {
    files: ["*.js", "scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
    },
  },
];
