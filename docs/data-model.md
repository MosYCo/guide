# 数据模型

> **来源**:迁移自 `pre-speckit-removal:specs/001-ui-ux-overhaul/data-model.md`;并依据当前代码核对 `src/types/index.ts`、`src/services/db.ts`、`src/services/import-export.ts`、`src/utils/url.ts`、`src/services/favicon.ts`、`src/styles/tokens.css`、`src/index.css`。
> **迁移日期**:2026-11-03
> **原始记录日期**:2026-07-28
> **时效说明**:本文描述当前工作树中的实现。原 data-model 引用的既有书签数据模型文档已不在仓库中,实体定义以当前 TypeScript 类型与数据服务为准。原文档中的需求编号已去除,改用描述性标题。

本文记录书签导航当前的实体字段、IndexedDB schema、JSON 导出/导入行为与关键不变量;末尾整理展示层仍在使用的设计 token 与组件约束。显示层优化没有改变数据存储方式:仍使用 IndexedDB `bookmark-navigation` v1,不新增 store、不改索引、不升版本。质量目标与验收基线见 [质量基线](./quality-baseline.md);组件级交互契约见 [UI 契约](./ui-contract.md),手工验收步骤见 [手工验收指南](./quickstart.md)。

## 实体模型

### Bookmark

| 字段            | 类型             | 说明与约束                                                                                                                                                    | 当前实现依据                                                                                                                        |
| --------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | `string`         | 系统生成的唯一 ID,UUID v4;作为 `bookmarks` store 的 `keyPath`                                                                                                 | `src/types/index.ts`、`src/hooks/useBookmarks.ts`、`src/services/import-export.ts`                                                  |
| `url`           | `string`         | 仅允许 `http:` / `https:`;保存与导入时规范化(缺少协议时补 `https://`,域名小写化);允许重复 URL                                                                 | `src/utils/url.ts`、`src/services/import-export.ts`、`src/hooks/useBookmarks.ts`                                                    |
| `name`          | `string`         | 书签名称;类型注释声明 1–100 字符;添加/编辑表单用 `maxLength={100}` 限制,提交前 `trim()` 且表单要求非空;数据层与导入路径不做长度校验                           | `src/types/index.ts`、`src/components/bookmark/BookmarkForm.tsx`、`src/hooks/useBookmarks.ts`、`src/services/import-export.ts`      |
| `icon`          | `string`         | 图标 URL。仅持久化用户显式提供的图标;留空时由展示层通过 favicon provider 解析(可禁用远程请求),失败降级为首字母/纯色块。JSON/HTML 导入保留合法图标或写空字符串 | `src/services/favicon.ts`、`src/hooks/useBookmarks.ts`、`src/services/import-export.ts`、`src/components/bookmark/BookmarkCard.tsx` |
| `categoryId`    | `string \| null` | 所属分类 ID;`null` 表示未分类。IndexedDB 无外键约束,删除分类时由应用层级联置空                                                                                | `src/services/db.ts`、`src/hooks/useBookmarks.ts`                                                                                   |
| `createdAt`     | `string`         | 创建时间,ISO 8601 字符串;列表按该字段倒序展示                                                                                                                 | `src/types/index.ts`、`src/services/db.ts`                                                                                          |
| `lastVisitedAt` | `string \| null` | 最后访问时间,ISO 8601;从未访问为 `null`;打开书签时更新                                                                                                        | `src/types/index.ts`、`src/services/db.ts`、`src/hooks/useBookmarks.ts`                                                             |
| `pinnedAt?`     | `string \| null` | 置顶时间,旧数据可缺省;`null` 表示未置顶。最多 5 个,由写入事务校验                                                                                             | `src/types/index.ts`、`src/services/db.ts`                                                                                          |

补充事实:

