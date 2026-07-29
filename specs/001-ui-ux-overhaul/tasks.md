# Tasks: 前端显示层 UI/UX 系统性优化

**Input**: Design documents from `/specs/001-ui-ux-overhaul/`

**Prerequisites**: plan.md(必需)、spec.md(必需)、research.md、data-model.md、contracts/、quickstart.md

**Tests**: spec 未显式要求 TDD;但既有测试基础设施(Vitest + Playwright)就绪,各用户故事独立测试标准已在 spec.md 给出。任务按"实现 + 收尾校验"组织,测试作为各故事 checkpoint 的验收项,不单独立测试任务(除非涉及新 E2E spec)。

**Organization**: 任务按用户故事(视觉 P1 / 交互 P2 / 适配 P3 / 性能 P4)分组,各自可独立实现与测试。FR 编号已按四维度重排(FR-001~006 视觉 / 007~010 交互 / 011~014 适配 / 015~019 性能)。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行(不同文件、无未完成依赖)
- **[Story]**: 所属用户故事(US1 视觉 / US2 交互 / US3 适配 / US4 性能)
- 含精确文件路径

## Path Conventions

- 单前端项目:`src/` 与 `tests/` 在仓库根
- 新增设计 token 集中在 `src/styles/tokens.css`
- 新增组件:`CommandPalette`、`CategoryDrawer`、`useVirtualList` 等

---

## Phase 1: Setup(设计 token 与基础设施)

**Purpose**: 建立 token 层与状态占位组件,作为四维度的共享基础

- [X] T001 [P] 创建设计 token 文件 `src/styles/tokens.css`:语义色阶(success/warning/info 各 DEFAULT+foreground,亮/暗各一套,色值标 TODO 实现期按 WCAG AA 反推,基准色相 success 绿/warning 橙黄/info 蓝)、type scale 四档(`--text-display`/`--text-h1`/`--text-body`/`--text-caption` + 行高/字重)、圆角阶梯(sm/md/lg 映射 `--radius`)、阴影 elevation 四档(sm/md/lg/popover);并确立全局 focus ring 规范(`focus-visible:ring-2 ring-ring` 于基础层,作为 FR-005 的规范源)
- [X] T002 [P] 在 `src/index.css` 接入 `tokens.css`(`@import`),并补中文优化 `font-feature-settings: "palt" 1` 于 body
- [X] T003 [P] 更新 `tailwind.config.js`:`colors` 增 `success`/`warning`/`info`(各 DEFAULT+foreground 映射 `hsl(var(--*))`),`boxShadow` 增 elevation 四档,`fontSize` 增 type scale 四档
- [X] T004 [P] 创建状态占位组件 `src/components/ui/state-feedback.tsx`:`StateLoading`(复用 `Skeleton`)、`StateEmpty`(文案 + 引导动作按钮)、`StateError`(原因文本 + 重试按钮,语义色 destructive/warning)

**Checkpoint**: token 层就绪,`pnpm typecheck` 通过,`pnpm dev` 可见语义色与 type scale 类名可用

---

## Phase 2: Foundational(阻塞性前提,所有故事依赖)

**Purpose**: 布局与主题基础,所有故事在此之上构建

**⚠️ CRITICAL**: 无用户故事工作可在此阶段完成前开始

- [X] T005 在 `index.html` `<head>` 内联阻塞脚本:读 localStorage 键 `bookmark-theme`(单一事实源,见 `@/utils/storage` 的 `THEME_KEY`;内联脚本无法 import 该模块,故硬编码键名,必须保持一致)→ 在 React 挂载前设 `document.documentElement.classList` 的 `.dark`(FR-017 FOUC 防护)
- [X] T006 更新 `src/hooks/useTheme.ts`:沿用三态切换 + matchMedia;**挂载时不重复 apply**(由 T005 内联脚本前置),**用户切换主题时仍由 hook 调 `applyTheme` 设 `.dark` class**(运行时切换生效)。即移除挂载时的闪烁窗口,保留切换时的 apply 逻辑
- [X] T007 更新 `src/hooks/useMediaQuery.ts`:保留 `lg 1024` 切换点,补 `md 768` 查询导出(`isTablet`),供断点分支使用

**Checkpoint**: 主题无 FOUC、断点查询就绪

---

## Phase 3: User Story 1 - 视觉打磨 (Priority: P1) 🎯 MVP

**Goal**: 色彩/字体/圆角阴影 token 化落地,状态反馈统一,对比度达 WCAG AA

