# 设计决策记录:前端显示层 UI/UX 系统性优化

> **来源**:迁移自 `pre-speckit-removal:specs/001-ui-ux-overhaul/research.md`
> **迁移日期**:2026-11-03
> **记录日期**:2026-07-28
> **时效说明**:本文是 2026-07-28 的设计决策记录,部分实现细节可能已随代码演进;当前事实以源码与 `docs/data-model.md` 为准。

本文记录本次优化在视觉、交互、适配、性能四个维度的技术决策、依据与备选方案。所有决策均源自需求澄清阶段确认的约束与既有代码库现状,无待澄清项残留。为摆脱已移除的编号体系,原文引用的需求与验收条目在本文中改为描述性标签。

## 色彩体系

**决策**

保留现有橙色 primary(`24.6 95% 53.1%`)与 shadcn HSL 变量体系,校准明度/对比度达 WCAG AA;新增 `--success` / `--warning` / `--info` 三组语义色阶(各含 DEFAULT + foreground),并文档化为 token。

**理由**

- 决策时 `src/index.css` 已用 HSL CSS 变量(`--background`、`--primary` 等),`tailwind.config.js` 已映射为 `hsl(var(--*))` token。沿用此体系零迁移成本,符合"沿用当前设计"的硬约束。
- 决策时没有 success/warning/info 色阶,加载/空/错误状态只能复用 `destructive` / `muted`,反馈不语义化(需求标签:视觉-状态反馈语义化)。
- WCAG AA 要求正文对比度不低于 4.5:1、大文本不低于 3:1;暗色模式下 `--muted-foreground: 0 0% 60%` 对 `--background: 0 0% 10%` 的对比度约为 7:1,已达标,但仍需逐 token 校验。

**备选方案**

- 全面重设色板:违反"沿用当前设计"的硬约束,放弃。
- 仅校准对比度、不补语义色:无法满足状态反馈语义化的需求,放弃。

**落地**

新增 `src/styles/tokens.css`,亮/暗主题各补 3 组语义色;`tailwind.config.js` 的 `colors` 增加 `success` / `warning` / `info` 映射。

## 字体排版

**决策**

沿用现有系统字体栈(`ui-sans-serif, system-ui, ...`),补齐四档 type scale(显示 / 标题 / 正文 / 辅助)、行高、字重梯度与中文优化字距(`font-feature-settings`),并文档化为 token。

**理由**

- 决策时 `index.css` 已设置系统字体栈,无 web 字体加载(零请求,利于 LCP)。沿用该方案既符合"沿用当前设计"的硬约束,也利于性能。
- 中文优化:`font-feature-settings: "palt" 1` 或 `letter-spacing` 微调可改善中英混排;`line-height` 取 1.5–1.75 区间适配中文。
- type scale 文档化为 token(如 `--text-display` / `--text-h1` / `--text-body` / `--text-caption`),供视觉走查勾验(验收标签:视觉走查)。

**备选方案**

- 引入中文 web 字体(思源 / HarmonyOS Sans):触及"沿用当前设计"的边界(视觉语言变更),且增加字体请求会拖慢 LCP,放弃。
- 仅统一现状、不文档化:走查缺少可勾验的标尺,放弃。

## 圆角与阴影

**决策**

沿用 `--radius: 0.5rem`,补充圆角阶梯 sm / md / lg(`calc(var(--radius) - N)`);新增四档阴影 elevation(sm / md / lg / popover),并文档化为 token。

**理由**

- `tailwind.config.js` 已有 `borderRadius` 的 lg / md / sm 映射到 `--radius`,沿用此模式。
- 决策时阴影使用 Tailwind 默认 `shadow-md` 等零散值,弹层与卡片混用,违反一致性要求(需求标签:视觉-一致性)。
- 四档 elevation 按 card(md) / hover(lg) / popover / overlay 分层,可逐项走查。

**备选方案**

- 重设圆角基准值:触及"沿用当前设计"的硬约束(视觉语言变更),放弃。
- 仅统一阴影、不补圆角阶梯:阶梯不完整,放弃。

## 暗色模式

**决策**

沿用 `useTheme`(light / dark / system + `matchMedia` 监听),补充 FOUC 防护(在首屏渲染前用内联阻塞脚本确定主题)与无障碍可达性。

**理由**

