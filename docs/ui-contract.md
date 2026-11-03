# UI 契约:前端显示层 UI/UX 系统性优化

> **来源**:迁移自 `pre-speckit-removal:specs/001-ui-ux-overhaul/contracts/ui-contract.md`
> **迁移日期**:2026-11-03

本文件定义前端显示层四个维度优化的组件与页面契约。设计 token 的具体值见 [data-model.md](./data-model.md);技术决策与依据见 [design-decisions.md](./design-decisions.md);质量目标与验收基线见 [quality-baseline.md](./quality-baseline.md);手工验收步骤见 [quickstart.md](./quickstart.md)。

## 设计 Token 契约

| Token 类别 | 契约 | 标签 |
|---|---|---|
| 色彩 | 保留现有橙色 primary `24.6 95% 53.1%` 与全量 HSL 变量(`--background` … `--ring`);新增 `--success` / `--warning` / `--info` 三组语义色阶(各含 DEFAULT + foreground),亮/暗各一套,对比度达 WCAG AA。 | 视觉-色彩 |
| 字体 | 沿用系统字体栈(`ui-sans-serif, system-ui, ...`),不引入 web 字体;四档 type scale:`--text-display` / `--text-h1` / `--text-body` / `--text-caption`;中文优化 `font-feature-settings`。 | 视觉-字体 |
| 圆角 | 圆角阶梯 sm / md / lg 映射现有 `--radius`(已存在于 `tailwind.config.js`,文档化)。 | 视觉-圆角阴影 |
| 阴影 | 四档阴影 elevation:sm / md / lg / popover。 | 视觉-圆角阴影 |
| 聚焦环 | 全局规范为 `focus-visible:ring-2 ring-ring`;所有可交互元素复用同一套规范,不另设第二套光晕。 | 焦点可见 |

token 集中于 `src/styles/tokens.css`,由 `src/index.css` `@import`;`tailwind.config.js` 的 `colors`、`boxShadow`、`fontSize` 增加对应映射。

## Header 契约

| 项 | 契约 | 标签 |
|---|---|---|
| 结构 | 沿用当前 Header,不改整体框架;承载品牌、主题切换、搜索入口与添加书签。 | 硬约束 |
| 主题切换 | `ThemeToggle` 按 light → dark → system 三态循环;`aria-label` 含当前状态;用户切换时由 `useTheme` 调用 `applyTheme` 设置 `.dark` class。 | 主题切换 |
| 搜索入口 | 不再保留内联搜索框;Header 搜索按钮或 `Ctrl/Cmd+K` 打开 `CommandPalette`。 | 命令面板 |
| 新建书签 | Header 添加书签按钮或 `Ctrl/Cmd+N` 打开 `BookmarkForm`,打开后焦点落表单首项。 | 键盘可达 |
| 数据入口 | 保留导入/导出按钮;导入先显示预览 Dialog,解析/校验失败时原数据不变。 | 导入导出 |
| 视觉与可达 | Header 内可交互元素复用 type scale、elevation 与 focus ring;移动端热区不小于 44×44px。 | 焦点可见 / 触摸热区 |

## 页面布局契约(AppLayout)

| 视口 | 契约 | 标签 |
|---|---|---|
| PC(≥1024px) | Header + 左侧 CategoryNav 侧栏(可折叠) + 内容区 | 断点适配 |
| 平板(768–1023px) | 平板中间档(补全 md 断点) | 断点适配 |
| 移动端(<768px) | Header + 内容区 + 底部固定 Tab;内容区底部留白避免被 Tab 遮挡 | 移动底部 Tab |
| 横竖屏 | 由宽度驱动断点切换,不监听 `orientation` | 断点适配 |

## 状态反馈组件契约

| 组件 | 触发 | 必含元素 | 语义色 |
|---|---|---|---|
| `StateLoading` | `loading === true` | skeleton 占位(复用 `Skeleton`) | 中性 |
| `StateEmpty` | 列表空 / 搜索无结果 | 文案 + 引导动作按钮 | muted / info |
| `StateError` | 操作失败 | 原因文本 + 重试按钮 | destructive / warning |

**统一约束**:三态 MUST 统一呈现,配色走语义色阶,空状态必含引导动作。`BookmarkGrid` 原有的 `GridSkeleton` 与 `EmptyState` 收敛为此三组件。

## 书签卡片契约(BookmarkCard)

