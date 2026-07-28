# UI/UX 需求质量 Checklist: 前端显示层 UI/UX 系统性优化

**Purpose**: 评审 spec/plan 的需求写作质量(完整性/清晰度/一致性/可测性/覆盖),作为 plan→tasks 之间的需求质量门。不测实现,只测需求是否写对、写全、可验。
**Created**: 2026-07-28
**Feature**: [spec.md](../spec.md) · [plan.md](../plan.md) · [contracts/ui-contract.md](../contracts/ui-contract.md)

**Note**: 本 checklist 由 `/speckit-checklist` 生成。四维度(视觉 P1 / 交互 P2 / 适配 P3 / 性能 P4)全覆盖,评审时机为 plan→tasks 之间。

## 需求完整性(是否写全了该写的)

- [ ] CHK001 - FR-001 三子项(色彩/字体/圆角阴影)是否都给出了"校准达 WCAG AA + 文档化为 token"的具体落地要求? [Completeness, Spec §FR-001]
- [ ] CHK002 - success/warning/info 三组语义色阶是否各自明确 DEFAULT + foreground 配对,而非仅一个色值? [Completeness, Spec §FR-001, data-model §色彩]
- [ ] CHK003 - type scale 四档(显示/标题/正文/辅助)是否覆盖了应用内全部文本场景(Header/卡片/导航/对话框/命令面板/空状态)? [Coverage, Spec §FR-001]
- [ ] CHK004 - 状态反馈是否覆盖加载/空/错误三类且每类都含"占位 + 引导动作"? [Completeness, Spec §FR-003]
- [ ] CHK005 - 命令面板(FR-008)是否定义了结果列表为空时的引导动作(新建书签)? [Coverage, Spec §FR-008, contracts §4]
- [ ] CHK006 - 移动端底部 Tab+抽屉(FR-014)是否定义了抽屉打开/关闭的触发与键盘可达? [Completeness, Spec §FR-014, contracts §5]
- [ ] CHK007 - 虚拟滚动(FR-018)是否定义了非可视区数据的占位总高以防 CLS? [Coverage, data-model §useVirtualList]
- [ ] CHK008 - FR-016 列了超长标题/favicon 缺失/无效 URL 三类极端,是否还有遗漏的极端场景(如超长 URL、emoji 标题)? [Gap, Spec §FR-016]

## 需求清晰度(是否量化、无歧义)

- [ ] CHK009 - "强化悬停/聚焦的可点击反馈(升降/阴影/光晕)"(FR-007)是否量化到具体位移/阴影档位/ring 宽度? [Clarity, Spec §FR-007, contracts §3]
- [ ] CHK010 - FR-002 "正文文本"与"大文本"的阈值是否明确(正常 4.5:1、大文本 3:1 + 大文本字号定义)? [Clarity, Spec §FR-002, Assumptions]
- [ ] CHK011 - FR-012 "降级非必要动画"是否定义了哪些是"必要"动画(如焦点指示)与降级方式(省略 vs 缩短)? [Clarity, Spec §FR-012, contracts §9]
- [ ] CHK012 - "中端移动 + 3G 慢速模拟"(FR-015)是否指定了可复现的节流配置(如 Lighthouse 移动模拟 + CPU 4× 节流)? [Clarity, Spec §FR-015, quickstart §场景4]
- [ ] CHK013 - FR-006 "默认焦点落取消"是否明确了 auto-focus 目标与 Tab 顺序,而非仅口头陈述? [Clarity, Spec §FR-006, contracts §7]
- [ ] CHK014 - "中文优化字距"(FR-001 字体)是否给出具体 `font-feature-settings` 值或等价定义,而非仅"优化"? [Clarity, data-model §字体]
- [ ] CHK015 - 触摸热区 44×44px(FR-013)是否明确了"可视尺寸"还是"可点击热区"(padding 撑大但视觉小的情形)? [Clarity, Spec §FR-013, contracts §8]

## 需求一致性(各处是否对齐,无矛盾)

- [ ] CHK016 - spec Assumptions 节的性能/断点/数据集规模是否与 FR-015/FR-011/SC-004/SC-003 完全一致(无残留"可在 clarify 调整"措辞)? [Consistency, Spec §Assumptions vs §FR/§SC]
- [ ] CHK017 - FR 编号顺序是否已按四维度分组连续重排(FR-001~006 视觉 / 007~010 交互 / 011~014 适配 / 015~019 性能),无乱序? [Consistency, Spec §FR]
- [ ] CHK018 - 命令面板(FR-008)与既有内联 BookmarkSearch 的关系是否明确("降级为触发器"而非并存)? [Consistency, contracts §4]
- [ ] CHK019 - PC 侧栏可折叠(FR-009)与"不改两套布局分支结构"硬约束是否真的不冲突(折叠态是否算结构变更)? [Consistency, Spec §FR-009 vs Assumptions]
- [ ] CHK020 - SC-005 "无闪烁(主观即时一致)"与"主观"措辞是否与 SC-004 量化基线风格不一致(一个主观一个客观)? [Consistency, Spec §SC-005 vs §SC-004]
- [ ] CHK021 - FR-017(FOUC 防护)与既有 useTheme 的 applyTheme 时机是否说明"内联脚本先于 React"而无重复设 class 的矛盾? [Consistency, contracts §6]

## 验收标准质量(SC 是否可测)

