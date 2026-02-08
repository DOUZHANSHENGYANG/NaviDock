# 2026-02-08 UX 改造冒烟验证（round12）

## 验证目标
1. 卡片点击行为：单击打开链接（桌面态内部窗口命令已接入）
2. 侧边栏分类管理：悬浮展示重命名/删除、底部新增分类入口
3. 添加服务弹窗：视觉升级（新狂野主义）+ 分类下拉非原生样式
4. 自动获取：根据 URL 抓取标题/描述
5. 设置中心：移除“分类管理”入口（分类维护迁移到主界面）
6. 标签显示：按当前分类优先展示，分类无标签时回退全局标签

## 验证环境
- 日期：2026-02-08
- 运行：`npm run tauri:dev`（前台桌面态）
- 回归脚本：Playwright（Node）
- 访问地址：`http://127.0.0.1:3000/`

## 关键结果
- ✅ 侧边栏悬浮可见分类快捷操作（重命名/删除）
- ✅ 侧边栏底部新增分类按钮已存在，并复用分类管理弹窗
- ✅ 添加服务弹窗视觉风格明显增强（高饱和渐变 + 分区卡片）
- ✅ 分类选择已改为自定义下拉（非浏览器原生 select 外观）
- ✅ 自动获取验证通过：输入 `http://127.0.0.1:3000/` 后成功回填标题 `NaviDock`
- ✅ 设置弹窗内未再显示分类管理按钮
- ✅ 导入分类视图下标签区域仍有可选标签（无标签场景回退全局策略生效）

## 证据截图
- `86-round12-sidebar-hover-actions.png`
- `87-round12-add-service-modal-wild-style.png`
- `88-round12-add-service-category-dropdown-custom.png`
- `89-round12-add-service-autofetch-result.png`
- `90-round12-imported-category-tags-fallback.png`
- `91-round12-settings-without-category-manager-button.png`

## 备注
- “内部打开网站”在桌面态通过 Tauri `open_site_window` 命令实现；
  浏览器态（无 Tauri runtime）仍会回退为新标签打开。
- 自动获取在桌面态通过 Rust 侧请求页面并解析 HTML `<title>` 与 meta description，避免前端 CORS 限制。

---

## round14（2026-02-08）补测：内嵌浏览 + 标签范围 + 弹框去原生

### 本轮目标
1. 卡片点击改为**应用内内嵌浏览**（支持返回/前进/刷新/全屏/关闭）
2. 选中“无标签分类”时，标签区不再展示全局标签，改为“当前分类暂无标签”提示
3. 添加服务弹窗中，分类下拉层级高于“环境映射”区块（不再被遮挡）
4. 删除原生 `window.confirm/prompt/alert`（分类与服务删除改为 toast 二次确认）

### 本轮结果
- ✅ 卡片点击后出现右侧内嵌浏览面板；工具栏含返回、前进、刷新、外部打开、全屏、关闭。
- ✅ 全屏按钮可触发，Esc 可退出。
- ✅ 新建空分类后切换到该分类，标签区显示“当前分类暂无标签”。
- ✅ 侧边栏分类悬浮可见重命名/删除按钮；删除首击触发 toast 二次确认。
- ✅ Playwright 监听原生 dialog 计数为 `0`（无浏览器原生弹框）。
- ✅ 添加服务弹窗分类下拉展开时，覆盖层级正确（未被环境映射区遮挡）。

### 关于“百度描述抓取”说明
- 在 Playwright 浏览器态（`desktopApi.isEnabled = false`）下，跨域站点可能受 CORS 影响导致自动抓取受限；
- 本轮已在实现上补强：
  - URL 自动补全协议（`www.xxx.com` -> `https://www.xxx.com`）
  - https 元数据不足时自动回退尝试 http
  - 标题/描述解析增加 keywords 与正文摘要兜底
- 桌面态抓取逻辑同步增强（Rust 侧），用于绕过前端 CORS 限制。

### round14 截图
- `95-round14-initial-dashboard.png`
- `96-round14-add-service-modal-open.png`
- `97-round14-category-dropdown-over-env-fixed.png`
- `98-round14-autofetch-baidu-result.png`
- `99-round14-embedded-browser-open.png`
- `100-round14-embedded-browser-fullscreen.png`
- `101-round14-category-added-empty-tags.png`
- `102-round14-empty-category-tags-message.png`
- `103-round14-sidebar-hover-rename-delete.png`
- `104-round14-toast-delete-confirm-no-native-dialog.png`

---

## round15（2026-02-08）继续补测：地址栏导航 + 可退可进

### 本轮目标
1. 内嵌浏览面板支持地址栏输入并回车跳转
2. 回退/前进按钮在跳转后可持续触发
3. 确认仍无浏览器原生 dialog

### 本轮结果
- ✅ 内嵌浏览新增地址栏（支持手动输入 URL、回车/按钮前往）。
- ✅ 输入 `example.com` 后成功自动补全协议并在内嵌面板跳转。
- ✅ 回退按钮可退回上一页，前进按钮可再次前往。
- ✅ Playwright 监听 `dialog` 计数：`0`（仍无原生 confirm/prompt/alert）。

### round15 截图
- `105-round15-initial-dashboard.png`
- `106-round15-embedded-browser-open.png`
- `107-round15-addressbar-go-example.png`
- `108-round15-embedded-browser-back.png`
- `109-round15-embedded-browser-forward.png`

---

## round16（2026-02-08）补测：分类管理下拉主题化 + 内嵌缩放

### 本轮目标
1. 分类管理中的“默认导入分类”下拉不再使用浏览器原生样式
2. 内嵌浏览支持缩放（放大/缩小/重置）与“适配宽度”
3. 验证缩放控件在真实页面中可操作

### 本轮结果
- ✅ 分类管理默认导入分类改为自定义下拉（玻璃风格、主题色高亮、暗色模式一致）。
- ✅ 内嵌浏览新增缩放工具：`缩小` / `适配` / `百分比重置` / `放大`。
- ✅ 默认会按视口自动适配一轮，尽量让整页宽度可完整展示；可继续手动微调缩放。
- ✅ Playwright 原生 dialog 监听计数 `0`，无浏览器原生弹框回归。

### round16 截图
- `110-round16-dashboard-start.png`
- `111-round16-category-manager-open.png`
- `112-round16-category-manager-dropdown-themed.png`
- `113-round16-embedded-browser-zoom-controls.png`
- `114-round16-embedded-browser-fit-zoom.png`
- `115-round16-embedded-browser-zoom-in-out.png`

## round17（2026-02-08）补充：内嵌浏览窗口占比加大
- 将内嵌浏览面板宽度由 `48%` 调整为 `58%`（`min-w: 560px`, `max-w: 1240px`）。
- 浏览面板打开时，左侧卡片网格列数同步收敛（`xl:2列 / 2xl:3列`），避免拥挤。
- Playwright 量测结果：面板实际宽度占比约 `0.555`（> 0.52 目标）。
- 证据截图：`116-round17-embedded-browser-wider-layout.png`。
