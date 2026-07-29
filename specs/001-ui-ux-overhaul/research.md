# Research: 前端显示层 UI/UX 系统性优化

**Feature**: `001-ui-ux-overhaul` | **Date**: 2026-07-28 | **Phase**: 0

本文件记录四维度优化的技术决策、依据与备选。所有决策均源自 spec.md 的 Clarifications(FR-001~019)与既有代码库现状,无 `[NEEDS CLARIFICATION]` 残留。

---

## 1. 色彩体系:沿用 HSL 变量 + 补语义色阶

**Decision**: 保留现有橙色 primary(`24.6 95% 53.1%`)与 shadcn HSL 变量体系,校准明度/对比度达 WCAG AA,新增 `--success` / `--warning` / `--info` 三组语义色阶(各含 DEFAULT + foreground),文档化为 token。

**Rationale**:
- 现有 `src/index.css` 已用 HSL CSS 变量(`--background`、`--primary` 等),`tailwind.config.js` 已映射为 `hsl(var(--*))` token。沿用此体系零迁移成本,守硬约束。
- 当前无 success/warning/info 色阶,加载/空/错误状态只能复用 `destructive`/`muted`,反馈不语义化(违反 FR-003)。
- WCAG AA 要求正文 ≥4.5:1、大文本 ≥3:1;现 dark 模式 `--muted-foreground: 0 0% 60%` 对 `--background: 0 0% 10%` 对比约 7:1 达标,但需逐 token 校验。

**Alternatives**:
- 全面重设色板:违反"沿用当前设计"硬约束,弃。
- 仅校准对比不补语义色:无法满足 FR-003 状态反馈语义化,弃。

**Token 落地**:新增 `src/styles/tokens.css`,亮/暗各补 3 组语义色;`tailwind.config.js` 的 `colors` 增 `success`/`warning`/`info` 映射。

---

## 2. 字体排版:系统字体栈 + type scale 文档化

**Decision**: 沿用现有系统字体栈(`ui-sans-serif, system-ui, ...`),补齐四档 type scale(显示/标题/正文/辅助)、行高、字重梯度与中文优化字距(`font-feature-settings`),文档化为 token。

**Rationale**:
- 现有 `index.css` 已设系统字体栈,无 web 字体加载(零请求,利于 LCP)。沿用守硬约束且利于性能。
- 中文优化:`font-feature-settings: "palt" 1` 或 `letter-spacing` 微调改善中英混排;`line-height` 1.5–1.75 区间适配中文。
- type scale 文档化为 token(如 `--text-display` / `--text-h1` / `--text-body` / `--text-caption`)供走查勾验(SC-001)。

**Alternatives**:
- 引入中文 web 字体(思源/HarmonyOS Sans):触"沿用当前设计"边界(视觉语言变更),且增加字体请求拖慢 LCP,弃。
- 仅统一现状不文档化:走查缺可勾验标尺,弃。

---

## 3. 圆角/阴影:统一 elevation token

**Decision**: 沿用 `--radius: 0.5rem`,补圆角阶梯 sm/md/lg(`calc(var(--radius) - N)`);新增四档阴影 elevation(sm/md/lg/popover),文档化为 token。

**Rationale**:
- `tailwind.config.js` 已有 `borderRadius` 的 lg/md/sm 映射 `--radius`,沿用此模式。
- 现有阴影用 Tailwind 默认 `shadow-md` 等零散值,弹层与卡片混用,违反 FR-001 一致性。
- 四档 elevation:card(md)/hover(lg)/popover/overlay 分层,可走查。

**Alternatives**:
- 重设圆角基准值:触硬约束(视觉语言变更),弃。
- 仅统一阴影不补圆角阶梯:阶梯不完整,弃。

---

## 4. 深色模式:沿用三态 + FOUC 防护

**Decision**: 沿用 `useTheme`(light/dark/system + matchMedia 监听),补 FOUC 防护(内联阻塞脚本在首屏渲染前定主题)与可达性。

