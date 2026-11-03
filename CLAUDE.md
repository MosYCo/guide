# CLAUDE.md — Moss Guide 书签导航

本文件是编码代理在本仓库内的逐行工作约定,只承载项目规则与操作指令。

项目概况:基于浏览器的本地书签导航应用,React 18 + Vite + TypeScript + Tailwind + shadcn/ui,数据持久化在 IndexedDB,无后端。技术栈与脚本详见 [`README.md`](./README.md),架构、设计决策与质量基线见 [`docs/README.md`](./docs/README.md)。

## 语言规则(混合语言操作)

本仓库遵循以下语言与文档约定(文档/对话中文、标识符英文、提交英文 Conventional Commits);此处仅补操作细则:

- **敲代码时**:标识符(变量、函数、类型、组件、文件名)用英文,匹配既有命名风格(`useBookmarks`、`BookmarkCard`)。
- **字符串与注释**:面向用户的展示文案与注释优先中文;若周边既有代码为英文,跟随既有风格,不强加中文。
- **文档与代码混排**:保持标识符为原文英文,说明性文字为中文,不机械翻译(例如文档里写 `useBookmarks` hook,不写成"使用书签钩子")。
- **提交时**:英文 Conventional Commits,与既有提交一致(`feat:` / `fix:` / `chore:` / `docs:` / `refactor:` / `perf:`)。

## 发现问题

- 发现与项目原则冲突的问题,先说明、等用户确认再改;项目原则本身需要变更,同样先确认,不在实现中悄悄改。

(发现问题先说明、等用户确认再改代码的约定见全局 `~/.claude/CLAUDE.md`,此处不重述。)

## 质量与验收(操作)

收尾 MUST 通过 `pnpm lint` / `typecheck` / `test`,类型或公开 API 变更同步测试,UI 路径变更补 E2E。此处仅补操作:

```bash
pnpm lint        # ESLint,零警告
pnpm typecheck   # tsc --noEmit
pnpm test        # Vitest 单元 + 集成(e2e 不含,由下条单独跑)
pnpm test:e2e    # Playwright E2E,涉及用户路径时
pnpm build       # tsc -b && vite build,提交前或部署前
pnpm build:prod  # 生产构建(等价于 pnpm build),部署用
```

- 任一环节失败,如实报告输出,不掩盖。
