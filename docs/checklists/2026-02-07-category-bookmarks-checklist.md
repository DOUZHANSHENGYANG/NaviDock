# 2026-02-07 分类管理统一 + 浏览器书签导入 Checklist

## 本轮目标

- 把分类管理收敛到统一入口（设置中心）。
- 美化“添加网址/添加服务”按钮。
- 支持导入 Google Chrome 书签（HTML），并提供可选导入策略。
- 默认导入到“导入分类”，并允许用户随时切换默认导入分类。

## 已完成（代码实现）

- [x] 侧边栏移除内联分类增删改，改为设置中心统一管理入口
- [x] 新增 `CategoryManagerModal`（集中新增/重命名/删除分类）
- [x] 新增默认导入分类设置：`importCategoryId`
- [x] 前端状态模型与持久化结构新增 `importCategoryId` 字段
- [x] Rust `PersistedAppData` 新增 `import_category_id`（含默认值回退）
- [x] SQLite 初始化补齐 `cat-imported` 分类与 `importCategoryId` 默认设置
- [x] 导入配置时增加 `importCategoryId` 回退逻辑（缺失或无效时自动兜底）
- [x] 新增 `BookmarksImportModal`，支持书签 HTML 解析
- [x] 支持两种导入模式：
  - [x] 单分类导入（默认导入分类，可临时切换）
  - [x] 按书签文件夹自动建分类并导入
- [x] 设置页新增“导入书签”“分类管理”入口按钮
- [x] 顶部“添加服务”按钮视觉升级（渐变、悬浮态、统一文案）

## 已完成（编译/测试）

- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] `cargo check`
- [x] `cargo test`

## 待完成（交接给下一个 AI）

- [ ] Playwright 端到端回归（重点：分类管理 + 书签导入双模式）
- [ ] `tauri:dev` 桌面态人工冒烟（不是纯前端 dev）
- [x] 导入书签“同 URL 重复导入策略”已落地：若数据库已有同 URL，导入阶段自动跳过并统计 skipped 数
- [ ] 导入后分类切换与筛选体验细节打磨（批量导入后的可视反馈）
- [ ] 代码提交（当前改动尚未形成新 commit）

## 风险与备注

- 现有项目中中文 i18n 文案存在历史编码问题（部分显示为乱码），本轮未系统修复。
- Playwright 在本机偶发 `mcp-chrome` profile lock，需要先清理残留进程再执行自动化。