**Independent Test**: 亮/暗主题下逐屏走查间距/对齐/对比度/状态(悬停/聚焦/选中/加载/空/错误)统一且达 AA

### 实现

- [X] T008 [P] [US1] 在 `src/components/ui/toast.tsx` 补语义色变体(success/warning/info/destructive),统一位置与时序(FR-010)
- [X] T009 [P] [US1] 重构 `src/components/bookmark/BookmarkGrid.tsx` 的 `EmptyState` 与 `GridSkeleton`:收敛为调用 `StateEmpty`/`StateLoading`(T004),空状态含引导动作"添加书签"(FR-003)
- [X] T010 [US1] 校准 `src/index.css` 与 `tokens.css` 全部 HSL 变量:亮/暗各 token 对背景对比度达 WCAG AA(正文 ≥4.5:1,大文本 ≥3:1),用 Lighthouse a11y 审计核对(FR-002)
- [X] T011 [US1] 在各组件落地 type scale、elevation 与 focus ring token:`BookmarkCard`/`Header`/`CategoryNav`/`BookmarkForm`/`CategoryForm` 的字号与阴影改用新 token 类名,替换零散 `shadow-md`/`text-sm` 硬编码;全仓扫描各可交互元素落地 T001 的 `focus-visible:ring-2 ring-ring` 规范(FR-001/005)

**Checkpoint**: 视觉走查清单(SC-001)逐条勾验,`pnpm lint`/`typecheck` 通过

---

## Phase 4: User Story 2 - 交互体验提升 (Priority: P2)

**Goal**: 命令面板、卡片反馈、破坏性确认、toast 一致

**Independent Test**: 仅键盘完成增删改查/搜索/分类/主题全流程,焦点可见有序,反馈及时

### 实现

- [X] T012 [US2] 创建 `src/hooks/useVirtualList.ts`:虚拟滚动 hook(入参 items/itemHeight/containerHeight,返回 visibleItems + totalHeight 占位防 CLS),数据量小于一屏时退化不启用(FR-018,data-model §useVirtualList)
- [X] T013 [US2] 创建 `src/components/bookmark/CommandPalette.tsx`:全屏遮罩 + 居中输入 + 结果列表,复用 shadcn `Dialog`;Ctrl/Cmd+K 打开、Esc 关闭、↑↓ 选择、Enter 跳转;默认焦点落输入框;空结果用 `StateEmpty` 引导新建书签;结果列表接 `useVirtualList`(FR-008,contracts §4)
- [X] T014 [US2] 更新 `src/components/bookmark/BookmarkSearch.tsx`:内联框降级为命令面板触发器(点击或 Ctrl+K 打开 `CommandPalette`),移除内联实时过滤逻辑(由面板承载)(FR-008)
- [X] T015 [US2] 更新 `src/components/bookmark/BookmarkCard.tsx`:强化悬停反馈(`hover:-translate-y-0.5` + `shadow-elevation-md`),聚焦反馈复用 FR-005 的 `focus-visible:ring-2 ring-ring` 规范不另设光晕;favicon `<img>` 补 `loading="lazy" decoding="async"`(FR-007/018)
- [X] T016 [US2] 更新 `src/components/bookmark/BookmarkCard.tsx` 与 `src/components/category/CategoryNav.tsx` 的 `AlertDialog`:`AlertDialogCancel` 设 `autoFocus`,Enter 不触发删除(FR-006,contracts §7)
- [X] T017 [P] [US2] 用 `React.lazy` 懒加载 `CommandPalette`(T013 已建),减小首屏 JS(FR-019 代码分割)。注:`CategoryDrawer` 的懒加载并入 T021(US3,抽屉创建后)

**Checkpoint**: 键盘流(SC-002)逐项勾验

---

## Phase 5: User Story 3 - 响应式与适配增强 (Priority: P3)

**Goal**: 断点梯度、触摸热区、横竖屏宽度驱动、移动端底部 Tab+抽屉

**Independent Test**: 标准断点(640/768/1024/1280/1536)逐档无溢出,减少动效降级,拇指可达

### 实现