**Rationale**:
- 现有 `useTheme` 三态切换已就绪,`applyTheme` 切 `.dark` class。沿用守硬约束。
- FOUC 风险:`useTheme` 在 React 挂载后才 apply,首屏会闪亮色。防护:在 `index.html` `<head>` 内联一小段阻塞脚本,读 localStorage/system 偏好并在 React 挂载前设 `.dark` class。这是 FOUC 防护的标准做法。
- 可达性:`ThemeToggle` 已有 `aria-label`,需校验三态循环的焦点与键盘可达。

**Alternatives**:
- 重设暗色色板:触硬约束,弃。
- 仅校准对比不防 FOUC:SC-005 仍闪,弃。

---

## 5. 状态反馈:统一占位组件 + 语义色

**Decision**: 加载/空/错误三类状态统一为占位组件 + 引导动作,配色走新增语义色阶。

**Rationale**:
- 现有 `BookmarkGrid` 有 `GridSkeleton`(skeleton)与 `EmptyState`(纯文本),但不统一:空状态无引导动作,错误状态散落在各 try/catch toast。
- 统一三态占位组件(如 `<StateLoading>` / `<StateEmpty action>` / `<StateError retry>`),配色走 success/warning/info/destructive 语义色,满足 FR-003 + SC-001。

**Alternatives**:
- 保留各处临时实现:不一致,违反 FR-001,弃。

---

## 6. 书签卡片:整卡单击即开 + 强化反馈

**Decision**: 沿用 `BookmarkCard` 整卡 `role="button"` + `onClick` 新标签打开,强化悬停/聚焦反馈(升降 `-translate-y-0.5` + 阴影 + ring 光晕)。

**Rationale**:
- 现有卡片已是 `role="button"` + `tabIndex={0}` + `onKeyDown`(Enter/Space),整卡点击逻辑就绪。沿用守硬约束。
- 现有悬停已 `hover:-translate-y-0.5 hover:shadow-md`,需补 `focus-visible:ring` 光晕与触觉一致性。

**Alternatives**:
- 单击选中 + 双击打开:增加跳转步骤,导航型应用偏慢,弃。
- 仅显式按钮打开:拖慢主流程,弃。

---

## 7. 搜索:全屏命令面板(Ctrl+K)

**Decision**: 升级 `BookmarkSearch` 为命令面板触发器;新增 `CommandPalette` 全屏组件,含结果列表 + 键盘上下选择(↑↓)+ Enter 跳转 + Esc 关闭(Spotlight/Raycast 风格)。

**Rationale**:
- 现有 `BookmarkSearch` 是内联 input + Ctrl+K 聚焦。升级为全屏命令面板是用户在交互层 clarify 显式选择(FR-008),非代理擅自扩展。
- 命令面板组件可复用 shadcn `Dialog`(已有 `dialog.tsx`);结果列表虚拟滚动复用 `useVirtualList`(与书签列表共用,FR-018)。
- 这是本特性最大的功能增量,plan 阶段已识别,任务拆分在 `/speckit-tasks`。

**Alternatives**:
- 保留内联搜索:未满足用户显式选择 FR-008,弃。
- inline + 键盘导航:与卡片现有点击逻辑重复,弃。

---

## 8. 分类导航:PC 侧栏可折叠 + 移动端底部 Tab+抽屉

**Decision**: PC 侧栏增可折叠(收起/展开)+ 计数 badge 高亮,不改两套布局分支结构;移动端用底部固定 Tab(全部/分类)+ 侧滑抽屉承载完整分类列表,替代顶部横向滚动标签栏。

**Rationale**:
- PC:现有 `CategoryNav` 的 `isPC` 分支是侧栏列表,加折叠按钮与 badge 不改结构。守硬约束。
- 移动端:现有顶部横向滚动标签栏,分类多时难发现且拇指不可达(违反 SC-003 拇指可达)。底部 Tab + 抽屉是移动导航成熟模式,既保"全部"快速切换,又容纳长列表。
- 抽屉组件可复用 shadcn `Dialog` 或 `Sheet`(Radix Dialog 变体)。

**Alternatives**:
- 统一横标签栏:PC 大屏侧栏空间浪费,弃。
- 顶部汉堡菜单:点开为全屏列表,不如底部 Tab 快捷,弃。

---

## 9. 破坏性确认与 toast:沿用 + 统一

