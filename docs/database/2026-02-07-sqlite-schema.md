# 2026-02-07 SQLite3 数据库设计（NaviDock）

## 1. 设计原则

- 与现有前端数据结构一一映射，减少改造成本。
- 优先可维护性：清晰主从关系 + 外键约束。
- 支持后续扩展（收藏、排序、最近访问等）。

## 2. 表结构

### `app_categories`

| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | 分类 ID（如 `cat-system-dev`） |
| name | TEXT | 分类名（内置可为翻译 key） |
| icon | TEXT | 图标名 |
| type | TEXT | `system` / `user` |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

### `app_sites`

| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | 站点 ID |
| title | TEXT | 标题 |
| description | TEXT | 描述 |
| icon | TEXT NULL | 图标 |
| dev_url | TEXT | 开发地址 |
| prod_url | TEXT | 生产地址 |
| category_id | TEXT FK | 归属分类 |
| status | TEXT | `online/offline/pending` |
| view_type | TEXT | `webview/browser` |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

> 外键：`category_id -> app_categories.id ON DELETE CASCADE`

### `app_site_tags`

| 字段 | 类型 | 说明 |
|---|---|---|
| site_id | TEXT FK | 站点 ID |
| tag | TEXT | 标签 |

主键：`(site_id, tag)`，删除站点自动级联清理标签。

### `app_settings`

| 字段 | 类型 | 说明 |
|---|---|---|
| key | TEXT PK | 设置项 key |
| value | TEXT | 设置值 |
| updated_at | TEXT | 更新时间 |

当前使用 key：
- `theme`
- `language`
- `environment`
- `viewMode`

## 3. 初始化策略

应用启动时：

1. 自动建表（`CREATE TABLE IF NOT EXISTS`）
2. 检查是否为空库：
   - 空则插入默认分类与默认站点
3. 初始化默认设置（`INSERT OR IGNORE`）

## 4. 命令与数据映射

- `load_app_data` -> 全量读取（分类 + 站点 + 设置）
- `create_site/update_site/delete_site` -> 站点增删改
- `create_category/update_category/delete_category` -> 分类增删改（仅 user 分类可编辑删除）
- `update_setting` -> 偏好设置更新

## 5. 约束与校验

- Rust 层校验站点状态与视图类型合法性
- 标签去空、去重（大小写不敏感）
- 系统分类禁止删除/编辑