| 项 | 契约 | 标签 |
|---|---|---|
| 角色 | `role="button"` + `tabIndex={0}` + `onKeyDown`(Enter/Space) | 键盘可达 |
| 打开 | 整卡单击 → 新标签打开(`window.open(url, '_blank', 'noopener,noreferrer')`) | 整卡打开 |
| 悬停反馈 | `hover:-translate-y-0.5` + `shadow-elevation-md`(升降 + 阴影) | 悬停反馈 |
| 聚焦反馈 | 复用统一 `focus-visible:ring-2 ring-ring` 规范,不另设第二套光晕 | 焦点可见 |
| favicon | `<img loading="lazy" decoding="async" onError={fallbackIcon}>` | favicon 降级 |
| 极端字段 | `name` 用 `line-clamp-1` + `title` 全文;无效 URL 不破布局 | 极端字段 |
| 破坏性 | 删除 → `AlertDialog` 二次确认,默认焦点落"取消" | 破坏性确认 |

## 命令面板契约(CommandPalette)

| 项 | 契约 | 标签 |
|---|---|---|
| 触发 | `Ctrl/Cmd+K` 打开;`Esc` 关闭 | 命令面板 |
| 布局 | 全屏遮罩 + 居中输入框 + 结果列表(Spotlight/Raycast 风格) | 命令面板 |
| 过滤 | 实时过滤书签(按名称与 URL 匹配) | 命令面板 |
| 键盘 | ↑/↓ 选择;Enter 跳转(`onSelect`);Esc 关闭 | 键盘可达 |
| 默认焦点 | 打开时焦点落输入框;列表首项可视 | 焦点可见 |
| 容器 | 复用 shadcn `Dialog`(`dialog.tsx`) | — |
| 列表 | 虚拟滚动(复用 `useVirtualList`) | 虚拟滚动 |
| 空结果 | `StateEmpty`(引导动作:新建书签) | 状态反馈 |
| 关系 | Header 搜索按钮与 `Ctrl/Cmd+K` 打开 `CommandPalette`(原 `BookmarkSearch` 内联框已移除) | 命令面板 |

## 分类导航契约(CategoryNav / CategoryDrawer)

### PC 侧栏(`isPC === true`)

| 项 | 契约 | 标签 |
|---|---|---|
| 结构 | 侧栏列表(既有分支,不改结构) | 硬约束 |
| 折叠 | 折叠按钮收起/展开侧栏,持久化收起态 | 侧栏折叠 |
| badge | 计数 badge 高亮,选中态 `bg-accent` | 计数 badge |
| 拖拽 | 重排沿用 `onDragStart/onDragOver/onDrop`,反馈一致 | 拖拽排序 |
| 操作 | `DropdownMenu` 重命名/删除,沿用 | 侧栏折叠 |

### 移动端(`isPC === false`)

| 项 | 契约 | 标签 |
|---|---|---|
| 顶部 | 废弃顶部横向滚动标签栏 | 移动底部 Tab |
| 底部 Tab | 固定底部 Tab("全部" / "分类"),热区 ≥44×44px;当前实现另提供"新建"分类入口 | 移动底部 Tab |
| 抽屉 | 点"分类" Tab → 侧滑抽屉(`CategoryDrawer`,复用 Radix Dialog/Sheet)承载完整分类列表;含遮罩与焦点陷阱 | 分类抽屉 |
| 拇指可达 | 底部 Tab 位于拇指可达区 | 拇指可达 |

## 表单契约(BookmarkForm / CategoryForm)

| 项 | 契约 | 标签 |
|---|---|---|
| 打开 | `BookmarkForm` 由添加书签按钮或 `Ctrl/Cmd+N` 打开;`CategoryForm` 由新建分类入口打开;均在 Dialog 内,首项自动聚焦 | 键盘可达 / 焦点可见 |
| 书签字段 | URL 必填并经 `validateAndNormalizeUrl` 校验;名称必填;图标可选(留空自动解析);分类可选 | 表单校验 |
| 分类字段 | 名称必填,长度不超过 50 字符 | 表单校验 |
| 错误呈现 | 行内错误文本与字段关联(当前实现使用 `aria-invalid` / `aria-describedby`);错误后已填字段保留 | 错误不丢输入 |
| 提交反馈 | 成功/失败以 toast 反馈;提交中禁用取消与提交按钮,避免重复提交 | 非阻塞反馈 |
| 视觉与可达 | 表单控件复用 type scale、focus ring;移动端可交互控件热区 ≥44×44px | 触摸热区 |

## 主题切换契约(FOUC 防护)

