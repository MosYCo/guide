# Data Model: 前端显示层 UI/UX 系统性优化

**Feature**: `001-ui-ux-overhaul` | **Date**: 2026-07-28 | **Phase**: 1

> 本次为**显示层优化**,不改数据存储方式(硬约束),IndexedDB schema 与实体定义保持不变。本文件仅记录展示层新增的 token / 组件契约约束。既有实体定义见既有 `specs/001-bookmark-navigation/data-model.md` 与 `src/types/index.ts`。

## 设计 Token(新增,纯展示层)

token 集中在新增的 `src/styles/tokens.css`,由 `index.css` 接入;`tailwind.config.js` 映射为 Tailwind 颜色/字号 token。

### 色彩语义色阶(新增)

| Token | 基准色相 | 用途 | 校准约束 |
|---|---|---|---|
| `--success` | 绿系 | 操作成功 / 加载完成 | 亮/暗各一套,对背景达 WCAG AA |
| `--success-foreground` | 随 success | success 上的文本 | 同上 |
| `--warning` | 橙黄系 | 非破坏性提示 / 隐私模式 | 同上 |
| `--warning-foreground` | 随 warning | warning 上的文本 | 同上 |
| `--info` | 蓝系 | 中性提示 | 同上 |
| `--info-foreground` | 随 info | info 上的文本 | 同上 |

**约束**:所有语义色阶 MUST 在亮/暗主题下对背景对比度达 WCAG AA(FR-002)。具体色值在实现期用 WCAG 对比度工具(Tailwind 颜色工具或 Lighthouse a11y 审计)按 AA 校准;基准色相已定(success 绿 / warning 橙黄 / info 蓝),本数据模型不枚举具体 HSL,留实现期按对比度反推。

### 字体 type scale(新增)

| Token | 档位 | 字号 | 行高 | 字重 | 用途 |
|---|---|---|---|---|---|
| `--text-display` | 显示 | 待定 | 待定 | 待定 | 首屏标题 / 命令面板标题 |
| `--text-h1` | 标题 | 待定 | 待定 | 待定 | 区块标题 |
| `--text-body` | 正文 | 待定 | 1.5–1.75 | 400 | 默认文本 |
| `--text-caption` | 辅助 | 待定 | 待定 | 待定 | 域名 / 计数 / 时间 |

**约束**:中文优化 `font-feature-settings: "palt" 1` 或等价字距微调(FR-001 字体子条)。具体字号在实现阶段按 Tailwind 阶梯(`text-sm`/`text-base`/`text-lg`/`text-xl`)校准,非本数据模型枚举。

### 圆角阶梯(沿用 + 文档化)

| Token | 值 | 用途 |
|---|---|---|
| `--radius` | `0.5rem`(现有) | 基准 |
| `rounded-sm` | `calc(var(--radius) - 4px)` | 小元素 |
| `rounded-md` | `calc(var(--radius) - 2px)` | 卡片 |
| `rounded-lg` | `var(--radius)` | 大容器 |

### 阴影 elevation(新增四档)

| Token | 用途 |
|---|---|
| `shadow-elevation-sm` | 卡片静止态 |
| `shadow-elevation-md` | 卡片悬停态 |
| `shadow-elevation-lg` | 弹层/抽屉 |
| `shadow-elevation-popover` | popover/tooltip |

## 展示组件契约(新增,非数据实体)

### 状态占位组件

| 组件 | 触发态 | 必含 |
|---|---|---|
| `StateLoading` | 数据未到 | skeleton 占位,语义中性 |
| `StateEmpty` | 列表为空 / 搜索无结果 | 引导动作(如"添加书签"按钮) |
| `StateError` | 操作失败 | 原因文本 + 重试按钮,语义色 destructive/warning |

### 命令面板(CommandPalette)

| 属性 | 类型 | 说明 |
|---|---|---|
| `open` | boolean | Ctrl+K 触发 |
| `query` | string | 实时过滤 |
| `results` | Bookmark[] | 过滤结果 |
| `onSelect` | (bm: Bookmark) => void | Enter 跳转 |
| `onClose` | () => void | Esc 关闭 |
| 键盘 | ↑↓ 选择 / Enter 跳转 / Esc 关闭 | 默认焦点落首项 |

### 虚拟滚动 hook(useVirtualList)

| 入参 | 类型 | 说明 |
|---|---|---|
| `items` | T[] | 全量数据 |
| `itemHeight` | number | 单项高度(卡片定高) |
| `containerHeight` | number | 可视区高度 |

| 返回 | 类型 | 说明 |
|---|---|---|
| `visibleItems` | T[] | 仅可视区 |
| `totalHeight` | number | 占位总高(CLS 防护) |

## 既有实体展示约束(不改定义)

### Bookmark(展示层)

- `name`:超长时 `line-clamp-1` 省略(FR-010)
- `url`/`icon`:favicon `loading="lazy"` + `decoding="async"` + `onError` → `fallbackIcon`(FR-018);无效 URL 优雅降级不破布局
- `lastVisitedAt`:最近访问区展示,虚拟滚动复用

### Category(展示层)

- `name`:PC 侧栏 `truncate` + tooltip,移动端抽屉列表
- `order`:拖拽重排,拖拽反馈一致
- 计数 badge:高亮选中态

## 数据存储(不改)

IndexedDB `bookmark-navigation` v1,schema 详见既有 `specs/001-bookmark-navigation/data-model.md`。本次**不**新增 store、**不**改 index、**不**升 DB version。
