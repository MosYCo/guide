# Quickstart: 前端显示层 UI/UX 系统性优化

**Feature**: `001-ui-ux-overhaul` | **Date**: 2026-07-28 | **Phase**: 1

> 本文件是**验证指南**,非实现代码。完整实现步骤由 `/speckit-tasks` 生成的 `tasks.md` 承载。契约见 [contracts/ui-contract.md](./contracts/ui-contract.md),数据 token 见 [data-model.md](./data-model.md),技术依据见 [research.md](./research.md)。

## 前置条件

- Node 18+ / pnpm 已安装
- 已 `pnpm install`(依赖就绪)
- 浏览器:Chrome/Edge/Firefox/Safari 最新版

## 启动

```bash
pnpm dev          # 开发服务器(默认 /)
```

打开浏览器控制台后,按下方场景逐项验证。

---

## 场景 1:视觉走查(SC-001)

**目标**:间距/对齐/层次/对比度/状态反馈在亮/暗主题下统一。

1. 访问应用,切换亮/暗主题(Header 主题按钮)。
2. 逐屏走查:Header / CategoryNav(侧栏与移动标签栏)/ BookmarkGrid / BookmarkCard / Dialog / Toast。
3. 间距、对齐、阴影 elevation、状态(悬停/聚焦/选中/加载/空/错误)应一致。
4. 用浏览器 DevTools 的对比度检查器(或 Lighthouse Accessibility)核对正文文本对比度 ≥ WCAG AA(4.5:1,大文本 3:1)。

**预期**:走查清单逐条通过。

---

## 场景 2:键盘流(SC-002)

**目标**:仅键盘完成核心流程。

1. 按 `Ctrl/Cmd+N` → 新建书签对话框,焦点在表单首项。
2. Tab 填写 → Enter 提交 → toast 反馈。
3. Tab 到任一卡片 → Enter 打开新标签 → 返回。
4. Tab 到卡片"更多"按钮 → Enter → 下拉菜单 → ↓ 到"删除" → Enter → 确认对话框,焦点落"取消"。
5. `Ctrl/Cmd+K` → 命令面板 → ↑↓ 选择 → Enter 跳转。
6. Tab 到主题切换 → Enter 循环 light→dark→system。

**预期**:全程焦点可见、顺序合理、不跳隐藏元素;Enter 在确认对话框不触发删除(默认焦点在"取消")。

---

## 场景 3:响应式断点(SC-003)

**目标**:标准断点无横向溢出、无错位。

1. DevTools 设备模拟,逐档设视口宽度:640 / 768 / 1024 / 1280 / 1536 px。
2. 每档截图走查布局:侧栏(≥1024)/ 标签栏(<1024)/ 网格列数 / 底部 Tab。
3. 横向拖动窗口宽度,观察断点切换是否平滑。
4. 系统开启"减少动效"(DevTools → Rendering → Emulate prefers-reduced-motion),触发动画,确认降级。
5. 移动端(如 360px)单手操作,确认底部 Tab 在拇指可达区。

**预期**:无横向滚动条、无内容溢出、动画降级生效。

---

## 场景 4:性能基线(SC-004)

**目标**:500+ 书签下 LCP/TTI/INP/CLS 达标。

1. 先用导入功能(或脚本)注入 500+ 书签数据集。
2. `pnpm build && pnpm preview`(或 `pnpm build:prod`)构建生产产物。
3. Chrome DevTools → Lighthouse → 性能(移动端模拟 + 3G 节流)→ 运行。
4. 核对:LCP < 1.5s、TTI < 2s、INP < 200ms、CLS < 0.1。
5. 快速滚动书签列表,观察是否 60fps(虚拟滚动生效)。

**预期**:四指标达标率 100%;滚动无掉帧。

---

## 场景 5:主题无闪烁(SC-005)

**目标**:暗/亮切换无 FOUC。

1. 设系统/存储主题为 dark,刷新页面。
2. 观察:首屏不应先亮后暗闪烁(FOUC 防护脚本在 React 挂载前已定 `.dark`)。
3. 反复切换主题,确认即时一致。

**预期**:无闪烁。

---

## 场景 6:极端字段(SC-006)

**目标**:极端字段不破布局。

1. 新建书签,标题填超长文本(如 200 字符)。
2. URL 填无效值(如 `not-a-url`),观察校验降级。
3. 构造 favicon 失效(断网或填不存在的 icon URL),观察 `onError` → `fallbackIcon` 降级。
4. 运行 `pnpm test`(Vitest),确认 `tests/unit` 的极端字段单测通过。

**预期**:超长标题 `line-clamp-1` 省略;无效 URL 提示且不破布局;favicon 降级为首字母图标。

---

## 自动化测试

```bash
pnpm test          # Vitest 单元 + 集成(含极端字段等)
pnpm test:e2e      # Playwright E2E(视觉走查/键盘流/断点矩阵/性能/FOUC)
pnpm lint          # ESLint 零警告
pnpm typecheck     # tsc --noEmit
pnpm build         # 类型检查 + 生产构建
```

E2E 覆盖矩阵对应 SC-001~006,详见 [contracts/ui-contract.md](./contracts/ui-contract.md) 各节 FR 编号。