- 书签 URL 允许重复;`url` 索引不是唯一索引,`countByUrl` 用于统计重复数量。书签表单与导入预览会提示重复条数,但不阻止保存/导入。
- 删除书签是硬删除(`db.delete`),没有软删除或撤销机制。
- `getAllBookmarks()` 返回按 `createdAt` 倒序排列的数组;`getRecentBookmarks(limit = 10)` 过滤 `lastVisitedAt !== null`,按访问时间倒序截取。
- 书签 ID 由应用生成;JSON 导入会重新生成 UUID,不复用文件中的 ID。
- 置顶按置顶时间升序展示于首页,最多 5 个;旧记录缺少 `pinnedAt` 时视为未置顶。分类页不展示置顶区;最近访问排除置顶项,全部书签仍保留完整列表。

### Category

| 字段        | 类型     | 说明与约束                                                                                   | 当前实现依据                                                                                   |
| ----------- | -------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `id`        | `string` | 系统生成的唯一 ID,UUID v4;作为 `categories` store 的 `keyPath`                               | `src/types/index.ts`、`src/hooks/useCategories.ts`                                             |
| `name`      | `string` | 分类名称;`trim()` 后 1–50 字符;应用层要求全局唯一(精确匹配,区分大小写);表单 `maxLength={50}` | `src/hooks/useCategories.ts`、`src/components/category/CategoryForm.tsx`、`src/services/db.ts` |
| `order`     | `number` | 排序位置,非负整数;首个分类为 `0`,新增时取当前最大值 + 1;重排时按给定 ID 顺序写入索引         | `src/hooks/useCategories.ts`、`src/services/db.ts`                                             |
| `createdAt` | `string` | 创建时间,ISO 8601 字符串                                                                     | `src/types/index.ts`                                                                           |

补充事实:

- 分类是扁平结构,没有 `parentId` 或层级字段。导入浏览器书签 HTML 时,各级文件夹都会变成扁平分类,书签挂到其直接父文件夹对应的分类。
- 分类名唯一性在 `useCategories` 的创建/重命名路径用单事务检查;导入路径按名称合并到现有分类,不会新增同名分类;数据库仍没有唯一索引,因此"分类名唯一"是应用层意图,不是存储层强制不变量。
- `getAllCategories()` 按 `order` 升序返回。`order` 只作为排序键,导入数据可能带来重复或非连续的 `order`。

### BookmarkFormData

添加/编辑书签时使用的表单载荷:

| 字段          | 类型             | 说明                                          |
| ------------- | ---------------- | --------------------------------------------- |
| `url`         | `string`         | 必填;提交前必须通过 `validateAndNormalizeUrl` |
| `name`        | `string`         | 必填;提交前 `trim()`,表单限制 100 字符        |
| `icon?`       | `string`         | 可选;留空时由 `resolveIcon` 解析              |
| `categoryId?` | `string \| null` | 可选;空字符串在选择框中转换为 `null`          |

`Bookmark` 中的 `id`、`createdAt`、`lastVisitedAt` 由 `useBookmarks` 在新增/编辑时生成或保留,不由表单直接提交。

### ExportData

JSON 导出格式的根对象:

| 字段            | 类型         | 说明                              |
| --------------- | ------------ | --------------------------------- |
| `version`       | `string`     | 格式版本,当前导出固定为 `"1.0.0"` |
| `exportedAt`    | `string`     | 导出时间,ISO 8601                 |
| `bookmarkCount` | `number`     | 导出书签数量                      |
| `categoryCount` | `number`     | 导出分类数量                      |
| `categories`    | `Category[]` | 全部分类,按 `order` 升序          |
| `bookmarks`     | `Bookmark[]` | 全部书签,按 `createdAt` 倒序      |

### 辅助类型

| 类型                      | 字段                                                             | 说明                                                |
| ------------------------- | ---------------------------------------------------------------- | --------------------------------------------------- |
| `UrlValidationResult`     | `valid`、`normalized?`、`domain?`、`error?`                      | URL 校验结果;`valid === true` 时带规范化 URL 与域名 |
| `ImportPreview`           | `bookmarks`、`categories`、`skipped`                             | 导入前预览数量                                      |
| `ImportResult`            | `success`、`bookmarkCount`、`categoryCount`、`skipped`、`error?` | 导入结果;失败时 `success === false` 并带错误信息    |
| `Theme` / `ResolvedTheme` | `light \| dark \| system` / `light \| dark`                      | 主题偏好与实际生效主题                              |

## IndexedDB schema

