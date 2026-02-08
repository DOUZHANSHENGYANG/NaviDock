# 2026-02-07 Tauri 桌面态启动验证

## 执行命令
```bash
npm run tauri:dev
```

## 验证记录（2026-02-07）
- 启动日志确认 `BeforeDevCommand`（`npm run dev`）与 `DevCommand`（`cargo run ...`）均成功执行。
- 首次验证时出现端口占用：`Port 3000 is in use, trying another one...`，Vite 回退到 `3001`。
- 清理占用进程后再次验证，Vite 正常使用 `http://localhost:3000/`，并成功启动 `target\debug\app.exe`。

## 关键日志摘录
- `Running BeforeDevCommand ('npm run dev')`
- `Running DevCommand ('cargo  run --no-default-features --color always --')`
- `Finished 'dev' profile ...`
- `Running 'target\debug\app.exe'`

## 结论
- `tauri:dev` 桌面态启动链路通过。
- 当 3000 端口被占用时，Vite 会自动回退到 3001，可能导致 `tauri.conf.json` 的 `devUrl`（3000）与前端实际端口不一致；执行验证前应确保 3000 空闲或使用严格端口策略。

## 持续验证补充（2026-02-08 本机时区）
- 持续冒烟阶段访问地址为：`http://127.0.0.1:3000/`，HTTP 检查返回 `200`。
- 进程检查可见 `app.exe`、`cargo`、`node` 处于运行状态，确认本轮为桌面态链路而非纯前端 dev。
- 在该运行态下完成 round11 的“分类管理 + 书签导入（单双模式）”冒烟。

## 持续验证补充（2026-02-08 round14）
- 再次后台拉起 `npm run tauri:dev`，确认 `app.exe`、`cargo`、`node` 进程同时在位。
- `127.0.0.1:3000` 端口处于 LISTENING，前端页面可访问并完成 round14 自动化冒烟。
- 本轮验证覆盖：内嵌浏览面板、分类悬浮操作、空标签分类展示、去原生弹框行为。
