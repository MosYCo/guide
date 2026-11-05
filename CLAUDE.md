# CLAUDE.md — Moss Guide 书签导航

本文件是编码代理在本仓库内的工作约定,只承载项目规则与操作指令。工程原则见 [`docs/engineering-principles.md`](./docs/engineering-principles.md);项目简介与技术栈见 [`README.md`](./README.md);架构、数据模型、UI 契约与质量基线见 [`docs/README.md`](./docs/README.md)。

## 项目事实

- 纯前端本地书签导航:React 18 + Vite 5 + TypeScript(strict)+ Tailwind 3 + shadcn/ui(Radix);IndexedDB(`idb`)持久化,无后端,纯 CSR。
- 环境要求:Node >= 24、pnpm 11(以 `.nvmrc` 和 `package.json` 的 `packageManager` 为准)。
- 入口 `src/main.tsx` → `src/App.tsx`;路径别名 `@/*` → `src/*`。
- 分层职责:
  - `src/services/db.ts` — 唯一直接访问 IndexedDB 的模块(事务、级联、批量写入)。
  - `src/hooks/useBookmarks.ts` / `useCategories.ts` — 领域状态与刷新;后台刷新用 `refresh({ silent: true })`,并用请求序号防止旧结果覆盖新状态。
  - `src/App.tsx` — 页面编排、跨数据源刷新、快捷键与操作反馈;不要在本层以下重复这些职责。
  - `src/components/ui/` — shadcn 派生基础组件;业务组件位于 `bookmark/`、`category/`、`layout/`。
  - `src/utils/` — 无副作用的纯函数;导入导出与 favicon 解析在 `src/services/`。
- 多标签同步使用 `BroadcastChannel('moss-guide-data')`;本地写入成功后由 `App` 广播,其他标签静默刷新。
- 生产构建 base 为 `/guide/`(开发为 `/`);部署产物由 CI 发布到 `gh-pages`。

## 语言规则(混合语言操作)

- **敲代码时**:标识符(变量、函数、类型、组件、文件名)用英文,匹配既有命名风格(`useBookmarks`、`BookmarkCard`)。
- **字符串与注释**:面向用户的展示文案与注释优先中文;若周边既有代码为英文,跟随既有风格,不强加中文。
- **文档与代码混排**:保持标识符为原文英文,说明性文字为中文,不机械翻译(例如文档里写 `useBookmarks` hook,不写成“使用书签钩子”)。
- **提交时**:英文 Conventional Commits,与既有提交一致(`feat:` / `fix:` / `chore:` / `docs:` / `refactor:` / `perf:`)。

## 改动约定

- 改代码前先读相邻实现与测试,匹配既有命名、状态管理与错误处理模式。
- 只做与当前请求直接相关的改动;不顺手重构、格式化或“优化”无关代码;因自身改动产生的未用 import / 变量 / 函数必须清理。
- 优先复用现有 hooks 与工具:`useMediaQuery`、`useVirtualList`、`useRootFontSize`、`safeGetItem` / `safeSetItem`、`validateAndNormalizeUrl`;不要为单处使用新建抽象。
- `src/components/ui/*` 保持 shadcn 原样,通过 props / `className` 组合;需要修改基础组件时先说明理由。
- 视觉实现复用现有 token 与工具类:`focus-ring`、`success` / `warning` / `info`、`text-display` / `text-h1` / `text-body` / `text-caption`、`shadow-elevation-*`;不另建平行体系。
- 类型或公开 API 变更必须同步更新调用方、测试与相关文档,并保持 `pnpm typecheck` 通过。

## 数据与行为不变量

- URL 仅允许 `http` / `https`;所有写入与导入路径统一走 `validateAndNormalizeUrl`。裸域名默认补 `https://`,`localhost`、`127.0.0.1`、`[::1]` 默认 `http`。
- 书签 URL 允许重复;表单与导入预览只提示重复数量,不阻止保存。
- 分类名唯一是应用层约束:创建 / 重命名在单事务内检查;导入按名称合并到已有分类。数据库没有唯一索引。
- 删除分类必须在同一事务内把关联书签的 `categoryId` 置为 `null`;书签本身不删除。
- 删除书签是硬删除,没有软删除、回收站或撤销。
- JSON / HTML 导入会重新生成 ID、重新校验 URL 并重映射 `categoryId`;分类与书签在同一个跨 store 事务写入,失败时整体回滚。单次导入上限 10 MB / 50,000 条,HTML 嵌套上限 100 层。
- 持久化契约保持兼容:IndexedDB `bookmark-navigation` v1(`bookmarks` / `categories`);`localStorage` 键 `bookmark-theme` 必须与 `index.html` 内联 FOUC 脚本一致;侧栏折叠键为 `category-nav-collapsed`;选中分类键为 `selected-category-id`(空字符串表示“全部”)。
- 远程 favicon 默认走 Google S2;`VITE_FAVICON_REMOTE=false` 时禁用外部请求。降级链:favicon → 首字母 SVG → 纯色块。
- 破坏性操作使用 `AlertDialog`,默认焦点落“取消”;表单失败保留已填输入并就地展示错误。

## 测试与质量门

- 测试分层:`tests/unit/` 放纯函数与数据层;`tests/integration/` 用 Testing Library 测 hooks / 组件;`tests/e2e/` 覆盖用户路径。涉及用户路径的 UI 变更必须补 E2E。
- 修复缺陷先写复现测试;新增校验先写失败测试;重构保证前后测试均通过。
- Vitest 使用 jsdom + `fake-indexeddb`,只收集 `tests/unit` 与 `tests/integration`;Playwright 只配置 Chromium,`pnpm test:e2e` 默认由 `pnpm dev` 启动服务器。
- 覆盖率门槛:`lines` / `statements` 30%、`functions` 55%、`branches` 60%(`pnpm test:coverage`)。不要下调门槛来绕过失败。

收尾命令:

```bash
pnpm lint          # ESLint,零警告
pnpm format:check  # Prettier 校验
pnpm typecheck     # tsc -b
pnpm test          # Vitest 单元 + 集成
pnpm test:coverage # Vitest + 覆盖率门槛
pnpm test:e2e      # Playwright E2E(首次先 pnpm exec playwright install chromium)
pnpm build         # tsc -b && vite build
```

- 最低门槛:`pnpm lint`、`pnpm typecheck`、`pnpm test` 全绿。
- CI 的完整质量门(PR 与 `main`)还会运行 `pnpm format:check`、`pnpm test:coverage`、`pnpm build`、`pnpm test:e2e`;`pnpm check` 只等于 lint + typecheck + test + build,不能替代完整门禁。
- 任一环节失败,如实报告命令与输出,不掩盖、不跳过。

## 提交

- 使用英文 Conventional Commits,一次提交只表达一个逻辑变更。
- 行为、数据模型或 UI 契约发生变化时,同步更新 `docs/` 下对应文档;纯流程 / 工具产物不写入文档。

## 发现问题

- 发现与项目原则或既有契约冲突的设计,先说明问题、原因与修改方案,等用户确认后再改。
- 发现无关死代码或文档与实现不一致时,先报告,不擅自删除或改写;数据模型与行为以当前源码和测试为准,文档差异需在改动中同步或明确记录。
