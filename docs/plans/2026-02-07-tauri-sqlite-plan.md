# 2026-02-07 Tauri + SQLite3 集成规划（Worktree 模式）

## 1. 目标

把现有可运行的前端原型升级为桌面应用：

1. 使用 Tauri 脚手架承载前端。
2. 用 Rust 提供业务命令与数据交互。
3. 使用 SQLite3 做本地持久化。
4. 在 `docs/` 中保留可追踪的规划与 checklist。
5. 使用 Git Worktree 隔离开发。

## 2. Worktree 执行记录

- 原型目录初始化 Git 仓库并提交 baseline。
- 创建主分支：`main`
- 创建工作树分支：`feat/tauri-sqlite`
- 工作目录：`../tauri-worktree`

## 3. 架构拆分

### 前端（React）

- 保留原有页面和组件结构（低风险改造）。
- 在 `context/NavContext.tsx` 中引入异步数据操作。
- 新增 `services/desktopApi.ts` 封装 Tauri `invoke`。
- 非 Tauri 环境下自动回退 mock 数据，保证 `npm run dev` 仍可用。

### 后端（Tauri + Rust）

- `src-tauri/src/lib.rs`：命令注册与状态注入。
- `src-tauri/src/models.rs`：前后端共享数据结构。
- `src-tauri/src/db.rs`：SQLite 初始化、迁移、CRUD、设置存储。

## 4. 数据策略

- 首次启动自动建表。
- 默认分类/站点自动种子初始化（与原型一致）。
- 核心业务数据（分类、站点、标签）落盘。
- 偏好设置（theme/language/environment/viewMode）持久化。

## 5. 验证策略

1. `cargo check`：验证 Rust 编译。
2. `npm run build`：验证前端构建。
3. `npm run tauri:build -- --debug --no-bundle`：验证 Tauri 打包链路。
4. Playwright 回归关键交互：
   - 新建分类
   - 新建服务
   - 编辑服务
   - 删除服务

## 6. 产物

- Tauri 脚手架（`src-tauri/`）
- SQLite3 数据层与命令接口
- 前端异步数据接入
- docs 规划、数据库设计、执行 checklist
