# 质量基线

> **来源**:迁移自 `pre-speckit-removal:specs/001-ui-ux-overhaul/research.md`、`pre-speckit-removal:specs/001-ui-ux-overhaul/plan.md`、`pre-speckit-removal:specs/001-ui-ux-overhaul/checklists/ui-ux-quality.md`;验收判定另参考 `pre-speckit-removal:specs/001-ui-ux-overhaul/spec.md`,响应式契约与运行环境细节另参考 `pre-speckit-removal:specs/001-ui-ux-overhaul/contracts/ui-contract.md`、`pre-speckit-removal:specs/001-ui-ux-overhaul/quickstart.md`;并依据当前代码与测试核对。
> **迁移日期**:2026-11-03
> **原始记录日期**:2026-07-28
> **性质说明**:以下内容是在设计与验收阶段设定的**目标基线**,不是当前实现已经全部达标的证明。表格中的数值保留原文档口径,并以当前代码中的阈值、参数和测试入口校正;是否达标必须按"验证入口"实测。

本文把可执行的质量目标按性能、可访问性、响应式、大数据量、运行环境与质量门分组。实体与存储格式见 [数据模型](./data-model.md);手工验收步骤见 [手工验收指南](./quickstart.md),组件契约见 [UI 契约](./ui-contract.md),设计决策见 [设计决策记录](./design-decisions.md)。

## 性能预算

测量前提(原文档口径):生产构建;500+ 书签数据集;移动端 Lighthouse 模拟 + 3G 慢速网络;指标采集使用 Lighthouse CI / Playwright + `web-vitals`。当前仓库的实际测试入口与这一前提存在差异,见本节末尾说明。

| 基线项                         | 目标值    | 测量前提                                        | 当前验证入口                                                                                                                                                                |
| ------------------------------ | --------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LCP(Largest Contentful Paint)  | `< 1.5s`  | 500+ 书签;中端移动设备 + 3G 慢速模拟;生产构建   | 原验收场景为 Lighthouse 移动模拟;当前 `tests/e2e/performance-baseline.spec.ts` 用原生 `PerformanceObserver` 采集,CI 断言放宽为 `< 2500ms`。严格值需在本地用 Lighthouse 复核 |
| TTI(Time to Interactive)       | `< 2s`    | 同上                                            | 原文档要求纳入性能验收;当前自动化测试未采集 TTI,需用 Lighthouse 手动复核                                                                                                    |
| INP(Interaction to Next Paint) | `< 200ms` | 同上;覆盖搜索、筛选、拖拽、命令面板等交互       | `tests/e2e/performance-baseline.spec.ts` 触发 `Ctrl+K` / `Esc` 后断言 `< 200ms`(指标存在时)                                                                                 |
| CLS(Cumulative Layout Shift)   | `< 0.1`   | 500+ 书签;列表加载与筛选;虚拟列表占位总高防抖动 | `tests/e2e/performance-baseline.spec.ts` 断言 `< 0.1`(指标存在时)                                                                                                           |
| 滚动流畅度                     | 60fps     | 大数据量列表快速滚动;虚拟滚动生效               | 原文档为主观流畅 + DevTools 观察;当前 `useVirtualList` 使用 `passive` 滚动监听 + `requestAnimationFrame` 节流                                                               |

当前仓库另有两条辅助性能断言:

| 用例     | 目标值    | 数据集     | 入口                            |
| -------- | --------- | ---------- | ------------------------------- |
| 页面加载 | `< 2s`    | 100 个书签 | `tests/e2e/performance.spec.ts` |
| 搜索响应 | `< 500ms` | 100 个书签 | `tests/e2e/performance.spec.ts` |

注意:`tests/e2e/performance.spec.ts` 已对齐当前命令面板占位符 `搜索书签（上下选择,回车打开）`,并使用页面内 `performance.now()` 计时;CI 共享 runner 上阈值放宽到 4s/1.5s,严格预算仍以生产构建 + Lighthouse 为准。

性能基线的注意事项:

- `playwright.config.ts` 的 `webServer` 使用 `pnpm dev`,因此 `pnpm test:e2e` 默认跑在开发服务器上;严格性能验收应使用 `pnpm build` 后的生产产物(`pnpm preview` 或部署预览)。
- 原计划曾要求把 `web-vitals` 作为性能采集依赖;当前 `package.json` 中没有该依赖,现有测试改用浏览器原生 `PerformanceObserver` 采集 LCP/CLS/INP。
- LCP 的 CI 断言为 `< 2500ms`,这是环境波动下的宽容值;目标基线仍是 `< 1.5s`。
- TTI 不在当前自动化指标中;"首屏可交互"的严格判定需要 Lighthouse 或其他实验室工具。
- 原文档没有固定参考机型与 CPU 节流倍率;复现时需记录 Lighthouse 的设备/网络/CPU 配置,否则不同机器上的数值不可直接比较。500+ 数据集可直接使用 `tests/fixtures/500-bookmarks.json`(配合 `tests/helpers/seed.ts`)或通过导入功能构造。

## 可访问性基线

### 对比度与视觉可读性

| 基线项             | 目标                                                                                                 | 判定与当前实现                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 正文文本对比度     | 亮色与暗色主题下均符合 WCAG AA:正常文本 `≥ 4.5:1`,大文本 `≥ 3:1`                                     | 设计 token 按 AA 反推;需用对比度工具或 Lighthouse 无障碍审计逐 token/逐屏核对                                          |
| 大文本定义         | `≥ 18pt` 或 `≥ 14pt` 粗体                                                                            | 原文档口径;用于区分 4.5:1 与 3:1 阈值                                                                                  |
| 语义色配对         | `success` / `warning` / `info` 各有 `DEFAULT` + `foreground`,亮/暗各一套                             | `src/styles/tokens.css` 已定义;`tailwind.config.js` 已映射                                                             |
| 语义色对比度       | 语义色对背景达 AA;foreground 对各自 DEFAULT 背景达 AA                                                | `tokens.css` 注释记录:亮色 `success` 约 4.83:1、`warning` 约 4.19:1、`info` 约 6.0:1;暗色分别约 9.37:1、9.44:1、5.72:1 |
| warning 的使用边界 | 亮色 `--warning` 的 4.19:1 略低于正常文本阈值,只能作大文本/图标色;正文配 `--warning-foreground` 深棕 | `src/styles/tokens.css` 注释与当前组件用法                                                                             |
| 主题一致性         | 亮色与暗色主题下都需逐屏走查间距、对齐、层次、对比度、状态反馈                                       | 原视觉走查清单;当前 `tests/e2e/visual-walkthrough.spec.ts` 只做了部分采样,不替代完整走查                               |

### 键盘与焦点

| 基线项              | 目标                                                                      | 当前实现与验证                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 核心流程键盘可达    | 仅用键盘完成增、删、改、查、搜索、分类切换、主题切换                      | 原验收场景;当前 `tests/e2e/keyboard-flow.spec.ts` 覆盖 Tab 可见性、删除确认默认焦点、命令面板打开/关闭,尚未覆盖完整增改查/分类/主题链路            |
| 焦点可见            | 统一 `focus-visible:ring-2 ring-ring` 规范;焦点顺序合理,不跳到隐藏元素    | `src/styles/tokens.css` 的 `--focus-ring` 与 `.focus-ring` 工具类;多数按钮/卡片/抽屉项已复用,但分类项内部按钮等仍需逐项核对是否显式带 `focus-ring` |
| 命令面板键盘        | `Ctrl/Cmd+K` 打开;`↑`/`↓` 选择;`Enter` 跳转;`Esc` 关闭;打开时焦点落输入框 | `src/components/bookmark/CommandPalette.tsx`;E2E 覆盖打开、输入过滤、Esc 关闭                                                                      |
| 破坏性确认          | `AlertDialog` 二次确认;默认焦点落"取消";`Enter` 不触发删除                | `BookmarkCard` 与 `CategoryNav` 的删除确认;E2E 断言焦点文本为"取消",按 `Enter` 后书签仍在                                                          |
| 对话框/抽屉焦点管理 | 遮罩 + 焦点陷阱;标题/描述可被辅助技术读取                                 | `CommandPalette`、`CategoryDrawer`、各表单复用 Radix `Dialog`;隐藏标题使用 `sr-only`                                                               |
| 屏幕阅读器语义      | 加载态可宣告、错误态可宣告、图标按钮有可读名称                            | `StateLoading` 使用 `role="status"` + `aria-label`;`StateError` 使用 `role="alert"`;图标按钮普遍带 `aria-label`                                    |
| 非阻塞反馈          | 操作反馈不阻塞界面;错误下不丢失已填输入                                   | toast 反馈;表单错误在对话框内展示,已填字段保留                                                                                                     |

