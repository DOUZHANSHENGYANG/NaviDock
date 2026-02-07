# 2026-02-07 Release 流程（含安装包）

## 目标

为 NaviDock 提供可重复执行的 Windows release 构建流程，产出安装包：

- `NSIS` 安装器（`.exe`）
- `MSI` 安装包（`.msi`）

## 本地一键发布流程

### 方式 A：一键脚本（推荐）

```bash
npm run release:win
```

脚本位置：`scripts/release.ps1`

执行步骤：
1. `npm ci`
2. `npm run build`
3. `cargo check --manifest-path src-tauri/Cargo.toml`
4. `npm run tauri:build -- --ci --bundles nsis,msi`
5. 输出安装包目录清单

### 方式 B：拆分命令手动执行

```bash
npm run release:check
npm run release:bundle
```

## 产物路径

安装包默认输出在：

- `src-tauri/target/release/bundle/nsis/`
- `src-tauri/target/release/bundle/msi/`

## CI 自动化（GitHub Actions）

新增工作流：`.github/workflows/release-windows.yml`

触发条件：
- 打 tag：`v*`
- 手动触发 `workflow_dispatch`

工作流产物：
- `navidock-windows-installers`（包含 bundle 目录内容）

## 发布建议（操作顺序）

1. 更新版本号（`src-tauri/tauri.conf.json`）
2. 本地执行 `npm run release:win` 验证
3. 提交并打 tag（例如 `v0.2.0`）
4. 等待 GitHub Actions 产物生成并下载
