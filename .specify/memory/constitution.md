<!--
Sync Impact Report
- 版本变更: (未填充模板) → 1.0.0
- 修改的原则: 无(首次填充模板占位符)
  - [PRINCIPLE_1_NAME] → I. 先思考再编码
  - [PRINCIPLE_2_NAME] → II. 简洁优先
  - [PRINCIPLE_3_NAME] → III. 外科手术式改动
  - [PRINCIPLE_4_NAME] → IV. 目标驱动执行
  - [SECTION_2_NAME] → 语言与文档约束
  - [SECTION_3_NAME] → 质量门与验收
- 新增章节: Core Principles(I–IV)、语言与文档约束、质量门与验收、Governance
- 删除章节: 无
- 模板同步状态:
  - .specify/templates/constitution-template.md — ✅ 无需改动(模板本身保留占位符供新项目使用)
  - .specify/templates/plan-template.md — ✅ 无需改动(Constitution Check 章节由 /speckit-plan 运行时填充,模板占位符保留正确)
  - .specify/templates/spec-template.md — ✅ 无需改动(无宪法直接引用)
  - .specify/templates/tasks-template.md — ✅ 无需改动(无宪法直接引用)
- 后续 TODO: 无
-->

# Moss Guide 书签导航 Constitution

## Core Principles

### I. 先思考再编码

实现前 MUST 显式陈述假设;不确定时 MUST 询问用户,不得默默选择。存在多种合理解读时 MUST 一并列出,交由用户裁决,不得擅自挑其一。发现更简方案时 MUST 提出,必要时反驳用户方案。感到困惑时 MUST 停下,命名困惑点并提问,不得带着糊涂实现。

**理由**: LLM 常见失败模式是"默默假设后大规模返工"。把澄清前置到实现之前,代价远低于实现之后的纠正。

### II. 简洁优先

仅交付被要求的功能,不得引入未被请求的特性、抽象、灵活性或配置项。一次性使用的代码 MUST NOT 被抽象。不可能发生的场景 MUST NOT 编写错误处理。若 200 行能压缩为 50 行,MUST 重写。设计与计划 MUST 通过"资深工程师是否会认为过度复杂"的自检。

**理由**: 投机性代码增加阅读、测试与维护成本,且常常从未被使用。YAGNI。

### III. 外科手术式改动

每一处改动 MUST 能直接追溯到用户请求。MUST NOT 顺手"改进"相邻代码、注释或格式;MUST NOT 重构未坏之物。MUST 匹配既有风格,即便个人偏好不同。发现无关死代码时 SHOULD 提示用户,但 MUST NOT 擅自删除。因自身改动而产生的孤儿(未用 import / 变量 / 函数)MUST 清理;既有死代码 MUST NOT 删除,除非被明确要求。

**理由**: 无关改动污染 diff、抬升评审成本、引入回归风险。每一行变更都应能追溯到需求。

### IV. 目标驱动执行

每个任务 MUST 被转化为可验证目标(成功标准);"让它能用"之类的弱标准 MUST NOT 作为收尾依据。修复缺陷 MUST 先写复现测试再修复;新增校验 MUST 先写失败测试再实现;重构 MUST 确保前后测试均通过。多步任务 MUST 给出带校验点的简短计划,形如:`步骤 → 验证: [检查]`。

**理由**: 强成功标准让代理能独立循环到完成;弱标准迫使反复澄清,且常以"看起来好了"掩盖未覆盖的边界。

## 语言与文档约束

- 与用户的对话回复及所有生成的文档(规格、计划、任务、宪法、检查清单等)MUST 使用中文。
- 代码标识符(变量、函数、类型、文件名、组件名)MUST 使用英文;字符串字面量与注释优先中文,若与既有代码风格冲突则跟随既有风格。
- 文档与代码混排时,MUST 保持标识符为原文英文,说明性文字为中文;MUST NOT 将英文标识符机械翻译为中文。
- Git 提交信息 MUST 使用英文 Conventional Commits 风格(遵循仓库既有约定,如 `feat:` / `fix:` / `chore:`)。
- 运行期混合语言的具体操作规则见仓库根 `CLAUDE.md`;本宪法仅立原则,不重复其操作细节。

## 质量门与验收

- 收尾前 MUST 依次通过 `pnpm lint`(零警告)、`pnpm typecheck`、`pnpm test`。
- 类型变更或公开 API 变更 MUST 同步受影响的单元 / 集成测试。
- 验收 MUST 对照规格(spec.md)的成功标准逐条勾验;MUST NOT 以"能运行"替代对照验收。
- 涉及用户路径的 UI 变更 SHOULD 补充 Playwright E2E 用例(位于 `tests/e2e/`)。
- 发现既有代码违反宪法原则时,MUST 先向用户陈述问题、原因、修改方案,获确认后再改。

## Governance

- 本宪法凌驾于其他一切实践之上;`spec.md` / `plan.md` / `tasks.md` MUST 合规,出现冲突以宪法为准。若原则本身需要变更,必须通过单独、显式的宪法更新(`/speckit-constitution`)完成,不得在 `/speckit-analyze` 或实现过程中悄悄稀释或重新解释。
- 修订 MUST 记录变更内容与迁移计划,并按语义化版本递增:`MAJOR` = 原则删除或重定义(向后不兼容);`MINOR` = 新增原则或实质性扩展;`PATCH` = 措辞、笔误、非语义澄清。
- 所有计划评审 MUST 逐条核对宪法原则;任何复杂度 MUST 被正当理由支撑(见 plan 模板 Complexity Tracking 表)。
- 运行期开发指引见仓库根 `CLAUDE.md`,其承载逐行编码、测试与验收的工作约定;本宪法不重复其内容,仅以路径引用。

**Version**: 1.0.0 | **Ratified**: 2026-07-28 | **Last Amended**: 2026-07-28