### 触摸目标与动效偏好

| 基线项         | 目标                                                                               | 当前实现与验证                                                                                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 移动端触摸热区 | 所有可交互元素的可点击热区 `≥ 44×44px`(WCAG 2.5.5,指热区尺寸,允许视觉尺寸小于热区) | 关键按钮使用 `min-h-11 min-w-11`(默认根字号下 44px)或 `size="touch"`(`h-11 w-11`);范围包括卡片操作、分类项、底部 Tab、搜索触发器、主题切换。当前没有专门断言 44px 的自动化用例 |
| 桌面端收缩     | 移动端必须满足 44px;桌面端部分操作按钮可缩小                                       | `BookmarkCard` 的操作按钮为 `min-h-11 min-w-11 h-7 w-7 sm:min-h-7 sm:min-w-7`,即移动端撑到 44px、`sm` 以上恢复小尺寸                                                           |
| 减少动效       | 尊重 `prefers-reduced-motion`;降级非必要动画,保留焦点指示与即时状态反馈            | `src/index.css` 在减少动效下把全局动画/过渡时长降到 `0.01ms`,迭代次数设为 1,`scroll-behavior: auto`;偏好关闭后媒体查询自动恢复                                                 |
| 拇指可达       | 移动端底部导航位于拇指可达区                                                       | `tests/e2e/responsive-breakpoints.spec.ts` 在 375×667 下断言底部 Tab 顶部超过视口高度一半                                                                                      |
| 状态反馈完整性 | 加载/空/错误三态统一;空状态含引导动作;错误含原因与重试                             | `StateLoading` / `StateEmpty` / `StateError`;书签空状态引导"添加书签",搜索无结果显示"新建书签"或"清除搜索"                                                                     |

## 响应式断点与移动端布局

断点沿用 Tailwind 默认梯度。`useMediaQuery` 当前导出 `isSm`(`≥ 640px`)、`isTablet`(`≥ 768px`)、`isPC`(`≥ 1024px`)、`isXl`(`≥ 1280px`)、`is2xl`(`≥ 1536px`) 与 `isMobile`(`< 768px`)。

| 断点  | 最小宽度  | 目标行为                           | 当前实现                                                                                                                                                                        |
| ----- | --------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 基础  | `< 640px` | 移动端布局;内容不溢出              | `AppLayout` 在 `< 768px` 都使用顶部 Header + 内容区 + 底部固定 Tab;书签条目单列                                                                                                 |
| `sm`  | `640px`   | 横向条目单列 → 2 列                | 当前书签条目为 2 列(基础单列);Header 中的按钮文字从隐藏变为显示;`AppLayout` 在 640–767px 仍是移动布局                                                                           |
| `md`  | `768px`   | 平板中间档;布局切换到侧栏/桌面形态 | `AppLayout` 在 `isPC` 或 `isTablet`(即 `≥ 768px`)渲染侧栏;但 `CategoryNav` 只用 `isPC`(`≥ 1024px`)决定是否渲染侧栏列表,768–1023px 区间的导航形态需按目标基线重点复核            |
| `lg`  | `1024px`  | PC 侧栏布局;侧栏可折叠             | `isPC` 为真;侧栏展开宽度实际为 `w-52`(`isTablet` 在 `≥768px` 为真,故 `w-60` 分支当前不可达),折叠 `w-16`;折叠态持久化在 `localStorage` 的 `category-nav-collapsed`;书签条目 3 列 |
| `xl`  | `1280px`  | 目标契约要求条目列数增加           | 当前 `BookmarkGrid` 在 `xl` 为 4 列,`2xl` 为 5 列                                                                                                                               |
| `2xl` | `1536px`  | 目标契约要求最大容器行为           | 书签条目 5 列;`BookmarkGrid` 内容宽度限制为 `90rem` 并居中,避免超宽屏条目被拉长                                                                                                 |

响应式与移动端约束:

- 验收视口集合:360 / 640 / 768 / 1024 / 1280 / 1536 px。`tests/e2e/responsive-breakpoints.spec.ts` 逐档断言 `document.documentElement.scrollWidth <= clientWidth`,即无横向滚动条。
- 布局平滑切换,无错位、无内容溢出;横竖屏切换靠宽度驱动,不监听 `orientation`。
- 移动端 `< 768px`:底部固定 Tab 提供"全部 / 分类 / 新建";"分类"打开左侧抽屉,抽屉宽度 `w-80`、最大 `85vw`,由 Radix `Dialog` 提供遮罩与焦点陷阱。
- 内容区在移动端保留底部留白(`pb-20`),避免被固定 Tab 遮挡。
- 触摸目标按上一节 44×44px 基线执行。