- [X] T018 [P] [US3] 全仓扫描可交互元素,移动端补 44×44px 最小热区:卡片操作按钮(`h-7 w-7` → `min-h-11 min-w-11` + padding)、分类标签、搜索触发器、主题切换(FR-013,contracts §8)
- [X] T019 [US3] 更新 `src/components/layout/AppLayout.tsx`:断点分支沿用 `lg 1024`,补 `md 768` 平板中间档布局调整;横竖屏靠宽度驱动不监听 orientation(FR-011)
- [X] T020 [US3] 创建 `src/components/category/CategoryDrawer.tsx`:移动端侧滑抽屉,复用 Radix Dialog/Sheet,含遮罩与焦点陷阱,承载完整分类列表(FR-014,contracts §5)
- [X] T021 [US3] 重构 `src/components/category/CategoryNav.tsx` 移动端分支:废弃顶部横向滚动标签栏,改底部固定 Tab("全部"/"分类"),点"分类"开 `CategoryDrawer`(T020 已建,此处用 `React.lazy` 懒加载);PC 分支增可折叠按钮(收起/展开,持久化收起态)+ 计数 badge 选中态高亮(FR-009/014,contracts §5)
- [X] T022 [P] [US3] 在 `src/index.css` 补 `@media (prefers-reduced-motion: reduce)` 降级:省略位移与阴影动效,保留即时态切换;焦点指示与状态过渡保留(FR-012,contracts §9)

**Checkpoint**: 断点矩阵(SC-003)逐档截图走查,减少动效降级生效

---

## Phase 6: User Story 4 - 前端性能优化 (Priority: P4)

**Goal**: LCP/TTI/INP/CLS 达标,虚拟滚动 + 懒加载,极端字段降级

**Independent Test**: 500+ 书签下 Lighthouse 移动模拟 + 3G 节流,四指标达标,滚动 60fps

### 实现

- [X] T023 [US4] 更新 `src/components/bookmark/BookmarkGrid.tsx`:接入 `useVirtualList`(T012),仅渲染可视区,占位总高防 CLS;数据量小于一屏退化(FR-018)
- [X] T024 [US4] 在 `src/components/bookmark/BookmarkCard.tsx` 与 favicon `<img>` 确认 `loading="lazy"` + `decoding="async"` + `onError` → `fallbackIcon`(依赖 T015 已补 loading,同文件,不并行);补首字母图标也失败的二次降级,如纯色块(FR-016/018)
- [X] T025 [US4] 在 `src/components/bookmark/BookmarkCard.tsx` 与 `BookmarkGrid.tsx` 落地极端字段降级:超长标题 `line-clamp-1` + `title` 全文;无效 URL 不破布局;构造 500+ 书签测试夹具(`tests/fixtures/500-bookmarks.json` + 导入辅助 `tests/helpers/seed.ts`)(FR-016)
- [X] T026 [P] [US4] 配置 Vite 构建优化:`vite.config.ts` 增 `build.rollupOptions.output.manualChunks`(分 vendor 与 app),确认 `pnpm build` 产物大小(FR-019)

**Checkpoint**: 性能基线(SC-004)用 Lighthouse 移动模拟 + 3G 节流测量达标

---

## Phase 7: Polish & 跨切面校验

**Purpose**: 跨故事一致性、E2E 覆盖、最终质量门

- [X] T027 [P] 创建 `tests/e2e/visual-walkthrough.spec.ts`:视觉走查 SC-001 亮/暗逐屏截图 + 对比度断言
- [X] T028 [P] 创建 `tests/e2e/keyboard-flow.spec.ts`:键盘流 SC-002 全流程 + 焦点序 + 破坏性确认默认焦点
- [X] T029 [P] 创建 `tests/e2e/responsive-breakpoints.spec.ts`:断点矩阵 SC-003 逐档无溢出 + 减少动效降级
- [X] T030 [P] 创建 `tests/e2e/performance-baseline.spec.ts`:性能 SC-004,环境为 Lighthouse 移动模拟 + 3G 节流,用 Playwright 驱动 `web-vitals` 库采集 LCP/TTI/INP/CLS(与 SC-004 措辞一致),四指标断言
- [X] T031 [P] 创建 `tests/e2e/theme-fouc.spec.ts`:FOUC SC-005 首帧 `.dark` class 一致性
- [X] T032 [P] 创建 `tests/e2e/extreme-fields.spec.ts`:极端字段 SC-006 超长标题/favicon 失效/无效 URL
- [X] T033 跑 `quickstart.md` 全场景校验:SC-001~006 逐条勾验
- [X] T034 跑质量门:`pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build`,任一失败如实报告不掩盖
- [X] T035 横切校验 FR-004:全组件键盘可达核对(Tab 序合理、焦点可见、不跳隐藏元素),覆盖 Header/CategoryNav/BookmarkGrid/BookmarkCard/CommandPalette/CategoryDrawer/各 Form/AlertDialog;与 T028(E2E 跑)互补,本任务为需求级逐组件核对

