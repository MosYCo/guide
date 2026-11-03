# Spec Kit 历史归档

> **来源**:git tag `pre-speckit-removal`(提交 `e2e4164`)
> **归档日期**:2026-11-03
> **状态**:只作历史对照,不再执行

本目录保存 2026-07-28「前端显示层 UI/UX 系统性优化」的 Spec Kit 流程产物。项目已不再使用 Spec Kit,以下文件按原样保留,未做改写:

- `001-ui-ux-overhaul/spec.md`
- `001-ui-ux-overhaul/plan.md`
- `001-ui-ux-overhaul/tasks.md`
- `001-ui-ux-overhaul/checklists/requirements.md`
- `001-ui-ux-overhaul/checklists/ui-ux-quality.md`

**注意**:归档文件中的 `/speckit-*` 命令、`FR-###` / `T###` / `US#` / `SC-###` 编号、`/specs/...` 链接与 “Status: Draft” 等状态均为历史信息,不代表当前可执行流程。请勿按归档中的命令操作仓库。

## 与现行文档的对应关系

| 归档文件 | 现行替代 |
|---|---|
| `spec.md` | [design-decisions.md](../../design-decisions.md)、[ui-contract.md](../../ui-contract.md)、[quality-baseline.md](../../quality-baseline.md) |
| `plan.md` | [design-decisions.md](../../design-decisions.md)、[data-model.md](../../data-model.md)、[quality-baseline.md](../../quality-baseline.md) |
| `tasks.md` | 无直接替代;已完成任务仅作历史记录 |
| `checklists/requirements.md` | 无直接替代;需求质量评审已完成 |
| `checklists/ui-ux-quality.md` | [quality-baseline.md](../../quality-baseline.md) 的验收判定 |

## 归档内的失效链接

归档按原样保留,以下相对链接在原目录中有效,但在归档目录中可能失效;替代位置如下:

- `plan.md` 的 `./data-model.md` → [docs/data-model.md](../../data-model.md)
- `plan.md` 的 `./quickstart.md` → [docs/quickstart.md](../../quickstart.md)
- `plan.md` 的 `../../.specify/memory/constitution.md` → [docs/engineering-principles.md](../../engineering-principles.md)
- `checklists/ui-ux-quality.md` 的 `../contracts/ui-contract.md` → [docs/ui-contract.md](../../ui-contract.md)
- `checklists/requirements.md` 的 `./spec.md` → `../spec.md`(同目录上级)

完整的原始目录(含 research、data-model、contracts、quickstart 与 constitution)可通过 tag `pre-speckit-removal` 查看。