数据库由 `idb` 的 `openDB` 懒初始化,模块内缓存 `dbPromise`;测试通过 `_resetDBForTesting()` 清空缓存。

| 项                | 当前值                                                      |
| ----------------- | ----------------------------------------------------------- |
| 数据库名          | `bookmark-navigation`                                       |
| 数据库版本        | `1`                                                         |
| object store      | `bookmarks`(keyPath `id`)、`categories`(keyPath `id`)       |
| `bookmarks` 索引  | `categoryId`、`createdAt`、`lastVisitedAt`、`url`           |
| `categories` 索引 | `order`、`name`                                             |
| 索引唯一性        | 全部为非唯一索引;没有数据库级唯一约束                       |
| 升级逻辑          | 仅首次 `upgrade` 创建 store 与索引;当前没有后续版本迁移分支 |

主要数据操作:

| 函数                                         | 行为                                             |
| -------------------------------------------- | ------------------------------------------------ |
| `getAllBookmarks()`                          | 读取全部书签,按 `createdAt` 倒序                 |
| `getBookmark(id)`                            | 按主键读取单条                                   |
| `addBookmark()` / `putBookmark()`            | 新增/更新书签;ID 已存在时 `add` 会失败           |
| `deleteBookmark(id)`                         | 硬删除单条书签                                   |
| `countByUrl(url)`                            | 通过 `url` 索引统计同一 URL 的书签数量           |
| `getRecentBookmarks(limit = 10)`             | 过滤有访问时间的书签,按 `lastVisitedAt` 倒序截取 |
| `updateLastVisited(id, visitedAt)`           | 只更新 `lastVisitedAt`,不存在时静默跳过          |
| `setBookmarkPinned(id, pinned)`              | 同一事务中检查最多 5 个置顶并更新置顶时间        |
| `getAllCategories()`                         | 读取全部分类,按 `order` 升序                     |
| `addCategory()` / `putCategory()`            | 新增/更新分类                                    |
| `deleteCategory(id)`                         | 删除分类并级联置空关联书签的 `categoryId`        |
| `countCategoryByName(name)`                  | 统计同名分类数量(应用层唯一性检查)               |
| `getMaxCategoryOrder()`                      | 返回最大 `order`;空库返回 `-1`                   |
| `bulkAddBookmarks()` / `bulkAddCategories()` | 批量写入,供导入使用;可传入外部事务               |

### 分类删除级联

`deleteCategory(id)` 在一个覆盖 `categories` 与 `bookmarks` 的 `readwrite` 事务中执行:

1. 删除 `categories` 中对应记录;
2. 打开 `bookmarks` 的 `categoryId` 索引,遍历所有匹配该分类 ID 的游标;
3. 将每条匹配书签的 `categoryId` 更新为 `null`;
4. 等待事务完成。

书签本身不会被删除,而是进入"未分类"。其他操作没有级联行为。

## 导出格式(version 1.0.0)

`exportToJson()` 并行读取全部书签与分类,组装为 `ExportData`;`downloadJson()` 以两空格缩进序列化,默认文件名为 `bookmarks-YYYY-MM-DD.json`,MIME 类型为 `application/json`。

示例结构:

```json
{
  "version": "1.0.0",
  "exportedAt": "2026-11-03T00:00:00.000Z",
  "bookmarkCount": 1,
  "categoryCount": 1,
  "categories": [
    {
      "id": "category-uuid",
      "name": "工作",
      "order": 0,
      "createdAt": "2026-11-03T00:00:00.000Z"
    }
  ],
  "bookmarks": [
    {
      "id": "bookmark-uuid",
      "url": "https://example.com/",
      "name": "Example",
      "icon": "https://www.google.com/s2/favicons?domain=example.com&sz=32",
      "categoryId": "category-uuid",
      "createdAt": "2026-11-03T00:00:00.000Z",
      "lastVisitedAt": null,
      "pinnedAt": "2026-11-03T00:00:00.000Z"
    }
  ]
}
```

说明:

