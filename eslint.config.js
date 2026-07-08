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
      "**/mobile/android/**",
      "**/mobile/ios/**",
      "scm/*.js",
      "**/*.cjs",
      "portal/server/tests/setup.js",
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
      "no-undef": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "off",
      "no-debugger": "warn",
      "no-duplicate-imports": "warn",
      "no-template-curly-in-string": "warn",
      "no-unreachable": "warn",
      "no-unsafe-optional-chaining": "warn",
      "no-prototype-builtins": "off",
      "no-empty": "off",
      "no-useless-assignment": "off",
      "no-fallthrough": "off",
      "no-cond-assign": "off",
      "no-constant-condition": "off",
      "no-func-assign": "off",
      "no-useless-escape": "off",
      "valid-typeof": "off",
      "preserve-caught-error": "off",
      "no-control-regex": "off",
      "getter-return": "off",
      "no-misleading-character-class": "off",
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
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "off",
      "no-debugger": "warn",
      "no-undef": "off",
      "no-unreachable": "warn",
      "no-prototype-builtins": "off",
      "no-empty": "off",
      "no-fallthrough": "off",
      "no-cond-assign": "off",
      "no-useless-assignment": "off",
      "preserve-caught-error": "off",
      "no-control-regex": "off",
      "no-case-declarations": "off",
      "react-hooks/exhaustive-deps": "off",
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
      "no-undef": "off",
      "no-prototype-builtins": "off",
      "no-empty": "off",
    },
  },

  // 根目录脚本 + shared 目录
  {
    files: ["*.js", "scripts/**/*.js", "**/scripts/**/*.{js,cjs,mjs}", "**/shared/**/*.js", "**/shared/**/*.mjs"],
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
      "no-undef": "off",
      "no-prototype-builtins": "off",
      "no-empty": "off",
      "no-fallthrough": "off",
      "no-cond-assign": "off",
      "no-useless-assignment": "off",
      "no-constant-condition": "off",
    },
  },

  // 浏览器端独立脚本（如 scm/app.js）
  {
    files: ["scm/**/*.js", "**/public/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "warn",
      "no-console": "off",
      "no-prototype-builtins": "off",
      "no-empty": "off",
      "no-fallthrough": "off",
      "no-cond-assign": "off",
      "no-useless-assignment": "off",
      "no-redeclare": "off",
    },
  },

  // .cjs 独立脚本（CommonJS）
  {
    files: ["**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "warn",
      "no-console": "off",
      "no-prototype-builtins": "off",
      "no-empty": "off",
      "no-fallthrough": "off",
      "no-cond-assign": "off",
      "no-useless-assignment": "off",
      "no-constant-condition": "off",
      "valid-typeof": "off",
      "no-useless-escape": "off",
      "no-control-regex": "off",
      "getter-return": "off",
    },
  },

  // .mjs ES 模块脚本
  {
    files: ["**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "warn",
      "no-console": "off",
      "no-prototype-builtins": "off",
      "no-empty": "off",
      "no-fallthrough": "off",
      "no-cond-assign": "off",
      "no-useless-assignment": "off",
      "no-constant-condition": "off",
      "no-dupe-else-if": "off",
    },
  },

  // Vite 配置文件
  {
    files: ["**/vite.config.js", "**/vite.config.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "warn",
      "no-console": "off",
      "no-prototype-builtins": "off",
      "no-empty": "off",
    },
  },

  // 测试脚本（k6 / vitest）
  {
    files: ["tests/**/*.js", "**/tests/**/*.js", "**/*.test.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2022,
        http: "readonly",
        check: "readonly",
        sleep: "readonly",
        group: "readonly",
        think: "readonly",
        __ENV: "readonly",
        __VU: "readonly",
        __ITER: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "warn",
      "no-console": "off",
      "no-prototype-builtins": "off",
      "no-empty": "off",
      "no-fallthrough": "off",
    },
  },

  // WorkBuddy 内部验证脚本 / Seed 脚本
  {
    files: ["**/.workbuddy/**/*.js", "**/.workbuddy-verify/**/*.js", "**/seed.js", "**/seed.ts", "**/seed.mjs", "**/prisma/seed*.js", "**/prisma/seed*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2022,
      },
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "warn",
      "no-console": "off",
      "no-prototype-builtins": "off",
      "no-empty": "off",
      "no-fallthrough": "off",
    },
  },
];
