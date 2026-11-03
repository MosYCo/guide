# 文档索引

Moss Guide 书签导航的工程文档。原 Spec Kit 工作流已于 2026-11-03 停用,有价值的设计资产迁移到本目录,纯流程产物归档到 `docs/archive/spec-kit/`。

## 现行文档

| 文档                                                     | 内容                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| [engineering-principles.md](./engineering-principles.md) | 工程原则 I–IV、语言与文档约束、质量门、治理                  |
| [design-decisions.md](./design-decisions.md)             | 2026-07-28 UI/UX 系统性优化的技术决策、理由与备选方案        |
| [data-model.md](./data-model.md)                         | 实体字段与约束、IndexedDB schema、导入导出格式、展示层 token |
| [ui-contract.md](./ui-contract.md)                       | 设计 token、组件/交互/响应式/可访问性契约                    |
| [quality-baseline.md](./quality-baseline.md)             | 性能、可访问性、响应式、虚拟滚动等目标基线与验收判定         |
| [quickstart.md](./quickstart.md)                         | 手工验收场景与自动化测试入口                                 |

## 历史归档

- [archive/spec-kit/](./archive/spec-kit/README.md) — Spec Kit 流程产物(spec / plan / tasks / checklists),仅作历史对照。文中 `/speckit-*` 命令、FR/T/US/SC 编号与旧状态均已失效。

原始文档完整保留在 git tag [`pre-speckit-removal`](https://github.com/MosYCo/guide/tree/pre-speckit-removal)(提交 `e2e4164`)。

## 日常操作

- 编码、提交与质量门约定见根 [CLAUDE.md](../CLAUDE.md)。
- 项目简介、技术栈与常用命令见根 [README.md](../README.md)。