- `version` 是导出常量 `EXPORT_VERSION = "1.0.0"`,当前没有其他版本分支。
- `bookmarkCount` / `categoryCount` 是导出时的数组长度,不是导入方的校验依据。
- 导出的书签包含完整字段;分类与书签顺序分别来自 `getAllCategories()` 与 `getAllBookmarks()`。

## 导入行为

### JSON 导入

解析(`parseJsonFile`)要求:

- 文件内容能 `JSON.parse` 且为对象;
- `version` 存在且为字符串;
- `categories` 与 `bookmarks` 都是数组;
- 每个分类至少有 `id`、`name`、`order`,且 `order` 为数字;
- 每个书签至少有 `id`、`url`、`name`,且 `icon` 为字符串;
- 任一条件不满足时抛出错误,由调用方展示错误信息。

当前实现只检查 `version` 是字符串,不校验它是否等于 `1.0.0`,也没有迁移旧版本的逻辑。

写入(`importFromJson`)行为:

- 为每个分类生成新的 UUID,并建立旧 ID → 新 ID 的映射;
- 为每个书签生成新的 UUID;
- 用 `validateAndNormalizeUrl` 重新校验书签 URL;非 `http/https` 或无法规范化的条目计入 `skipped`,不写入;
- 根据映射改写 `categoryId`;原分类不存在或没有分类时写入 `null`;
- 书签的其他字段(名称、图标、创建时间、最后访问时间)随展开保留;`pinnedAt` 可选,旧备份缺省时写为 `null`;导入的置顶项按文件顺序占用剩余名额,超过 5 个的部分作为普通书签导入;
- 分类与书签在同一个跨 store 的 `readwrite` 事务中写入(`bulkImport`);任一条失败时整体回滚;
- 分类按名称合并到现有分类(新分类 order 追加到现有 max 之后);URL 重复仅在预览中提示,不阻止导入;不自动备份;
- 成功返回 `ImportResult` 及计数;异常被捕获后返回 `success: false`,但已写入的前一批数据不会自动回滚。

预览阶段的 `skipped` 由 `parseJsonFile` 按导入规则逐条校验 URL 后统计;`importFromJson` 返回的 `skipped` 是实际写入时再次校验的结果。HTML 路径的 `parseHtmlFile` 与 `importFromHtml` 都会透传解析阶段统计的 `skipped`。

注意:导入预览对话框在失败时显示"原数据保持不变",与当前跨 store 单事务实现一致;任一写入失败都会整体回滚。

### HTML 导入

`parseHtmlFile` 解析 Netscape Bookmark Format:

- 用 `DOMParser` 读取 HTML,递归遍历 `<DL>` 下的 `<DT>`;
- 每个 `<H3>` 文件夹生成一个扁平 `Category`,名称为文件夹文本(空则"未命名"),`order` 在各自遍历层级内从 `0` 递增;
- 每个 `<A>` 书签使用 `validateAndNormalizeUrl` 校验链接,非 `http/https` 的条目计入 `skipped` 并跳过;
- 书签名称取链接文本,空则取域名,再空则"未命名";
- `icon` 写入空字符串,由展示层 favicon 兜底;
- `createdAt` 解析 `ADD_DATE`(Unix 秒)并转为 ISO;缺失时使用导入时刻;
- `lastVisitedAt` 与 `pinnedAt` 写入 `null`;
- 找不到根 `<DL>` 时抛出错误。

`importFromHtml` 将解析出的分类与书签在同一个跨 store 事务中写入;同名文件夹在解析阶段合并,解析阶段得到的 `skipped` 会透传到 `ImportResult`。

UI 依据文件名后缀/类型区分 JSON 与 HTML:`.json` 走 JSON 路径,`.html` 或 `text/html` 走 HTML 路径,其他格式提示不支持。

## 关键不变量

以下为当前实现预期维持的行为。注意"应用层意图"与"存储层强制"的区别。

