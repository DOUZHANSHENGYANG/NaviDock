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