**Checkpoint**: 全部 SC 通过,质量门绿

---

## Dependencies & Execution Order

### Phase 依赖

- **Setup(Phase 1)**:无依赖,立即开始。T001~T004 可并行(不同文件)
- **Foundational(Phase 2)**:依赖 Setup 的 token 层。T005→T006(主题协调),T007 独立
- **US1 视觉(Phase 3)**:依赖 Phase 1+2。T008~T011 多数可并行,T010 校准依赖 T001 token 定义
- **US2 交互(Phase 4)**:依赖 Phase 2 + US1 的 toast 变体(T008)。T012 独立先行,T013 依赖 T012,T014 依赖 T013,T015~T016 独立
- **US3 适配(Phase 5)**:依赖 Phase 2(断点)。T018/T022 独立,T019→T020→T021
- **US4 性能(Phase 6)**:依赖 US1~3 稳定后归因。T023 依赖 T012(useVirtualList),T024~T026 多数独立
- **Polish(Phase 7)**:依赖全部故事完成

### 用户故事依赖

- **US1(P1)**:Phase 2 后可开始,无故事间依赖——MVP
- **US2(P2)**:依赖 T008(US1 的 toast 变体),否则语义色反馈缺失;其余独立
- **US3(P3)**:依赖 Phase 2 断点;不依赖 US1/2 可并行(若人力允许)
- **US4(P4)**:依赖 US1~3 稳定以便归因,兜底维度

### 故事内顺序

- token/基础设施先于组件落地
- hook(useVirtualList)先于使用它的组件(CommandPalette/BookmarkGrid)
- 组件实现先于 E2E 校验

### 并行机会

- Phase 1: T001/T002/T003/T004 全并行(不同文件)
- Phase 2: T007 与 T005/T006 并行
- Phase 5: T018/T022 与 T019~T021 并行
- Phase 7: T027~T032 全并行(各 E2E spec 独立)

---

## Implementation Strategy

### MVP First(仅 US1)

1. Phase 1 Setup(token + 状态占位)
2. Phase 2 Foundational(FOUC + 断点)
3. Phase 3 US1 视觉打磨
4. **STOP 验证**:视觉走查 SC-001,可演示/部署

### Incremental Delivery

1. Setup + Foundational → 基础就绪
2. + US1 视觉 → 走查通过 → 部署/演示(MVP)
3. + US2 交互 → 键盘流通过 → 部署
4. + US3 适配 → 断点矩阵通过 → 部署
5. + US4 性能 → 基线达标 → 部署
6. Polish → 全 SC 通过 → 质量门绿 → 发布

### Parallel Team Strategy

多人协作:Phase 1+2 共同完成后,US1/US3 可并行(US3 仅依赖 Phase 2),US2 依赖 US1 的 T008,US4 兜底最后。

---

## Notes

- [P] = 不同文件、无未完成依赖
- [Story] 标签映射到 spec.md 用户故事(P1~P4)
- 每故事可独立完成与测试
- token 色值为 TODO 实现期按 WCAG AA 反推(基准色相已定)
- 提交按任务或逻辑组,Conventional Commits 英文
- 任意 checkpoint 可停下验证单故事

---

## Phase 8: Convergence

- [X] T036 更新 `tests/e2e/search-visit-recent.spec.ts` 的选择器与断言以匹配重构后的 CommandPalette 搜索流(Ctrl+K 打开面板 → 面板内输入 placeholder 为"搜索书签（上下选择,回车打开）" → 结果/空态由面板承载),或移除被 T028 键盘流 spec 覆盖的冗余场景 per FR-008/T014 (contradicts)
- [X] T037 删除孤儿 hook `src/hooks/useSearch.ts`(T014 移除内联搜索后无调用方) per 宪法 III (unrequested)
- [X] T038 从 `package.json` 移除未使用的 `web-vitals` devDependency(T030 已改用原生 PerformanceObserver) per T030 (unrequested)
- [X] T039 说明 `CategoryNav.tsx` 静态导入 `CategoryDrawer` 的偏离为宪法 II 简洁优先的有意选择(抽屉体量小、随 CategoryNav 同 chunk 不影响首屏),在 tasks.md T021 注记或在 CategoryNav 代码注释记录,不改 lazy per T021 (partial)