| 项 | 契约 | 标签 |
|---|---|---|
| 三态 | light/dark/system + `matchMedia` 监听(沿用 `useTheme`) | 三态主题 |
| 主题键名 | localStorage 键 `bookmark-theme`(单一事实源,见 `@/utils/storage` 的 `THEME_KEY`);内联脚本与 hook MUST 共用此键名 | 主题键名 |
| FOUC 防护 | `index.html` `<head>` 内联阻塞脚本:读 localStorage 键 `bookmark-theme` → 在 React 挂载前设 `.dark` class | FOUC 防护 |
| 切换 | `ThemeToggle` 三态循环,`aria-label` 含当前态;用户切换时由 `useTheme` 调 `applyTheme` 设 class(挂载时不重复 apply,由内联脚本前置) | 主题切换 |
| 无闪烁 | 首屏渲染前主题已定,无亮→暗闪 | 无闪烁 |

## 反馈与确认契约

| 项 | 契约 | 标签 |
|---|---|---|
| toast | 沿用 `ToastProvider`,补语义色变体(success/warning/info/destructive);位置与时序统一(当前实现:右下角,3 秒自动消失) | Toast 语义色 |
| 破坏性确认 | `AlertDialog`,默认焦点落 `AlertDialogCancel`,Enter 不触发删除 | 破坏性确认 |
| 错误不丢输入 | 表单错误后已填字段保留(`BookmarkForm` / `CategoryForm`) | 错误不丢输入 |

## 触摸热区契约

| 项 | 契约 | 标签 |
|---|---|---|
| 最小热区 | 移动端所有可交互元素 ≥44×44px(WCAG 2.5.5,指可点击热区尺寸) | 触摸热区 |
| 落地 | 偏小按钮(`h-7 w-7` 等)用 `padding` / `min-h-11 min-w-11` 补齐 | 触摸热区 |
| 范围 | 卡片操作按钮、分类标签、底部 Tab、搜索触发器、主题切换 | 触摸热区 |

## 响应式断点契约

| 断点 | 宽度 | 行为 |
|---|---|---|
| sm | ≥640px | 单列→双列网格 |
| md | ≥768px | 平板分支(补全中间档) |
| lg | ≥1024px | PC 侧栏布局(`useMediaQuery` 现有切换点) |
| xl | ≥1280px | 网格列数增加 |
| 2xl | ≥1536px | 最大容器 |

**约束**:各断点无横向溢出、无错位,布局平滑切换;横竖屏靠宽度驱动,不监听 `orientation`。

**动效降级**:尊重 `prefers-reduced-motion: reduce`,省略位移与阴影动效,保留即时态切换与焦点指示(必要动画不降级)。

## 可访问性基线

以下为跨组件基线,各组件契约已在上文标注。

| 项 | 契约 | 标签 |
|---|---|---|
| 对比度 | 亮/暗主题下正文文本对背景 ≥4.5:1;大文本(≥18pt 或 ≥14pt 粗体)≥3:1(WCAG AA) | 视觉-对比度 |
| 键盘 | 仅用键盘完成增删改查、搜索、分类切换、主题切换等核心流程 | 键盘可达 |
| 焦点 | 焦点可见、顺序合理、不跳至隐藏元素;统一 `focus-visible:ring-2 ring-ring` | 焦点可见 |
| 语义与 ARIA | 书签卡片 `role="button"` 且有可读 `aria-label`;对话框具备标题/描述;加载用 `role="status"`,错误与 toast 用 `role="alert"`;图标按钮提供 `aria-label` | 可访问语义 |
| 对话框焦点 | `AlertDialog` 默认焦点落"取消";`CommandPalette` 打开聚焦输入框;`CategoryDrawer` 具备焦点陷阱,`Esc` 关闭 | 焦点管理 |
| 触摸热区 | 移动端可交互元素可点击热区 ≥44×44px(WCAG 2.5.5) | 触摸热区 |
| 减少动效 | 遵循 `prefers-reduced-motion`,降级非必要动画 | 减少动效 |

## 性能相关契约

| 项 | 契约 | 标签 |
|---|---|---|
| 性能基线 | 500+ 书签下首屏 LCP < 1.5s、TTI < 2s(中端移动 + 3G 慢速模拟)、INP < 200ms、CLS < 0.1 | 性能基线 |
| 渲染策略 | 沿用纯 CSR(Vite SPA),不做 SSR/静态预渲染;靠代码分割 + 懒加载 + 虚拟滚动达标 | 纯 CSR |
| favicon | 原生 `loading="lazy"` + `decoding="async"` + `onError` 降级 | favicon 降级 |
| 虚拟滚动 | 大数据量书签列表仅渲染可视区,占位总高防 CLS;数据量小于一屏时退化不启用 | 虚拟滚动 |
| 代码分割 | 命令面板(`CommandPalette`)按需加载(`React.lazy`) | 代码分割 |