- [ ] CHK022 - SC-001 "视觉走查清单"是否定义了清单本身(逐条勾验的具体条目),而非仅"走查通过"? [Measurability, Spec §SC-001]
- [ ] CHK023 - SC-002 "仅用键盘完成核心流程"是否列出了被测流程的具体步骤(增/删/改/查/搜索/分类/主题),而非泛指? [Measurability, Spec §SC-002, quickstart §场景2]
- [ ] CHK024 - SC-003 断点集合已量化,但是否定义了"无溢出"的判定阈值(如 0px 横向滚动 vs 容差)? [Measurability, Spec §SC-003]
- [ ] CHK025 - SC-004 是否定义了测量工具(Lighthouse / web-vitals 库)与运行环境(生产构建 vs dev)? [Measurability, Spec §SC-004, quickstart §场景4]
- [ ] CHK026 - SC-005 "主观即时一致"是否给出可机器判定的替代(如首帧色值采样)? [Measurability, Spec §SC-005]
- [ ] CHK027 - SC-006 "布局不被破坏"是否给出判定方式(如截图比对 / 无溢出断言)? [Measurability, Spec §SC-006]

## 场景与边界覆盖(流程/异常是否齐全)

- [ ] CHK028 - 是否定义了"减少动效"系统偏好下的恢复路径(用户关闭偏好后动画是否恢复)? [Recovery, Spec §FR-012, Gap]
- [ ] CHK029 - 命令面板是否覆盖了"无匹配结果"的异常场景(已在 CHK005,合并确认)? [Exception Flow, Spec §FR-008]
- [ ] CHK030 - 横竖屏切换瞬间(Edge Cases 已列)是否给出了"平滑过渡"的可验定义,而非仅"靠宽度驱动"? [Clarity, Spec §Edge Cases]
- [ ] CHK031 - 隐私/无痕模式提示(Edge Cases)是否定义了"可达且不阻塞"的具体行为(提示类型/是否可关闭)? [Edge Case, Spec §Edge Cases, contracts §6]
- [ ] CHK032 - favicon 加载失败降级(FR-016/018)是否覆盖了"首字母图标也失败"的二次降级? [Edge Case, Spec §FR-018, data-model §favicon]
- [ ] CHK033 - 移动端抽屉打开时,背景内容是否定义了遮罩与焦点陷阱(dialog a11y)? [Coverage, contracts §5, Gap]
- [ ] CHK034 - 虚拟滚动列表在"数据量小于一屏"时是否定义了退化行为(不启用虚拟化)? [Edge Case, data-model §useVirtualList, Gap]

## 非功能需求(性能/无障碍/适配是否落到需求)

- [ ] CHK035 - 性能指标 LCP/TTI/INP/CLS 四项是否都写进 FR-015 与 SC-004,无遗漏(如 TTI 是否在 SC-004)? [Completeness, Spec §FR-015/§SC-004]
- [ ] CHK036 - 无障碍覆盖了对比度(FR-002)、键盘(FR-004/005)、触摸热区(FR-013),是否还缺焦点指示器可见性、ARIA 角色、屏幕阅读器公告? [Coverage, Spec §FR-002/004/005/016, Gap]
- [ ] CHK037 - 性能 FR-018(懒加载+虚拟滚动)与 FR-019(纯 CSR)是否都给出了"不破硬约束"的说明? [Consistency, Spec §FR-018/019 vs Assumptions]
- [ ] CHK038 - 代码分割(FR-019 提及)是否定义了分割粒度(路由级 vs 组件级)与懒加载触发? [Clarity, Spec §FR-019, Gap]

## 依赖与假设(是否文档化、被验证)

- [ ] CHK039 - "沿用当前设计"硬约束是否在每条可能触边的 FR(如 FR-014 移动端导航重构)显式说明不破界? [Assumption, Spec §Assumptions vs §FR-014]
- [ ] CHK040 - "500+ 书签"数据集规模假设是否给出了构造方式(导入脚本 / 测试夹具)? [Assumption, Spec §Assumptions, quickstart §场景4]
- [ ] CHK041 - "中端移动设备"假设是否指定了参考机型或 CPU 节流倍率? [Assumption, Spec §FR-015/Assumptions]
- [ ] CHK042 - 既有 useBookmarks/useCategories/useSearch hook 是否在 plan 标注了复用 vs 改造,避免实现期返工? [Dependency, plan §Project Structure]

## 歧义与冲突(需澄清或消除)

- [ ] CHK043 - FR-007"光晕"与 FR-005"焦点可见"是否可能产生双重 ring,需统一为一套 focus ring 规范? [Conflict, Spec §FR-007 vs §FR-005]
- [ ] CHK044 - FR-009"计数 badge 高亮"是否定义了高亮规则(选中 vs 非选中 vs 有书签/无书签)? [Ambiguity, Spec §FR-009, Gap]
- [ ] CHK045 - FR-010"toast 时序一致"是否量化了出现/消失时长,而非仅"一致"? [Ambiguity, Spec §FR-010]
- [ ] CHK046 - data-model 中"待校准"色值占位是否会在实现期成为阻塞歧义(需明确校准责任人与工具)? [Ambiguity, data-model §色彩]

## Notes

- 勾验:`[x]`;逐项评审 spec/plan 的需求质量,而非实现是否正确。
- 覆盖四维度 P1~P4,作为 plan→tasks 之间的需求质量门。
- 超过 80% 项含 `[Spec §X]` / `[Gap]` / `[Conflict]` 等追溯标记。
- 未通过项应在进入 `/speckit-tasks` 前回到 spec/plan 修订。
