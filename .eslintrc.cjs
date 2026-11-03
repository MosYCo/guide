module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules', '.eslintrc.cjs', 'playwright-report'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
  },
  overrides: [
    {
      files: ['*.config.{ts,js}'],
      parserOptions: { project: ['./tsconfig.node.json'] },
    },
    {
      // shadcn/ui 组件同时导出组件与 variants/工具函数,fast-refresh 规则不适用
      files: ['src/components/ui/**/*.{ts,tsx}'],
      rules: {
        'react-refresh/only-export-components': 'off',
      },
    },
    {
      files: ['tests/unit/**/*.{ts,tsx}', 'tests/integration/**/*.{ts,tsx}'],
      extends: ['plugin:testing-library/react', 'plugin:jest-dom/recommended'],
    },
    {
      files: ['tests/e2e/**/*.ts'],
      extends: ['plugin:playwright/recommended'],
      env: { node: true },
      rules: {
        // 现有 E2E 是顺序流程/性能探针,这些风格规则会产生大量噪声
        'playwright/no-wait-for-selector': 'off',
        'playwright/prefer-locator': 'off',
        'playwright/no-wait-for-timeout': 'off',
        'playwright/no-conditional-in-test': 'off',
        'playwright/no-conditional-expect': 'off',
      },
    },
  ],
}