| 不变量                       | 当前强制点                                                                                                                  | 例外与注意                                                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 书签 URL 仅允许 `http/https` | `validateAndNormalizeUrl` 在添加、编辑、JSON 导入、HTML 导入时调用;危险协议(`javascript:`、`data:`、`file:` 等)被拒绝或跳过 | IndexedDB 本身不校验;外部写入或损坏数据仍可能带无效 URL,展示层需要容忍(E2E 极端字段用例会直接注入无效 URL)。`localhost` 与 `127.0.0.1` 允许不带点 |
| 分类名唯一                   | 创建/重命名在单事务内按名称检查;导入按名称合并到现有分类                                                                    | 只在应用层;数据库 `name` 索引非唯一;合并后不会新增同名分类                                                                                        |
| 删除分类级联置空书签分类     | `deleteCategory` 在单事务内删除分类并把匹配书签的 `categoryId` 设为 `null`                                                  | 书签不会被删除;UI 随后显示在"未分类"                                                                                                              |
| 书签可以没有分类             | `categoryId` 允许 `null`;未分类书签在"全部"中展示                                                                           | 无外键约束;删除分类是产生未分类书签的主要路径                                                                                                     |
| 书签 URL 可以重复            | 没有唯一索引;`countByUrl` 统计重复数;表单/导入预览提示重复                                                                  | 同一 URL 可保存多条,名称可以不同                                                                                                                  |
| 分类是扁平结构               | `Category` 没有父级字段                                                                                                     | 浏览器书签的嵌套文件夹在导入时被扁平化                                                                                                            |
| 书签删除是硬删除             | `deleteBookmark` 直接删除记录                                                                                               | 没有软删除、回收站或撤销                                                                                                                          |
| ID 在导入时重新生成          | JSON 导入为分类和书签生成新 UUID,并重映射 `categoryId`                                                                      | 导入不会保留原 ID,跨文件引用依赖映射                                                                                                              |
| 分类 `order` 只保证可排序    | 新增取最大值 + 1;重排按 ID 顺序写入 0..n-1;导入新分类追加到现有 max 之后                                                    | 数据库不强制唯一,但正常写入路径保持非连续/递增                                                                                                    |

## 展示层 token

以下 token 来自当前 `src/styles/tokens.css` 与 `src/index.css`,不是原文档中的占位值。

### 语义色与基础色

token 以 HSL 分量定义,通过 `hsl(var(--token))` 使用;亮/暗主题各一套。基础色仍沿用 `src/index.css` 的 shadcn 变量体系,主色保持橙色。

| Token                  | 亮色             | 暗色             | 用途与约束                                                 |
| ---------------------- | ---------------- | ---------------- | ---------------------------------------------------------- |
| `--success`            | `142 71% 30%`    | `142 71% 50%`    | 成功/加载完成;亮色对白底约 4.83:1,暗色对 10% 背景约 9.37:1 |
| `--success-foreground` | `0 0% 100%`      | `0 0% 100%`      | success 背景上的文本                                       |
| `--warning`            | `38 92% 30%`     | `38 92% 60%`     | 非破坏性提示/隐私模式;亮色对白底约 5.41:1,可达 AA          |
| `--warning-foreground` | `20 50% 18%`     | `40 80% 12%`     | warning 背景上的文本                                       |
| `--info`               | `217 91% 45%`    | `217 91% 65%`    | 中性提示;亮色约 6.0:1,暗色约 5.72:1                        |
| `--info-foreground`    | `0 0% 100%`      | `0 0% 100%`      | info 背景上的文本                                          |
| `--primary`            | `24.6 95% 53.1%` | `24.6 95% 53.1%` | 主色保持橙色,与既有设计一致                                |
| `--ring`               | `24.6 95% 53.1%` | `24.6 95% 53.1%` | 焦点环颜色                                                 |

`tailwind.config.js` 已把 `success` / `warning` / `info` 映射为 `DEFAULT` + `foreground` 两档颜色。

### Type scale

| Token              | 字号             | 行高  | 字重  | 用途                   |
| ------------------ | ---------------- | ----- | ----- | ---------------------- |
| `--text-display-*` | `1.875rem`(30px) | `1.3` | `700` | 首屏欢迎标题等显示文本 |
| `--text-h1-*`      | `1.25rem`(20px)  | `1.4` | `600` | 区块标题、对话框标题   |
| `--text-body-*`    | `0.875rem`(14px) | `1.6` | `400` | 默认正文               |
| `--text-caption-*` | `0.75rem`(12px)  | `1.5` | `400` | 域名、计数、辅助信息   |

