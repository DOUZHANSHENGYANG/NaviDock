# 2026-02-07 Playwright 回归验证报告

## 验证环境
- 首轮日期：2026-02-07
- 持续补测：2026-02-08（本机时区）
- 分支：`feat/tauri-sqlite`
- 目录：`D:\01-CodeSpace\AICoding\NaviDock\tauri-worktree`
- 当前验证地址（已修正）：`http://127.0.0.1:3000/`
- 运行态：`npm run tauri:dev` 启动后桌面态实例 + Playwright MCP 联调

## 回归范围
1. 设置中心入口（分类管理、导入书签）
2. 分类管理弹窗
   - 默认导入分类回显
   - 分类列表状态检查（含导入自动创建分类）
3. 书签导入弹窗
   - 单分类导入模式
   - 按文件夹自动分组导入模式
   - 重复 URL 跳过提示与计数

## 关键结果（累计）
- 分类管理链路持续可用，弹窗可正常打开/关闭，默认导入分类当前为 **常用工具** 并可回显。
- 书签导入（单分类）在重复导入场景下提示：
  - `书签导入完成，共导入 0 条，跳过 2 条重复网址。`
- 书签导入（按文件夹自动分组）在重复导入场景下提示：
  - `书签导入完成，共导入 0 条，跳过 3 条重复网址。`
- 侧边栏与分类管理中持续可见 `SmokeR6 Folder A`、`SmokeR6 Folder B`，说明此前自动分组导入结果保持稳定。

## 重复策略观察结论（当前实现）
- 解析阶段会做 URL 去重。
- 当数据库中已存在相同 URL 时，当前行为为 **跳过重复**（不会覆盖现有记录）。
- 上述结论来自 round10/round11 连续重导验证提示文案与结果计数。

## 证据截图

### 历史轮次（节选）
- `73-round10-single-import-success.png`
- `74-round10-single-reimport-ready.png`
- `75-round10-single-reimport-result.png`
- `76-round10-folder-import-result.png`
- `77-round10-sidebar-after-folder-import.png`
- `78-round11-category-manager-open.png`

### 本次新增（round11 持续冒烟）
- `79-round11-settings-ready-for-import.png`
- `80-round11-import-modal-open-single.png`
- `81-round11-single-file-selected.png`
- `82-round11-single-import-result-acknowledged.png`
- `83-round11-folder-file-selected.png`
- `84-round11-folder-import-result-acknowledged.png`
- `85-round11-category-manager-post-import-check.png`

## 备注
- 文件上传受 Playwright MCP 允许目录限制，本次使用：
  - `D:\02-IDE\Microsoft VS Code\mcp-upload\navi-smoke\bookmarks-smoker6-single.html`
  - `D:\02-IDE\Microsoft VS Code\mcp-upload\navi-smoke\bookmarks-smoker6-folder.html`
- 若后续继续补测，建议沿用 round 编号递增并在本文件追加结果，避免散落到多个回归文档。

## round12（2026-02-08）补充
- 本轮重点聚焦 UX 与交互修复：
  - 网站卡片打开行为改为桌面态内部窗口
  - 添加服务弹窗视觉升级 + 自定义分类下拉
  - 侧边栏分类悬浮快捷操作 + 底部新增分类入口
  - 设置中移除分类管理入口
  - 标签改为“分类优先、无标签回退全局”
- 自动获取验证结果：输入 `http://127.0.0.1:3000/` 后标题成功回填 `NaviDock`。
- 证据详见：`2026-02-08-ux-improvements-smoke.md` 及截图 `86~91`。

## round14（2026-02-08）补充
- 交互形态调整：网站卡片点击改为**应用内内嵌浏览面板**，支持返回/前进/刷新/全屏/关闭。
- 标签范围修正：切换到“无标签分类”后，标签栏不再显示全局标签，而展示空状态提示。
- 弹框体验修正：去除原生 `window.confirm/prompt/alert`，统一改为 toast + 二次确认交互。
- 添加服务弹窗：分类下拉浮层层级提升，已验证不再被“环境映射”区块遮挡。
- 自动化验证：round14 Playwright 脚本监听原生 dialog 计数为 `0`。
- 证据截图：`95~104`（详见 `2026-02-08-ux-improvements-smoke.md`）。

## round15（2026-02-08）补充
- 内嵌浏览面板新增地址栏（手输 URL + 回车/按钮跳转），自动补全协议。
- `example.com` 跳转后，回退/前进按钮补测通过。
- Playwright round15 原生 dialog 监听计数仍为 `0`。
- 证据截图：`105~109`。

## round16（2026-02-08）补充
- 分类管理默认导入分类下拉完成主题化改造（非原生 select）。
- 内嵌浏览补充缩放工具栏：缩小 / 适配 / 百分比重置 / 放大。
- “适配”会按当前面板宽度自动计算初始缩放，提升整页可见度。
- Playwright round16 证据：`110~115`。
