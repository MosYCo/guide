# 手工验收指南:前端显示层 UI/UX 系统性优化

> **来源**:迁移自 `pre-speckit-removal:specs/001-ui-ux-overhaul/quickstart.md`
> **迁移日期**:2026-11-03

本文件是验证指南,不是实现代码。组件与交互契约见 [ui-contract.md](./ui-contract.md),设计 token 见 [data-model.md](./data-model.md),设计决策见 [design-decisions.md](./design-decisions.md)。

## 前置条件

- Node >= 24 与 pnpm 11 已安装(以仓库根 `.nvmrc` 与 `package.json` 的 `packageManager` 为准)
- 已执行 `pnpm install`(依赖就绪)
- 浏览器:Chrome / Edge / Firefox / Safari 最新版
- 首次运行 E2E 前安装 Playwright Chromium:`pnpm exec playwright install chromium`

## 启动

```bash
pnpm dev          # 开发服务器,默认 http://localhost:5173
```

打开浏览器控制台后,按下方 6 个场景逐项验证。

---

## 场景 1:视觉走查

**目标**:间距、对齐、层次、对比度、状态反馈在亮/暗主题下统一。

1. 访问应用,切换亮/暗主题(Header 主题按钮,三态循环 light → dark → system)。
2. 逐屏走查:Header / CategoryNav(PC 侧栏、移动端底部 Tab 与分类抽屉)/ BookmarkGrid / BookmarkCard / 表单与确认 Dialog / Toast / 导入预览 Dialog。
3. 间距、对齐、阴影 elevation、状态(悬停/聚焦/选中/加载/空/错误)应一致。
4. 悬停书签卡片,确认升降与阴影反馈;用键盘聚焦卡片,确认统一 focus ring。
5. 用浏览器 DevTools 的对比度检查器(或 Lighthouse Accessibility)核对正文文本对比度 ≥ WCAG AA(4.5:1,大文本 3:1)。
6. 点击 Header 的导出按钮,确认生成 JSON 下载;点击导入按钮,确认先出现导入预览 Dialog,取消后原数据不变。

**预期**:走查清单逐条通过;导入/导出入口在亮/暗主题下视觉与反馈一致。

---

## 场景 2:键盘流

**目标**:仅用键盘完成核心流程。

1. 按 `Ctrl/Cmd+N` → 新建书签对话框,焦点在表单首项(URL)。
2. Tab 填写 → Enter 提交 → toast 反馈。
3. Tab 到任一卡片 → Enter 打开新标签 → 返回。
4. Tab 到卡片"更多"按钮 → Enter → 下拉菜单 → ↓ 到"删除" → Enter → 确认对话框,焦点落"取消"。
5. `Ctrl/Cmd+K` → 命令面板 → ↑↓ 选择 → Enter 跳转;Esc 关闭。
6. Tab 到主题切换 → Enter 循环 light → dark → system。
7. 移动端视口下 Tab 到底部 Tab,Enter 切换"全部"/打开"分类"抽屉;抽屉内焦点不逃逸,Esc 关闭。

**预期**:全程焦点可见、顺序合理、不跳隐藏元素;Enter 在确认对话框不触发删除(默认焦点在"取消");命令面板打开时焦点落输入框。

---

## 场景 3:响应式断点

**目标**:标准断点无横向溢出、无错位。

1. DevTools 设备模拟,逐档设视口宽度:360 / 640 / 768 / 1024 / 1280 / 1536 px。
2. 每档截图走查布局:移动端(<768px)底部 Tab 与分类抽屉、768px 平板中间档、≥1024px PC 侧栏、网格列数。
3. 横向拖动窗口宽度,观察断点切换是否平滑。
4. 系统开启"减少动效"(DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`),触发动画,确认位移与阴影动效降级、即时态切换保留。
5. 移动端(如 360px)单手操作,确认底部 Tab 在拇指可达区。

**预期**:无横向滚动条、无内容溢出、动画降级生效;底部 Tab 位于视口下半部拇指可达区。

---

## 场景 4:性能基线

**目标**:500+ 书签下 LCP / TTI / INP / CLS 达标。

1. 用 Header 的导入功能导入 `tests/fixtures/500-bookmarks.json`(或通过脚本注入 500+ 书签数据集)。
2. `pnpm build && pnpm preview`(或 `pnpm build:prod`;生产构建 base 为 `/guide/`,以 Vite 输出的 Preview URL 为准)构建并预览生产产物。
3. Chrome DevTools → Lighthouse → 性能(移动端模拟 + 3G 节流)→ 运行。
4. 核对:LCP < 1.5s、TTI < 2s、INP < 200ms、CLS < 0.1。
5. 快速滚动书签列表,观察是否 60fps;数据量超过虚拟滚动阈值时,仅渲染可视区。

**预期**:四指标达标率 100%;滚动无掉帧;导入 500+ 书签后列表仍可流畅使用。

---

## 场景 5:主题无闪烁

**目标**:暗/亮切换无 FOUC。

1. 将主题设为 dark(Header 主题按钮或 localStorage 键 `bookmark-theme`),刷新页面。
2. 观察首屏:不应先亮后暗闪烁(FOUC 防护脚本在 React 挂载前已定 `.dark`)。
3. 切到 system,将系统偏好设为暗色,刷新页面,确认首帧即为暗色。
4. 反复切换主题,确认即时一致。

**预期**:无闪烁;首帧 `document.documentElement.classList` 与存储/系统偏好一致。

---

## 场景 6:极端字段

**目标**:极端字段不破布局。

1. 新建书签,标题填超长文本(表单上限 100 字符;如需 200 字符样本,可通过导入 JSON 注入)。
2. URL 填无效值(如 `not-a-url`),观察校验降级。
3. 构造 favicon 失效(断网,或填写不存在的 icon URL),观察 `onError` → 首字母图标降级;若首字母图标也失败,进一步降级为纯色块。
4. 运行 `pnpm test`(单元/集成)与 `pnpm test:e2e`(极端字段场景),确认相关测试通过。

**预期**:超长标题 `line-clamp-1` 省略且保留 `title` 全文;无效 URL 行内提示且不破布局;favicon 降级为首字母图标或纯色块。

---

## 自动化测试

```bash
pnpm test          # Vitest 单元 + 集成
pnpm test:e2e      # Playwright E2E
pnpm lint          # ESLint 零警告
pnpm typecheck     # tsc --noEmit
pnpm build         # 类型检查 + 生产构建
```

E2E 覆盖与手工场景的对应关系:

| 手工场景   | E2E 测试文件                               |
| ---------- | ------------------------------------------ |
| 视觉走查   | `tests/e2e/visual-walkthrough.spec.ts`     |
| 键盘流     | `tests/e2e/keyboard-flow.spec.ts`          |
| 响应式断点 | `tests/e2e/responsive-breakpoints.spec.ts` |
| 性能基线   | `tests/e2e/performance-baseline.spec.ts`   |
| 主题无闪烁 | `tests/e2e/theme-fouc.spec.ts`             |
| 极端字段   | `tests/e2e/extreme-fields.spec.ts`         |
| 导入导出   | `tests/e2e/import-export.spec.ts`          |

E2E 的具体断言与覆盖范围见 [ui-contract.md](./ui-contract.md) 与 [quality-baseline.md](./quality-baseline.md)。
