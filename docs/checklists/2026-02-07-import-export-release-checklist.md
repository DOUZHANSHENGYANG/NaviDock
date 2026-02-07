# 2026-02-07 导入导出 + Release 流程 Checklist

## 功能实施

- [x] 设置弹窗导出按钮接入真实逻辑（下载 JSON）
- [x] 设置弹窗导入按钮接入真实逻辑（读取 JSON 并导入）
- [x] 前端 Context 新增 `exportConfig` / `importConfigFromText`
- [x] Rust 新增 `export_config` / `import_config` 命令
- [x] SQLite 导入逻辑：全量替换 + 事务提交 + 校验
- [x] 新增 release npm scripts（check / bundle / win）
- [x] 新增本地一键脚本 `scripts/release.ps1`
- [x] 新增 GitHub Actions 发布流程（tag 构建 MSI + NSIS）

## 验证记录

- [x] `cargo check` 通过
- [x] `cargo test` 通过（2 个导入导出单元测试）
- [x] `npm run build` 通过
- [x] `npx tsc --noEmit` 通过
- [x] `npm run release:check` 通过
- [x] `npm run release:bundle` 通过，产出：
  - `src-tauri/target/release/bundle/nsis/NaviDock_0.1.0_x64-setup.exe`
  - `src-tauri/target/release/bundle/msi/NaviDock_0.1.0_x64_en-US.msi`
- [x] Playwright 验证：设置弹窗可打开，导出按钮触发下载成功（`navidock-config-*.json`）

## 说明

- Playwright 在本机出现间歇性 `mcp-chrome` profile 锁冲突，已通过进程清理继续验证关键路径。
- 导入链路由 Rust 单元测试完成结构化校验，确保 JSON 导入后数据替换正确。