**Decision**: 删除书签/分类沿用 AlertDialog 二次确认,默认焦点落"取消",Enter 不触发删除;toast 沿用,统一位置/时序/语义色。

**Rationale**:
- 现有 `BookmarkCard` 与 `CategoryNav` 已用 `AlertDialog` 二次确认。沿用守硬约束。
- 默认焦点落"取消":现 `AlertDialogCancel` 不一定是默认聚焦,需 Radix `autoFocus` 落 Cancel。这是可达性标准做法。
- toast 现有 `ToastProvider` 已就绪,补语义色变体(success/warning/info/destructive)。

**Alternatives**:
- 软删 + 撤销 toast:需引入软删除机制,与现有 IDB 直接删冲突,工程量大,弃。
- 直接删除:误删风险高,弃。

---

## 10. 适配:Tailwind 默认断点 + 44px 热区 + 宽度驱动横竖屏

**Decision**: 沿用 Tailwind 默认断点梯度(sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536),补中间档(md 768 平板);强制移动端可交互元素最小热区 44×44px(WCAG 2.5.5);横竖屏靠宽度驱动断点,不单独渲染。

**Rationale**:
- `useMediaQuery` 现用 `min-width: 1024px`(lg)切 PC/移动。沿用 Tailwind 默认断点避免自造 token,与现有 1024 切换点一致。
- 现有按钮多处小于 44px(如 `h-7 w-7` = 28px),需 padding/`min-h-11 min-w-11` 补齐。
- 横竖屏:书签导航是列表/网格型,横屏宽度增大自动触发桌面分支,无需 `orientation` 监听。

**Alternatives**:
- 三档简化断点:组合复杂度降但与 Tailwind 生态脱节,弃。
- 自定义语义断点:增加维护成本,弃。
- 横屏独立布局:与"沿用当前设计、外科手术式改动"相悖,弃。

---

## 11. 性能:基线指标 + favicon 懒加载 + 虚拟滚动 + 纯 CSR

**Decision**: 目标 LCP<1.5s / TTI<2s(中端移动+3G) / INP<200ms / CLS<0.1(500+ 书签);favicon 原生 `loading="lazy"`+`decoding="async"`+`onError` 降级(沿用 `fallbackIcon`);书签列表虚拟滚动;沿用纯 CSR,不做 SSR/预渲染,靠代码分割 + 懒加载达标。

**Rationale**:
- favicon 是请求量最大的资源(500 条 = 500 请求),原生 `loading="lazy"` 无依赖零成本;现有 `onError` 降级已就绪,只补 loading 属性。
- 虚拟滚动:500+ 卡片全量渲染会阻塞主线程导致 INP 超标。虚拟滚动只渲染可视区(约 20–40 卡片)。新增 `useVirtualList` hook。
- 纯 CSR:本项目无后端,IDB 数据需客户端 JS 读取,SSR 不可行(破硬约束);静态预渲染对首屏 LCP 收益有限(数据仍需 JS 填充),增加构建复杂度,违反宪法 II 简洁优先。
- 代码分割:命令面板等重组件用 `React.lazy` 按需加载,减小首屏 JS。
- FID 已被 Web Vitals 弃用,用 INP(测全交互)替代,沿用现行标准。

**Alternatives**:
- IntersectionObserver 自定义懒加载:原生 lazy 已够,自造增加复杂度,弃。
- 全部立即加载:500 请求阻塞,弃。
- SSR/预渲染:破硬约束或收益不足,弃。

---

## 12. 测试策略

**Decision**: 视觉走查清单(SC-001)用 Playwright 截图 + 人工勾验;键盘流(SC-002)用 Playwright keyboard API;断点(SC-003)用 Playwright `setViewportSize`;性能(SC-004)用 Lighthouse CI / Playwright + `web-vitals` 库;FOUC(SC-005)用 Playwright 录制首帧;极端字段(SC-006)用单元测试构造极端 Bookmark。

**Rationale**: 现有 `tests/e2e`(5 spec)已覆盖导入导出/性能/持久/响应式/搜索访问。增量补视觉走查、键盘流、断点矩阵、性能基线、FOUC、极端字段 spec。单元/集成沿用 Vitest。

**Alternatives**: 纯人工走查:不可重复,弃。
