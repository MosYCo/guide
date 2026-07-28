# UI 契约: 前端显示层 UI/UX 系统性优化

**Feature**: `001-ui-ux-overhaul` | **Date**: 2026-07-28 | **Phase**: 1

本文件定义四维度优化的 UI 组件契约。设计 token 的具体值见 [data-model.md](../data-model.md);技术依据见 [research.md](../research.md);需求来源见 [spec.md](../spec.md) 的 FR 编号(FR-001~019 已按视觉/交互/适配/性能四维度重排)。

---

## 1. 设计 Token 契约

### 色彩

- 保留现有橙色 primary `24.6 95% 53.1%` 与全量 HSL 变量(`--background` … `--ring`)。
- 新增 `--success` / `--warning` / `--info` 三组语义色阶(各 DEFAULT + foreground),亮/暗各一套,对比度达 WCAG AA。
- token 集中于 `src/styles/tokens.css`,由 `src/index.css` `@import`;`tailwind.config.js` `colors` 增对应映射。

### 字体

- 沿用系统字体栈(`ui-sans-serif, system-ui, ...`),不引入 web 字体。
- 四档 type scale:`--text-display` / `--text-h1` / `--text-body` / `--text-caption`,中文优化 `font-feature-settings`。

### 圆角/阴影

- 圆角阶梯 sm/md/lg 映射现有 `--radius`(已存在于 `tailwind.config.js`,文档化)。
- 四档阴影 elevation:sm/md/lg/popover。

---

## 2. 状态占位组件契约

| 组件 | 触发 | 必含元素 | 语义色 |
|---|---|---|---|
| `StateLoading` | `loading === true` | skeleton 占位(复用 `Skeleton`) | 中性 |
| `StateEmpty` | 列表空 / 搜索无结果 | 文案 + 引导动作按钮 | muted / info |
| `StateError` | 操作失败 | 原因文本 + 重试按钮 | destructive / warning |

**约束(FR-003)**:三态 MUST 统一呈现,配色走语义色阶,空状态必含引导动作。`BookmarkGrid` 现有 `GridSkeleton` 与 `EmptyState` 收敛为此三组件。

---

## 3. 书签卡片契约(BookmarkCard)

| 项 | 契约 | FR |
|---|---|---|
| 角色 | `role="button"` + `tabIndex={0}` + `onKeyDown`(Enter/Space) | FR-004/005 |
| 打开 | 整卡单击 → 新标签打开(`window.open(url, '_blank', 'noopener,noreferrer')`) | FR-007 |
| 悬停反馈 | `hover:-translate-y-0.5` + `shadow-elevation-md`(升降+阴影) | FR-007 |
| 聚焦反馈 | 复用 FR-005 的 `focus-visible:ring-2 ring-ring` 规范,不另设第二套光晕 | FR-005/007 |
| favicon | `<img loading="lazy" decoding="async" onError={fallbackIcon}>` | FR-018 |
| 极端字段 | `name` 用 `line-clamp-1` + `title` 全文;无效 URL 不破布局 | FR-016 |
| 破坏性 | 删除 → `AlertDialog` 二次确认,默认焦点落"取消" | FR-006 |

---

## 4. 命令面板契约(CommandPalette)

| 项 | 契约 | FR |
|---|---|---|
| 触发 | Ctrl/Cmd+K 打开;Esc 关闭 | FR-008 |
| 布局 | 全屏遮罩 + 居中输入框 + 结果列表(Spotlight/Raycast 风格) | FR-008 |
| 过滤 | 实时过滤书签(复用现有 `useSearch`) | FR-008 |
| 键盘 | ↑/↓ 选择;Enter 跳转(`onSelect`);Esc 关闭 | FR-004/008 |
| 默认焦点 | 打开时焦点落输入框;列表首项可视 | FR-005 |
| 容器 | 复用 shadcn `Dialog`(`dialog.tsx`) | — |
| 列表 | 虚拟滚动(复用 `useVirtualList`) | FR-018 |
| 空结果 | `StateEmpty`(引导动作:新建书签) | FR-003 |
| 关系 | `BookmarkSearch` 内联框降级为命令面板触发器(点击/Ctrl+K 打开面板) | FR-008 |

---

## 5. 分类导航契约(CategoryNav)

### PC 侧栏(`isPC === true`)

| 项 | 契约 | FR |
|---|---|---|
| 结构 | 侧栏列表(现有分支,不改结构) | 硬约束 |
| 折叠 | 新增折叠按钮(收起/展开侧栏),持久化收起态 | FR-009 |
| badge | 计数 badge 高亮,选中态 `bg-accent` | FR-009 |
| 拖拽 | 重排沿用 `onDragStart/onDragOver/onDrop`,反馈一致 | FR-009 |
| 操作 | `DropdownMenu` 重命名/删除,沿用 | FR-006 |

### 移动端(`isPC === false`)

| 项 | 契约 | FR |
|---|---|---|
| 顶部 | 废弃顶部横向滚动标签栏 | FR-014 |
| 底部 Tab | 固定底部 Tab("全部" / "分类"),热区 ≥44×44px | FR-013/014 |
| 抽屉 | 点"分类" Tab → 侧滑抽屉(`CategoryDrawer`,复用 Radix Dialog/Sheet)承载完整列表 | FR-014 |
| 拇指可达 | 底部 Tab 在拇指可达区(SC-003) | FR-014 |

---

## 6. 主题切换契约(FOUC 防护)

| 项 | 契约 | FR |
|---|---|---|
| 三态 | light/dark/system + matchMedia 监听(沿用 `useTheme`) | FR-017 |
| FOUC 防护 | `index.html` `<head>` 内联阻塞脚本:读 localStorage 主题 → 在 React 挂载前设 `.dark` class | FR-017 |
| 切换 | `ThemeToggle` 三态循环,`aria-label` 含当前态 | FR-005 |
| 无闪烁 | 首屏渲染前主题已定,无亮→暗闪(SC-005) | FR-017 |

---

## 7. 反馈与确认契约

| 项 | 契约 | FR |
|---|---|---|
| toast | 沿用 `ToastProvider`,补语义色变体(success/warning/info/destructive),位置/时序统一 | FR-010 |
| 破坏性确认 | `AlertDialog`,默认焦点落 `AlertDialogCancel`,Enter 不触发删除 | FR-006 |
| 错误不丢输入 | 表单错误后已填字段保留(BookmarkForm/CategoryForm) | FR-006 |

---

## 8. 触摸热区契约

| 项 | 契约 | FR |
|---|---|---|
| 最小热区 | 移动端所有可交互元素 ≥44×44px(WCAG 2.5.5,指可点击热区尺寸) | FR-013 |
| 落地 | 偏小按钮(`h-7 w-7` 等)用 `padding`/`min-h-11 min-w-11` 补齐 | FR-013 |
| 范围 | 卡片操作按钮、分类标签、底部 Tab、搜索触发器、主题切换 | FR-013 |

---

## 9. 响应式断点契约

| 断点 | 宽度 | 行为 |
|---|---|---|
| sm | ≥640px | 单列→双列网格 |
| md | ≥768px | 平板分支(补全中间档) |
| lg | ≥1024px | PC 侧栏布局(`useMediaQuery` 现有切换点) |
| xl | ≥1280px | 网格列数增加 |
| 2xl | ≥1536px | 最大容器 |

**约束(FR-011/SC-003)**:各断点无横向溢出、无错位,布局平滑切换;横竖屏靠宽度驱动,不监听 `orientation`。
