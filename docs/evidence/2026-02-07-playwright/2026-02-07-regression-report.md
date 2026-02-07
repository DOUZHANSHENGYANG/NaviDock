# 2026-02-07 Playwright 回归验证报告

## 验证环境
- 日期：2026-02-07
- 分支：`feat/tauri-sqlite`
- 目录：`D:\01-CodeSpace\AICoding\NaviDock\tauri-worktree`
- 前端访问地址（验证时）：`http://127.0.0.1:3300/`（已运行实例）

## 回归范围
1. 设置中心入口（分类管理、导入书签）
2. 分类管理弹窗
   - 新增分类
   - 重命名分类
   - 删除分类
   - 默认导入分类切换与持久化回显
3. 书签导入弹窗
   - 单分类导入模式
   - 按文件夹自动分组模式
   - 重复 URL 跳过提示与计数

## 关键结果
- 分类管理功能链路通过（增/改/删/默认导入分类）
- 默认导入分类从“导入分类”切换到“常用工具”后，关闭再打开弹窗仍正确回显
- 书签导入（单分类）提示：
  - `书签导入完成，共导入 2 条，跳过 2 条重复网址。`
- 书签导入（按文件夹自动分组）二次验证（新样本）提示：
  - `书签导入完成，共导入 3 条，跳过 0 条重复网址。`
- 按文件夹导入后，侧边栏出现自动创建分类：`Folder One`、`Folder Two`

## 证据截图
- `01-settings-modal-open.png`
- `02-settings-open-baseline.png`
- `03-settings-modal-actions-entry.png`
- `04-category-manager-open.png`
- `05-category-manager-add-category.png`
- `06-category-manager-rename-category.png`
- `07-category-manager-delete-category.png`
- `08-category-manager-change-default-import-category.png`
- `09-category-manager-default-import-persisted.png`
- `10-bookmark-import-modal-open-single-mode.png`
- `11-bookmark-import-single-mode-file-selected.png`
- `12-bookmark-import-single-mode-result-with-duplicate-skip.png`
- `13-bookmark-import-folder-mode-selected.png`
- `14-bookmark-import-folder-mode-new-file-selected.png`
- `15-bookmark-import-folder-mode-result-categories-created.png`
- `16-folder-mode-import-result-sidebar-categories.png`

## 备注
- Playwright 会话中出现 Vite HMR websocket 错误（`ws://127.0.0.1:3300` 拒绝连接），不影响本次 UI 操作链路验证。
- 文件上传受 Playwright MCP 允许目录限制，验证时将样本复制到：`D:\02-IDE\Microsoft VS Code\` 后再上传。
