# 2026-02-07 Tauri 迁移 Checklist

## 执行清单

- [x] 盘点原型结构和数据流（React Context + mock 数据）
- [x] 初始化 Git 仓库并完成 baseline 提交
- [x] 创建 `feat/tauri-sqlite` worktree
- [x] 安装 Tauri 依赖并初始化 `src-tauri/`
- [x] 完成 Rust 数据模型定义（`models.rs`）
- [x] 完成 SQLite3 数据层（`db.rs`）
- [x] 接入 Tauri 命令（`lib.rs` invoke handler）
- [x] 前端新增 desktop API 调用封装
- [x] 重构 NavContext 支持异步持久化
- [x] 更新组件事件（新增/编辑/删除）为异步链路
- [x] 更新项目 README（运行方式 + 持久化说明）
- [x] `cargo check` 通过
- [x] `npm run build` 通过
- [x] `npm run tauri:build -- --debug --no-bundle` 通过
- [x] Playwright 回归验证关键流程通过
- [x] Playwright 二次烟雾回归通过（新增分类后删除，确保状态一致）

## 验证记录

- Rust: `cargo check` ✅
- Web 构建: `npm run build` ✅
- Tauri 构建: `npm run tauri:build -- --debug --no-bundle` ✅
- Playwright（MCP）: ✅ 新建分类 / 新建服务 / 编辑服务 / 删除服务
- Playwright（MCP）二次复验: ✅ 新建空分类并删除（清理成功）

## 调试记录（Playwright 会话冲突）

- 现象：`browserType.launchPersistentContext` 启动失败，Chrome 提示“正在现有的浏览器会话中打开”。  
- 根因：`mcp-chrome` profile 存在残留 Chrome 进程，导致用户目录锁未释放。  
- 处理：清理残留 `chrome.exe`（`--user-data-dir ... mcp-chrome`）后重新拉起前端服务并复验通过。  

## 待后续增强（下一轮）

- [ ] 导出/导入配置功能（当前按钮仍是占位）
- [ ] 增加数据库迁移版本号机制（schema version）
- [ ] 加入端到端桌面模式自动化测试（tauri dev + UI）