## 虚拟滚动阈值与大数据量

| 项                   | 阈值/参数                                | 当前实现                                                                                      |
| -------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| 书签列表启用虚拟滚动 | 书签数 `> 60`                            | `src/components/bookmark/BookmarkGrid.tsx` 的 `VIRTUAL_THRESHOLD = 60`;小于等于 60 条全量渲染 |
| 书签单项高度         | `4.75rem`(16px 根字号下 76px)            | `CARD_HEIGHT_REM = 4.75`;随根字号缩放                                                         |
| 书签列表可视高度     | `37.5rem`(16px 根字号下 600px)           | `VIRTUAL_VIEWPORT_REM = 37.5`                                                                 |
| 命令面板启用虚拟滚动 | `results.length * 3.5rem > 25rem`        | `src/components/bookmark/CommandPalette.tsx`;约超过 7 条结果时启用                            |
| 命令面板单项高度     | `3.5rem`(16px 根字号下 56px)             | `ITEM_HEIGHT_REM = 3.5`                                                                       |
| 命令面板可视高度     | `25rem`(16px 根字号下 400px)             | `CONTAINER_HEIGHT_REM = 25`                                                                   |
| 上下缓冲             | 各 `3` 项                                | `useVirtualList` 的 `overscan = 3`                                                            |
| 占位总高             | `items.length * itemHeight`              | `totalHeight` 撑开滚动容器,防止 CLS                                                           |
| 滚动节流             | `requestAnimationFrame` + `passive` 监听 | `useVirtualList` 的滚动处理                                                                   |
| 命令面板结果上限     | 无查询 50 条;有查询 200 条               | `results.slice(0, 50)` / `slice(0, 200)`                                                      |

大数据量要求与数据集:

- 性能验收数据集为 500+ 书签;仓库提供 `tests/fixtures/500-bookmarks.json` 与 `tests/helpers/seed.ts`。
- `tests/e2e/performance-baseline.spec.ts` 直接注入 500 条书签进行指标采集;`tests/e2e/performance.spec.ts` 注入 100 条做加载与搜索响应断言。
- 虚拟滚动目标是只渲染可视区及少量缓冲,避免 500+ 卡片全量渲染阻塞主线程;按行多列虚拟化后,1280px 下书签列表一次约渲染 52 张,命令面板约 14 项。
- 数据量小于阈值时必须退化为全量渲染,不能因为虚拟化导致空列表或布局塌陷。

## 浏览器与运行环境假设

| 项              | 假设/目标                                         | 当前仓库事实与注意                                                                                                                                                                                                                       |
| --------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 浏览器          | Chrome / Edge / Firefox / Safari 最新版           | 当前 Playwright 只配置了 `chromium`(Desktop Chrome),没有 Firefox/WebKit 项目;跨浏览器验收需额外执行                                                                                                                                      |
| 应用形态        | 纯前端 SPA,纯 CSR;不做 SSR/静态预渲染             | Vite + React 18;`src/main.tsx` 客户端挂载;命令面板通过 `React.lazy` 代码分割                                                                                                                                                             |
| 离线与持久化    | 数据存 IndexedDB;主题偏好存 localStorage;离线可用 | 数据库 `bookmark-navigation` v1;主题键 `bookmark-theme`;折叠态键 `category-nav-collapsed`;选中分类键 `selected-category-id`                                                                                                              |
| 隐私/无痕模式   | 提示数据可能丢失,但提示不阻塞使用                 | `detectIncognito()` 启发式检测,顶部 warning 提示;`navigator.storage.persist()` 请求持久化存储                                                                                                                                            |
| 外部资源        | favicon 可能来自 Google Favicon API               | 外部请求失败时降级为首字母 SVG,再降级为纯色块 SVG;不因网络失败破布局                                                                                                                                                                     |
| 生产构建        | 生产构建后再做性能验收                            | `pnpm build` = `tsc -b && vite build`;生产 `base` 为 `/guide/`,本地开发为 `/`                                                                                                                                                            |
| 性能测量环境    | Lighthouse 移动模拟 + 3G;生产构建                 | 当前 `performance-baseline.spec.ts` 跑在 `pnpm dev` 下,视口 375×667,使用原生 `PerformanceObserver`;`performance.spec.ts` 使用 Desktop Chrome 默认视口,以页面内 `performance.now()` 计时断言加载与搜索耗时。严格值需生产构建 + Lighthouse |
| Node / 包管理器 | 原验证指南记录 Node 18+ / pnpm                    | 当前 `package.json` 要求 `node >= 24`,`packageManager` 为 `pnpm@11.22.0`;以当前仓库为准                                                                                                                                                  |
| 测试栈          | Vitest(单元/集成)+ Playwright(E2E)                | Vitest 使用 jsdom 与 `fake-indexeddb`;Playwright 单 Chromium 项目,CI 下 1 worker、2 次重试                                                                                                                                               |
| 数据规模        | 500+ 书签                                         | 测试夹具与性能 E2E 均覆盖 500 条;日常列表也会启用虚拟滚动                                                                                                                                                                                |

