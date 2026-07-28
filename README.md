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
  hooks/        # 业务 hooks(useBookmarks / useCategories / useSearch …)
  services/     # favicon、导入导出、数据库
  lib/           # 工具函数(cxn / tailwind-merge)
  utils/        # search / url / storage
  types/        # 类型定义
tests/
  unit/         # 单元测试
  integration/ # 集成测试
  e2e/          # Playwright 端到端测试
```

## 开发

```bash
pnpm install
pnpm dev          # 启动开发服务器
pnpm build        # 类型检查 + 生产构建
pnpm preview      # 预览构建产物
```

## 测试

```bash
pnpm test         # Vitest 单元 + 集成
pnpm test:watch   # 监听模式
pnpm test:e2e     # Playwright E2E
```

## 代码质量

```bash
pnpm lint         # ESLint
pnpm format       # Prettier
pnpm typecheck    # tsc --noEmit
```

## 部署

生产构建使用 `/guide/` 作为 base 路径,需部署在域名的 `/guide/` 子路径下。本地开发用 `/`。
