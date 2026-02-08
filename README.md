# NaviDock Prototype -> Tauri Desktop

本项目已从纯前端原型升级为 **Tauri + Rust + SQLite3** 架构：

- 前端：React + Vite
- 桌面容器：Tauri v2
- 数据层：Rust + rusqlite（SQLite3）

## 快速开始

### 1) 安装依赖

```bash
npm install
```

### 2) Web 原型模式（不启用 Tauri）

```bash
npm run dev
```

> 在纯浏览器模式下，会使用内存 mock 数据，便于快速调样式。

### 3) Tauri 桌面模式（启用 SQLite 持久化）

```bash
npm run tauri:dev
```

### 4) 打包（调试构建，跳过安装包）

```bash
npm run tauri:build -- --debug --no-bundle
```

### 5) Release 打包（含安装包）

```bash
npm run release:bundle
```

> 该命令会生成 NSIS + MSI 安装包。

## SQLite 数据库存储位置

应用首次运行会自动初始化数据库：

- 文件名：`navidock.sqlite3`
- 路径：Tauri `app_data_dir` 下（按操作系统自动分配）

## Rust 命令接口

前端通过 `@tauri-apps/api/core` 的 `invoke` 调用：

- `load_app_data`
- `create_site`
- `update_site`
- `delete_site`
- `create_category`
- `update_category`
- `delete_category`
- `update_setting`
- `export_config`
- `import_config`

## 导入/导出配置

- 入口：设置弹窗 -> 数据管理
- 导出：下载 `navidock-config-*.json`
- 导入：选择 JSON 文件，导入后自动刷新当前状态（桌面模式会同步写入 SQLite）

## Worktree 工作流（已采用）

当前开发分支通过 `git worktree` 创建，建议后续继续沿用隔离开发：

```bash
git worktree add ../tauri-worktree -b feat/<topic>
```