关键实现依据:

- 纯 CSR:本项目无后端,IndexedDB 数据必须由客户端 JS 读取,SSR 不可行;静态预渲染对首屏 LCP 的收益有限,因此保留 Vite SPA,通过代码分割与懒加载优化首屏。
- favicon 懒加载:500 条书签可能带来约 500 个 favicon 请求,原生 `loading="lazy"` + `decoding="async"` 零依赖;失败时按 favicon → 首字母 SVG → 纯色块逐级降级。
- INP 取代 FID:FID 已被 Web Vitals 弃用,INP 覆盖更完整的交互响应,因此以 INP 作为交互性能指标。
- 代码分割:命令面板仅在首次打开时挂载 `React.lazy` 组件;`vite.config.ts` 用函数式 `manualChunks` 按 module id 将 React 运行时与 Radix 依赖拆为独立 chunk。

## 质量门与验证命令

| 命令              | 用途                                                                    | 备注                                        |
| ----------------- | ----------------------------------------------------------------------- | ------------------------------------------- |
| `pnpm lint`       | ESLint 检查                                                             | 目标零警告                                  |
| `pnpm typecheck`  | `tsc --noEmit`                                                          | 类型检查                                    |
| `pnpm test`       | Vitest 单元 + 集成                                                      | 不含 E2E                                    |
| `pnpm test:e2e`   | Playwright E2E                                                          | 默认通过 `pnpm dev` 启动测试服务器          |
| `pnpm build`      | 类型检查 + 生产构建                                                     | 提交前或部署前执行                          |
| `pnpm build:prod` | 生产构建脚本                                                            | 当前脚本等价于 `pnpm build`                 |
| 严格性能验收      | `pnpm build` 后用 `pnpm preview`(或部署预览)跑 Lighthouse 移动模拟 + 3G | 不以开发服务器上的 E2E 数字代替生产性能结论 |

## 自动化覆盖对照与缺口

| 基线             | 自动化入口                                                                | 覆盖情况与缺口                                                                                                              |
| ---------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 视觉状态与对比度 | `tests/e2e/visual-walkthrough.spec.ts`                                    | 覆盖悬停阴影、暗色首帧、加载 skeleton、空状态引导;对比度只采集前景/背景字符串,没有计算比值,不能替代严格 AA 审计             |
| 键盘流           | `tests/e2e/keyboard-flow.spec.ts`                                         | 覆盖 Tab 不跳隐藏元素、删除确认默认焦点"取消"、`Ctrl+K` 打开与 Esc 关闭;未覆盖完整增改查、分类切换、主题切换链路            |
| 断点矩阵         | `tests/e2e/responsive-breakpoints.spec.ts`                                | 覆盖 360/640/768/1024/1280/1536 无横向溢出、减少动效降级、移动端底部 Tab 拇指可达                                           |
| 性能             | `tests/e2e/performance-baseline.spec.ts`、`tests/e2e/performance.spec.ts` | 覆盖 500 条下的 LCP/CLS/INP(有指标才断言,dev/CI 放宽 LCP 与 INP)、100 条加载 `< 2s`、搜索 `< 500ms`;无 TTI、无生产构建测量  |
| 主题无闪烁       | `tests/e2e/theme-fouc.spec.ts`                                            | 覆盖暗色/亮色/系统主题首帧 class 与运行时切换                                                                               |
| 极端字段         | `tests/e2e/extreme-fields.spec.ts`                                        | 覆盖超长标题 `line-clamp-1`、favicon 失败降级、无效 URL 不破布局                                                            |
| 虚拟滚动         | `tests/e2e/performance.spec.ts`                                           | 断言 4 列、横向条目 76px、渲染子集、滚动换行、焦点保持、根字号 20px 缩放与命令面板滚动高亮                                  |
| 书签排序         | `tests/e2e/bookmark-reorder.spec.ts`                                      | 覆盖分类视图内拖拽插入、菜单“前移/后移”等价路径，以及刷新后的顺序持久化                                                     |
| 分类图标         | `tests/e2e/category-management.spec.ts`                                   | 覆盖自定义图片图标、预置图标 + 固定颜色在折叠侧栏的显示、无图标时首字符回退、刷新后的持久化，以及编辑分类图标后页面仍可交互 |
| 分类选择         | `tests/e2e/category-management.spec.ts`                                   | 覆盖刷新后恢复选中的分类，以及失效的分类 ID 回退“全部”                                                                      |
| 触摸目标         | 无专门用例                                                                | 44×44px 需按组件清单手动量测                                                                                                |
| 跨浏览器         | 无                                                                        | 当前只有 Chromium;目标浏览器列表中的 Firefox/Safari 需另行验收                                                              |