- Tailwind `fontSize` 同时提供 `text-display` / `text-h1` / `text-body` / `text-caption` 类名。
- 当前实现把每档拆为 `--text-*-size`、`--text-*-line`、`--text-*-weight` 三个变量,上表用 `--text-display-*` 等缩写表示这一组变量。
- 字体栈沿用系统字体:`ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;`body` 设置 `font-feature-settings: "palt" 1`,不加载 web 字体。
- 原文档未给出具体值的字号/行高/字重,已由上述实现值取代。

### 圆角阶梯

| Token / 类   | 值                          | 用途     |
| ------------ | --------------------------- | -------- |
| `--radius`   | `0.5rem`                    | 圆角基准 |
| `rounded-lg` | `var(--radius)`             | 大容器   |
| `rounded-md` | `calc(var(--radius) - 2px)` | 卡片     |
| `rounded-sm` | `calc(var(--radius) - 4px)` | 小元素   |

### 阴影 elevation

四档阴影均以 CSS 变量定义,`tailwind.config.js` 提供 `shadow-elevation-*` 类名。

| Token                        | 用途              | 亮色值                                                                                            | 暗色值                                                                       |
| ---------------------------- | ----------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `--shadow-elevation-sm`      | 卡片静止态        | `0 1px 2px 0 hsl(var(--foreground) / 0.05)`                                                       | `0 1px 2px 0 hsl(0 0% 0% / 0.3)`                                             |
| `--shadow-elevation-md`      | 卡片悬停态        | `0 4px 6px -1px hsl(var(--foreground) / 0.1), 0 2px 4px -2px hsl(var(--foreground) / 0.1)`        | `0 4px 6px -1px hsl(0 0% 0% / 0.4), 0 2px 4px -2px hsl(0 0% 0% / 0.4)`       |
| `--shadow-elevation-lg`      | 弹层/抽屉         | `0 10px 15px -3px hsl(var(--foreground) / 0.1), 0 4px 6px -4px hsl(var(--foreground) / 0.1)`      | `0 10px 15px -3px hsl(0 0% 0% / 0.5), 0 4px 6px -4px hsl(0 0% 0% / 0.5)`     |
| `--shadow-elevation-popover` | popover / tooltip | `0 10px 38px -10px hsl(var(--foreground) / 0.35), 0 10px 20px -10px hsl(var(--foreground) / 0.2)` | `0 10px 38px -10px hsl(0 0% 0% / 0.7), 0 10px 20px -10px hsl(0 0% 0% / 0.5)` |

### 焦点环与动效

- `--focus-ring: 0 0 0 2px hsl(var(--ring))`;`.focus-ring` 工具类统一使用 `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`,作为唯一焦点环规范,不另设第二套光晕。
- `@media (prefers-reduced-motion: reduce)` 下,所有元素的 `animation-duration` / `transition-duration` 降为 `0.01ms`,`animation-iteration-count: 1`,`scroll-behavior: auto`;即时状态切换与焦点指示保留。

### 虚拟列表

当前 `useVirtualList<T>(items, itemHeight, containerHeight)` 返回:

| 返回值                 | 说明                                                   |
| ---------------------- | ------------------------------------------------------ |
| `visibleItems`         | 可视区及上下缓冲项                                     |
| `totalHeight`          | `items.length * itemHeight`,用于占位撑高、防 CLS       |
| `offsetY`              | 起始项的纵向偏移,用于绝对定位                          |
| `containerRef`         | 滚动容器 ref                                           |
| `scrollToIndex(index)` | 滚动到指定索引,内部对 `[0, items.length - 1]` 做 clamp |

实现细节:

- 上下各多渲染 `overscan = 3` 项,减少滚动边缘闪烁;
- 滚动监听使用 `passive: true` + `requestAnimationFrame` 节流;
- 数据量小于阈值时调用方退化全量渲染,不启用虚拟化。

当前调用方的阈值与尺寸:

| 调用方           | 启用条件                    | 单项高度 | 可视高度 | 其他                                   |
| ---------------- | --------------------------- | -------- | -------- | -------------------------------------- |
| `BookmarkGrid`   | 书签数 `> 60`               | `76px`   | `600px`  | 小于等于 60 条全量渲染;占位总高防 CLS  |
| `CommandPalette` | `results.length * 56 > 400` | `56px`   | `400px`  | 无查询最多展示 50 条,有查询最多 200 条 |

按行多列虚拟化后,1280px 下书签列表一次约渲染 52 张(13 行 × 4 列,含上下缓冲),命令面板约 14 项;窄屏列数减少时渲染量同步下降。目标仍是只渲染可视区及少量缓冲。

## 展示层组件约束(非数据实体)

| 组件                            | 当前约束                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BookmarkCard`                  | 整卡 `role="button"` + `tabIndex={0}` + `Enter`/`Space` 打开(仅卡片自身聚焦,内嵌菜单不冒泡);横向条目(32px 图标在左、名称和域名/路径在右,高 `4.75rem`),名称 `line-clamp-1` 并带 `title`,地址截断并保留完整 URL 的 `title`;`window.open(url, '_blank', 'noopener,noreferrer')`;边框与背景轻量分隔,悬停强调,统一的 `focus-ring`;favicon `loading="lazy"` + `decoding="async"` + `referrerPolicy="no-referrer"`,远程图标加载前先显示低饱和度的本地首字母占位,失败降级链为 favicon → 首字母 SVG → 纯色块 SVG |
| `StateLoading`                  | 复用 `Skeleton`,容器 `role="status"` + `aria-label="加载中"`                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `StateEmpty`                    | 文案 + 可选引导动作;书签为空时引导"添加书签",搜索无结果时引导"清除搜索"                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `StateError`                    | 原因文本 + 可选重试按钮,容器 `role="alert"`,配色走 destructive                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `CommandPalette`                | `Ctrl/Cmd+K` 打开,`Esc` 关闭,`↑`/`↓` 选择,`Enter` 跳转;打开时焦点落输入框;空结果显示"新建书签"引导;结果列表可虚拟滚动                                                                                                                                                                                                                                                                                                                                                                                   |
| `CategoryNav`                   | PC(`isPC`,≥1024px)侧栏可折叠,折叠态写入 `localStorage` 的 `category-nav-collapsed`;计数 badge;分类名 `truncate` + `title`;拖拽重排;非 PC 分支渲染底部固定 Tab(全部/分类/新建),点击"分类"打开左侧抽屉承载完整分类列表。当前 `isPC` 为假时都会走该分支,因此 768–1023px 也会渲染底部 Tab,平板形态需按质量基线复核                                                                                                                                                                                          |
| `CategoryDrawer`                | 复用 Radix `Dialog`,自带遮罩与焦点陷阱;分类项最小高度 `min-h-11`;选择后关闭                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `BookmarkForm` / `CategoryForm` | URL 校验与错误提示;名称 `maxLength`;分类名去空格、非空、≤50;错误后已填字段保留                                                                                                                                                                                                                                                                                                                                                                                                                          |

## 与原文档的差异

- 原 data-model 引用的既有书签数据模型文档已不存在;本文改为直接依据当前 `src/types/index.ts`、`src/services/db.ts` 与 `src/services/import-export.ts`。
- 原文档的语义色、type scale、圆角、阴影多处未给出具体值;本文使用 `src/styles/tokens.css` 与 `src/index.css` 中的实际值,并保留 `tokens.css` 注释中的对比度说明。
- 原文档称书签 `icon` "保存后必有值";当前 JSON/HTML 导入可以把 `icon` 写成空字符串,展示层用 favicon 兜底,因此它不是数据库级不变量。
- 原 `useVirtualList` 契约只列 `visibleItems` 与 `totalHeight`;当前实现还返回 `offsetY`、`containerRef`、`scrollToIndex`,并由调用方设定启用阈值。
- 原文档提到最近访问区复用虚拟滚动;当前最近访问区最多取 10 条并直接渲染,虚拟滚动实际用于"全部书签"列表与命令面板结果。
- 原文档提到分类"同层级唯一";当前分类是扁平结构,唯一性仅在应用层创建/重命名时检查,导入可绕过。