- 决策时 `useTheme` 的三态切换已就绪,`applyTheme` 负责切换 `.dark` class。沿用该实现符合"沿用当前设计"的硬约束。
- FOUC 风险:`useTheme` 在 React 挂载后才应用主题,首屏会先闪亮色。防护方式是在 `index.html` 的 `<head>` 内联一小段阻塞脚本,读取 localStorage 或系统偏好,并在 React 挂载前设置 `.dark` class。这是 FOUC 防护的标准做法。
- 无障碍:`ThemeToggle` 已有 `aria-label`,仍需校验三态循环的焦点与键盘可达性(验收标签:无闪烁)。

**备选方案**

- 重设暗色色板:触及"沿用当前设计"的硬约束,放弃。
- 仅校准对比度、不防 FOUC:首屏仍会闪烁,无法满足无闪烁的验收要求,放弃。

## 状态反馈

**决策**

加载 / 空 / 错误三类状态统一为占位组件加引导动作,配色使用新增的语义色阶。

**理由**

- 决策时 `BookmarkGrid` 虽有 `GridSkeleton`(skeleton)与 `EmptyState`(纯文本),但二者不统一:空状态没有引导动作,错误状态散落在各处的 `try/catch` toast 中。
- 统一为三态占位组件(如 `<StateLoading>` / `<StateEmpty action>` / `<StateError retry>`),配色使用 success / warning / info / destructive 语义色,满足状态反馈语义化(需求标签:视觉-状态反馈)与视觉走查(验收标签:视觉走查)的要求。

**备选方案**

- 保留各处临时实现:不一致,违反视觉一致性要求(需求标签:视觉-一致性),放弃。

## 交互

### 书签卡片

**决策**

沿用 `BookmarkCard` 的整卡 `role="button"` + `onClick` 在新标签页打开,并强化悬停 / 聚焦反馈(升降 `-translate-y-0.5` + 阴影 + ring 光晕)。

**理由**

- 决策时卡片已是 `role="button"` + `tabIndex={0}` + `onKeyDown`(Enter / Space),整卡点击逻辑已就绪。沿用该实现符合"沿用当前设计"的硬约束。
- 决策时悬停已有 `hover:-translate-y-0.5 hover:shadow-md`,还需补 `focus-visible:ring` 光晕,并保持触觉反馈一致。

**备选方案**

- 单击选中 + 双击打开:增加跳转步骤,对导航型应用偏慢,放弃。
- 仅用显式按钮打开:拖慢主流程,放弃。

### 搜索命令面板

**决策**

把 `BookmarkSearch` 升级为命令面板触发器;新增 `CommandPalette` 全屏组件,通过 Ctrl+K 唤起,包含结果列表、键盘上下选择(↑ / ↓)、Enter 跳转与 Esc 关闭(Spotlight / Raycast 风格)。

**理由**

- 决策时 `BookmarkSearch` 是内联 input,通过 Ctrl+K 聚焦。升级为全屏命令面板是用户在交互层澄清时显式选择的方向(需求标签:交互-搜索命令面板),不是实现者擅自扩展。
- 命令面板组件可复用 shadcn `Dialog`(已有 `dialog.tsx`);结果列表的虚拟滚动复用 `useVirtualList`,与书签列表共用(需求标签:性能-虚拟滚动)。
- 这是本次优化中最大的功能增量,已在计划阶段识别。

**备选方案**

- 保留内联搜索:未满足用户显式选择的搜索命令面板方向,放弃。
- 内联搜索 + 键盘导航:与卡片现有点击逻辑重复,放弃。

### 分类导航

**决策**

PC 侧栏增加可折叠(收起 / 展开)与计数 badge 高亮,不改动两套布局分支的结构;移动端用底部固定 Tab(全部 / 分类)加侧滑抽屉承载完整分类列表,替代顶部横向滚动标签栏。

**理由**

- PC:决策时 `CategoryNav` 的 `isPC` 分支就是侧栏列表,增加折叠按钮与 badge 不需要改动结构,符合"沿用当前设计"的硬约束。
- 移动端:决策时使用顶部横向滚动标签栏,分类较多时难以发现,且拇指不可达(验收标签:适配-拇指可达)。底部 Tab 加抽屉是移动导航的成熟模式,既保留"全部"的快速切换,又能容纳长列表。
- 抽屉组件可复用 shadcn `Dialog` 或 `Sheet`(Radix Dialog 变体)。

**备选方案**

- 统一使用横向标签栏:PC 大屏的侧栏空间被浪费,放弃。
- 顶部汉堡菜单:点开后为全屏列表,不如底部 Tab 快捷,放弃。

### 破坏性操作确认与 toast

**决策**

删除书签 / 分类沿用 AlertDialog 二次确认,默认焦点落在"取消",Enter 不触发删除;toast 继续沿用,并统一出现位置、时序与语义色。

