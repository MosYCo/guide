# Moss Guide · 书签导航

基于浏览器的本地书签导航应用,数据持久化在 IndexedDB,无需后端。

## 技术栈

- **React 18** + **Vite 5** + **TypeScript**
- **Tailwind CSS 3** + **shadcn/ui**(基于 Radix UI)
- **IndexedDB**(`idb`)本地存储
- **Vitest**(单元 / 集成测试)、**Playwright**(E2E)
- ESLint + Prettier

## 目录结构

```
src/
  components/   # 组件(ui / bookmark / category / layout)
  hooks/        # 业务 hooks(useBookmarks / useCategories / useTheme / useMediaQuery / useVirtualList)
  services/     # favicon、导入导出、数据库
  lib/          # 工具函数(cn / tailwind-merge)
  styles/       # 设计 token
  utils/        # search / url / storage
  types/        # 类型定义
tests/
  unit/         # 单元测试
  integration/  # 集成测试
  e2e/          # Playwright 端到端测试
  fixtures/     # 测试数据
  helpers/      # 测试辅助函数
```

## 文档

- [docs/README.md](./docs/README.md) — 文档索引
- [docs/engineering-principles.md](./docs/engineering-principles.md) — 工程原则
- [docs/design-decisions.md](./docs/design-decisions.md) — 设计决策
- [docs/data-model.md](./docs/data-model.md) — 数据模型与 IndexedDB schema
- [docs/ui-contract.md](./docs/ui-contract.md) — UI 契约
- [docs/quality-baseline.md](./docs/quality-baseline.md) — 质量基线
- [docs/quickstart.md](./docs/quickstart.md) — 手工验收

## 环境要求

- Node >= 24(见 `.nvmrc`)
- pnpm 11(见 `package.json` 的 `packageManager`)

Favicon 默认通过 Google S2 API 获取,图片请求带 `referrerPolicy="no-referrer"`;设置 `VITE_FAVICON_REMOTE=false` 可禁用外部图标请求,回退为首字母/纯色块。

## 开发

```bash
pnpm install
pnpm dev          # 启动开发服务器
pnpm build        # 类型检查 + 生产构建
pnpm build:prod   # 生产构建(部署用,等价于 pnpm build)
pnpm preview      # 预览构建产物
```

## 测试

```bash
pnpm test         # Vitest 单元 + 集成
pnpm test:watch   # 监听模式
pnpm exec playwright install chromium  # 首次运行 E2E
pnpm test:e2e     # Playwright E2E
```

## 代码质量

```bash
pnpm lint          # ESLint,零警告
pnpm format        # Prettier 写入
pnpm format:check  # Prettier 校验
pnpm typecheck     # tsc -b
pnpm check         # lint + typecheck + test + build
```

## 部署

生产构建使用 `/guide/` 作为 base 路径,需部署在域名的 `/guide/` 子路径下。本地开发用 `/`。

push 到 `main` 会先运行 lint / typecheck / test / build,通过后由 CI 产物部署到 `gh-pages`;PR 由 `.github/workflows/ci.yml` 执行同一套质量门。