## 验收判定汇总

| 验收项     | 通过判定                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 视觉走查   | 亮色与暗色主题下,间距/对齐/层次/对比度/状态反馈逐条通过,通过率 100%                                                            |
| 键盘流     | 仅用键盘完成核心流程,焦点可见且顺序合理,通过率 100%                                                                            |
| 断点与触达 | 在 360 / 640 / 768 / 1024 / 1280 / 1536 px 下无横向滚动条、无内容溢出,通过率 100%;移动端底部 Tab 在拇指可达区                  |
| 性能基线   | 500+ 书签下 LCP `< 1.5s`、TTI `< 2s`(中端移动 + 3G)、INP `< 200ms`、CLS `< 0.1` 达标率 100%;大数据量滚动无明显掉帧(基线 60fps) |
| 主题无闪烁 | 首帧 `documentElement.classList` 与存储主题/系统偏好一致,无亮→暗闪烁                                                           |
| 极端字段   | 超长标题、favicon 缺失/失败、无效 URL 下布局不被破坏,通过率 100%                                                               |
| 交互与状态 | 加载/空/错误三态统一;空状态含引导动作;命令面板无结果时可引导新建书签;破坏性操作默认焦点落"取消"且 `Enter` 不触发删除           |

## 已知偏差与复核项

以下项目是"目标基线"与"当前实现/自动化"之间需要明确区分的差异,不表示已经判定失败:

- TTI `< 2s` 是原目标基线,但当前没有自动化采集,需要 Lighthouse 手动测量。
- 性能 E2E 默认使用开发服务器,且 LCP 断言放宽到 `< 2500ms`;严格 `< 1.5s` 必须在生产构建 + 移动端 + 3G 条件下复核。
- `md`(768–1023px)区间:目标要求平板分支可用,但 `CategoryNav` 当前用 `isPC`(`≥ 1024px`)判断是否渲染侧栏列表,需重点走查。
- `xl` / `2xl` 的条目分别为 4 / 5 列;`BookmarkGrid` 使用 `max-w-[90rem]` 限制超宽屏内容区宽度。
- 对比度自动化只做了颜色采样,没有计算对比度比值;`warning` 亮色 4.19:1 的使用边界需要人工确认。当前 `src/App.tsx` 的隐私/无痕提示使用 `text-sm text-warning`,而 token 注释限定 `--warning` 亮色用于大文本/图标、正文应使用 `--warning-foreground`;该处实际对比度需复核。
- 44×44px 触摸目标没有自动化断言;桌面端部分按钮有意缩小到 `sm` 以上,移动端才撑到 44px。
- 原需求质量检查还提出过 toast 出现/消失的具体时长、横竖屏切换"平滑过渡"的可验定义、参考机型/CPU 节流倍率等;源文档没有给出量化值,验收前需要补充可复现口径,或明确采用当前测试中的替代判定(如无横向溢出、底部 Tab 位于视口下半区)。
- 跨浏览器与 TTI 均未纳入当前 CI,不能把 Chromium E2E 通过等同于全量质量达标。