**理由**

- 决策时 `BookmarkCard` 与 `CategoryNav` 已使用 `AlertDialog` 二次确认,符合"沿用当前设计"的硬约束。
- 默认焦点落在"取消":决策时 `AlertDialogCancel` 不一定是默认聚焦项,需要用 Radix 的 `autoFocus` 把焦点落到 Cancel。这是无障碍的标准做法。
- 决策时 `ToastProvider` 已就绪,需补充语义色变体(success / warning / info / destructive)。

**备选方案**

- 软删除 + 撤销 toast:需要引入软删除机制,与现有 IndexedDB 直接删除的方式冲突,工程量大,放弃。
- 直接删除:误删风险高,放弃。

## 响应式与适配

**决策**

沿用 Tailwind 默认断点梯度(sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536),补全中间档(md 768 平板);移动端可交互元素的最小热区强制为 44×44px(WCAG 2.5.5);横竖屏靠宽度驱动断点适配,不单独渲染布局。

**理由**

- 决策时 `useMediaQuery` 使用 `min-width: 1024px`(lg)切换 PC / 移动。沿用 Tailwind 默认断点可避免自造 token,并与现有 1024 切换点一致。
- 决策时多处按钮小于 44px(如 `h-7 w-7` 即 28px),需要通过 padding 或 `min-h-11 min-w-11` 补齐。
- 横竖屏:书签导航是列表 / 网格型界面,横屏时宽度增大,会自动触发桌面分支,无需监听 `orientation`。

**备选方案**

- 三档简化断点:组合复杂度降低,但与 Tailwind 生态脱节,放弃。
- 自定义语义断点:增加维护成本,放弃。
- 横屏独立布局:与"沿用当前设计、外科手术式改动"相悖,放弃。

## 性能

**决策**

目标为 LCP < 1.5s、TTI < 2s(中端移动 + 3G)、INP < 200ms、CLS < 0.1(500+ 书签);favicon 使用原生 `loading="lazy"` + `decoding="async"` + `onError` 降级(沿用 `fallbackIcon`);书签列表使用虚拟滚动;沿用纯 CSR,不做 SSR / 预渲染,依靠代码分割与懒加载达标。

**理由**

- favicon 是请求量最大的资源(500 条书签即 500 个请求),原生 `loading="lazy"` 无依赖、零成本;决策时 `onError` 降级已就绪,只需补上 loading 属性。
- 虚拟滚动:500+ 卡片全量渲染会阻塞主线程,导致 INP 超标。虚拟滚动只渲染可视区(约 20–40 张卡片),需要新增 `useVirtualList` hook。
- 纯 CSR:本项目无后端,IndexedDB 数据必须由客户端 JS 读取,SSR 不可行(会突破硬约束);静态预渲染对首屏 LCP 的收益有限(数据仍需 JS 填充),却增加构建复杂度,违反简洁优先原则。
- 代码分割:命令面板等重组件用 `React.lazy` 按需加载,减小首屏 JS。
- FID 已被 Web Vitals 弃用,改用 INP(测量全部交互)替代,沿用现行标准。

**虚拟滚动**

- `useVirtualList` 同时供书签列表与命令面板搜索结果使用,避免两套实现。
- 只渲染可视区约 20–40 张卡片,是满足 INP < 200ms 的关键手段。

**备选方案**

- IntersectionObserver 自定义懒加载:原生 `loading="lazy"` 已够用,自造增加复杂度,放弃。
- 全部立即加载:500 个请求会阻塞,放弃。
- SSR / 预渲染:突破硬约束或收益不足,放弃。

## 测试策略

**决策**

视觉走查清单(验收标签:视觉走查)用 Playwright 截图加人工勾验;键盘流(验收标签:键盘流)用 Playwright keyboard API;断点(验收标签:断点与触达)用 Playwright `setViewportSize`;性能(验收标签:性能基线)用 Lighthouse CI 或 Playwright 加 `web-vitals` 库;FOUC(验收标签:无闪烁)用 Playwright 录制首帧;极端字段(验收标签:极端字段)用单元测试构造极端 `Bookmark`。

**理由**

决策时 `tests/e2e` 已有 5 个 spec,覆盖导入导出、性能、持久化、响应式与搜索访问。在此基础上增量补充视觉走查、键盘流、断点矩阵、性能基线、FOUC 与极端字段 spec。单元 / 集成测试沿用 Vitest。

**备选方案**

- 纯人工走查:不可重复,放弃。
