# Implementation Plan: 前端显示层 UI/UX 系统性优化

**Branch**: `001-ui-ux-overhaul` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-ui-ux-overhaul/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

对书签导航应用前端显示层做四维度系统性优化:视觉(色彩/字体/圆角阴影 token 化、状态反馈统一)、交互(整卡单击即开、Ctrl+K 全屏命令面板、侧栏可折叠、破坏性确认与 toast 一致)、适配(Tailwind 默认断点梯度、44px 触摸热区、宽度驱动横竖屏、移动端底部 Tab+侧滑抽屉)、性能(LCP<1.5s/TTI<2s/INP<200ms/CLS<0.1、favicon 原生懒加载+虚拟滚动、纯 CSR)。硬约束:不改整体框架、不换 UI 组件库、不改数据存储方式。

## Technical Context

**Language/Version**: TypeScript 5.6 + React 18.3(现有)

**Primary Dependencies**: Vite 5.4、Tailwind CSS 3.4 + shadcn/ui(Radix UI)、idb 8(现有,不改);测试增量:`web-vitals`(性能 E2E 采集 LCP/TTI/INP/CLS,新增 devDependency)

**Storage**: IndexedDB(现有 `bookmark-navigation` 库,不改 schema;详见 [data-model.md](./data-model.md))

**Testing**: Vitest(单元/集成)+ Playwright(E2E);现有 `tests/unit`、`tests/integration`、`tests/e2e`(详见 [quickstart.md](./quickstart.md))

**Target Platform**: 现代浏览器(桌面/平板/手机),离线可用(IndexedDB + 纯 CSR)

**Project Type**: 纯前端 SPA(Vite),无后端

**Performance Goals**: 首屏 LCP < 1.5s、TTI < 2s(中端移动 + 3G 慢速模拟)、INP < 200ms、CLS < 0.1(500+ 书签数据集);滚动 60fps

**Constraints**: 硬约束"沿用当前设计"= 不改整体框架、不换 UI 组件库、不改数据存储;WCAG AA(对比度 4.5:1/3:1)+ WCAG 2.5.5(触摸热区 44×44px);纯 CSR 不做 SSR/预渲染

**Scale/Scope**: 500+ 书签大数据量验收;单仓单前端项目(`src/` + `tests/`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

对照 [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) v1.0.0:

- **I. 先思考再编码**: ✅ 通过。spec 经四轮 clarify 显式澄清视觉/交互/适配/性能四层假设;矛盾陈述(Assumptions 过时条目)已识别并在本次 plan 前清理。无默默假设。
- **II. 简洁优先**: ✅ 通过。优化范围严格限定四维度,无投机性特性;渲染策略选纯 CSR 而非 SSR/预渲染(最小复杂度);命令面板是用户显式选择,非代理擅自扩展。
- **III. 外科手术式改动**: ✅ 通过。硬约束"不改框架/不换库/不改存储"与"两套布局分支结构不改"直接对应;每条 FR 可追溯到 clarify 决议。无无关重构。
- **IV. 目标驱动执行**: ✅ 通过。每维度均有可测量成功标准(SC-001~006)与验收脚本(见 quickstart.md)。

**结论**: 无门违例,无需 Complexity Tracking 记录。

## Project Structure

### Documentation (this feature)

```text
specs/001-ui-ux-overhaul/
├── plan.md              # 本文件(/speckit-plan 输出)
├── research.md          # Phase 0 输出(/speckit-plan)
├── data-model.md        # Phase 1 输出(/speckit-plan)—— 展示层约束增量
├── quickstart.md        # Phase 1 输出(/speckit-plan)
├── contracts/           # Phase 1 输出(/speckit-plan)
│   └── ui-contract.md   # 视觉 token / 状态组件 / 命令面板契约
└── tasks.md             # Phase 2 输出(/speckit-tasks —— 本次不创建)
```

### Source Code (repository root)

```text
src/
├── styles/                  # 新增:设计 token 集中处
│   └── tokens.css           # 色彩语义色阶 / type scale / elevation / focus ring 规范
├── components/
│   ├── ui/                  # shadcn 基础组件(现有,补 44px 热区与状态变体)
│   │   ├── skeleton.tsx     # 复用为统一加载占位
│   │   ├── toast.tsx        # 补语义色变体
│   │   └── dialog.tsx       # 命令面板容器复用
│   ├── bookmark/
│   │   ├── BookmarkCard.tsx     # 强化悬停/聚焦反馈(FR-007)
│   │   ├── BookmarkGrid.tsx     # 接虚拟滚动(FR-018)
│   │   ├── BookmarkSearch.tsx  # 改为命令面板触发器(FR-008)
│   │   └── CommandPalette.tsx  # 新增:全屏命令面板
│   ├── category/
│   │   ├── CategoryNav.tsx      # PC 侧栏可折叠 + 移动端底部 Tab+抽屉(FR-009/014)
│   │   └── CategoryDrawer.tsx  # 新增:移动端侧滑抽屉
│   └── layout/
│       ├── AppLayout.tsx        # 断点分支沿用,补中间档
│       └── Header.tsx           # 主题切换按钮(FOUC 防护接入点为 index.html)
├── hooks/
│   ├── useTheme.ts         # FOUC 防护(FR-017)
│   ├── useMediaQuery.ts    # 断点沿用 lg 1024,补 md 768 查询
│   └── useVirtualList.ts   # 新增:虚拟滚动 hook(FR-018)
├── lib/
│   └── utils.ts            # 现有 cn,沿用
└── index.css              # 接入 tokens.css,语义色阶与 elevation 变量
```

**Structure Decision**: 沿用现有单前端项目结构(`src/` + `tests/`),不引入 monorepo或多包。新增 `src/styles/tokens.css`(设计 token 集中)与三个新组件(`CommandPalette`、`CategoryDrawer`、`useVirtualList`),其余为既有文件增量改。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

无门违例,本表留空。
