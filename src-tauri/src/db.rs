use std::{collections::HashSet, fs, path::PathBuf, sync::Mutex};

use rusqlite::{params, Connection, OptionalExtension, Transaction};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

use crate::models::{Category, EnvConfig, PersistedAppData, SiteItem};

pub struct AppState {
    pub conn: Mutex<Connection>,
}

impl AppState {
    pub fn new(conn: Connection) -> Self {
        Self {
            conn: Mutex::new(conn),
        }
    }
}

pub fn init_state(app: &AppHandle) -> Result<AppState, String> {
    let db_path = resolve_db_path(app)?;

    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("创建数据目录失败: {error}"))?;
    }

    let conn = Connection::open(&db_path)
        .map_err(|error| format!("打开 SQLite 数据库失败 ({}): {error}", db_path.display()))?;

    conn.pragma_update(None, "foreign_keys", "ON")
        .map_err(|error| format!("启用 foreign_keys 失败: {error}"))?;
    conn.pragma_update(None, "journal_mode", "WAL")
        .map_err(|error| format!("启用 WAL 模式失败: {error}"))?;

    init_schema(&conn)?;
    seed_default_data(&conn)?;

    Ok(AppState::new(conn))
}

pub fn load_app_data(conn: &Connection) -> rusqlite::Result<PersistedAppData> {
    let categories = list_categories(conn)?;
    let sites = list_sites(conn)?;

    Ok(PersistedAppData {
        sites,
        categories,
        environment: get_setting(conn, "environment", "PROD")?,
        view_mode: get_setting(conn, "viewMode", "grid")?,
        theme: get_setting(conn, "theme", "system")?,
        language: get_setting(conn, "language", "zh")?,
    })
}

pub fn create_site(conn: &mut Connection, mut site: SiteItem) -> Result<SiteItem, String> {
    validate_site(&site)?;

    if site.id.trim().is_empty() {
        site.id = format!("site-{}", Uuid::new_v4().simple());
    }

    site.tags = normalize_tags(&site.tags);

    let tx = conn
        .transaction()
        .map_err(|error| format!("创建事务失败: {error}"))?;

    insert_site(&tx, &site).map_err(|error| format!("写入站点失败: {error}"))?;

    tx.commit()
        .map_err(|error| format!("提交站点失败: {error}"))?;

    Ok(site)
}

pub fn update_site(conn: &mut Connection, site: SiteItem) -> Result<SiteItem, String> {
    validate_site(&site)?;

    let mut normalized = site.clone();
    normalized.tags = normalize_tags(&site.tags);

    let tx = conn
        .transaction()
        .map_err(|error| format!("创建事务失败: {error}"))?;

    let changed_rows = tx
        .execute(
            "UPDATE app_sites
       SET title = ?2,
           description = ?3,
           icon = ?4,
           dev_url = ?5,
           prod_url = ?6,
           category_id = ?7,
           status = ?8,
           view_type = ?9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1",
            params![
                normalized.id,
                normalized.title,
                normalized.description,
                normalized.icon,
                normalized.env_config.dev_url,
                normalized.env_config.prod_url,
                normalized.category_id,
                normalized.status,
                normalized.view_type
            ],
        )
        .map_err(|error| format!("更新站点失败: {error}"))?;

    if changed_rows == 0 {
        return Err("未找到需要更新的站点".to_string());
    }

    tx.execute(
        "DELETE FROM app_site_tags WHERE site_id = ?1",
        params![normalized.id],
    )
    .map_err(|error| format!("清理标签失败: {error}"))?;

    for tag in &normalized.tags {
        tx.execute(
            "INSERT INTO app_site_tags (site_id, tag) VALUES (?1, ?2)",
            params![normalized.id, tag],
        )
        .map_err(|error| format!("更新标签失败: {error}"))?;
    }

    tx.commit()
        .map_err(|error| format!("提交站点更新失败: {error}"))?;

    Ok(normalized)
}

pub fn delete_site(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM app_sites WHERE id = ?1", params![id])
        .map_err(|error| format!("删除站点失败: {error}"))?;
    Ok(())
}

pub fn create_category(conn: &Connection, name: &str) -> Result<Category, String> {
    let normalized_name = name.trim();
    if normalized_name.is_empty() {
        return Err("分类名称不能为空".to_string());
    }

    let category = Category {
        id: format!("cat-{}", Uuid::new_v4().simple()),
        name: normalized_name.to_string(),
        icon: "Folder".to_string(),
        category_type: "user".to_string(),
    };

    conn.execute(
        "INSERT INTO app_categories (id, name, icon, type) VALUES (?1, ?2, ?3, ?4)",
        params![
            category.id,
            category.name,
            category.icon,
            category.category_type
        ],
    )
    .map_err(|error| format!("创建分类失败: {error}"))?;

    Ok(category)
}

pub fn update_category(conn: &Connection, id: &str, name: &str) -> Result<Category, String> {
    let normalized_name = name.trim();
    if normalized_name.is_empty() {
        return Err("分类名称不能为空".to_string());
    }

    let changed_rows = conn
        .execute(
            "UPDATE app_categories
       SET name = ?2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1 AND type = 'user'",
            params![id, normalized_name],
        )
        .map_err(|error| format!("更新分类失败: {error}"))?;

    if changed_rows == 0 {
        return Err("分类不存在，或系统分类不可编辑".to_string());
    }

    Ok(Category {
        id: id.to_string(),
        name: normalized_name.to_string(),
        icon: "Folder".to_string(),
        category_type: "user".to_string(),
    })
}

pub fn delete_category(conn: &Connection, id: &str) -> Result<(), String> {
    let changed_rows = conn
        .execute(
            "DELETE FROM app_categories WHERE id = ?1 AND type = 'user'",
            params![id],
        )
        .map_err(|error| format!("删除分类失败: {error}"))?;

    if changed_rows == 0 {
        return Err("分类不存在，或系统分类不可删除".to_string());
    }

    Ok(())
}

pub fn update_setting(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        return Err("设置值不能为空".to_string());
    }

    conn.execute(
        "INSERT INTO app_settings (key, value) VALUES (?1, ?2)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
        params![key, value],
    )
    .map_err(|error| format!("更新设置失败: {error}"))?;

    Ok(())
}

fn resolve_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("获取应用数据目录失败: {error}"))?;

    Ok(app_data_dir.join("navidock.sqlite3"))
}

fn init_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
      CREATE TABLE IF NOT EXISTS app_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('system', 'user')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS app_sites (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        icon TEXT,
        dev_url TEXT NOT NULL DEFAULT '',
        prod_url TEXT NOT NULL DEFAULT '',
        category_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'pending')),
        view_type TEXT NOT NULL CHECK (view_type IN ('webview', 'browser')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES app_categories(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS app_site_tags (
        site_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (site_id, tag),
        FOREIGN KEY (site_id) REFERENCES app_sites(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_app_sites_category ON app_sites(category_id);
      CREATE INDEX IF NOT EXISTS idx_app_tags_tag ON app_site_tags(tag);
      "#,
    )
    .map_err(|error| format!("初始化数据库结构失败: {error}"))?;

    Ok(())
}

fn seed_default_data(conn: &Connection) -> Result<(), String> {
    let category_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM app_categories", [], |row| row.get(0))
        .map_err(|error| format!("读取分类数量失败: {error}"))?;

    if category_count == 0 {
        conn.execute_batch(
            r#"
        INSERT INTO app_categories (id, name, icon, type) VALUES
          ('cat-system-dev', 'cat.system_dev', 'Terminal', 'system'),
          ('cat-tools', 'cat.tools', 'Wrench', 'user'),
          ('cat-docs', 'cat.docs', 'Book', 'user');
        "#,
        )
        .map_err(|error| format!("插入默认分类失败: {error}"))?;
    }

    let site_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM app_sites", [], |row| row.get(0))
        .map_err(|error| format!("读取站点数量失败: {error}"))?;

    if site_count == 0 {
        let tx = conn
            .unchecked_transaction()
            .map_err(|error| format!("创建初始化事务失败: {error}"))?;

        for site in default_sites() {
            insert_site(&tx, &site).map_err(|error| format!("插入默认站点失败: {error}"))?;
        }

        tx.commit()
            .map_err(|error| format!("提交默认站点失败: {error}"))?;
    }

    conn.execute(
        "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('theme', 'system')",
        [],
    )
    .map_err(|error| format!("初始化 theme 设置失败: {error}"))?;
    conn.execute(
        "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('language', 'zh')",
        [],
    )
    .map_err(|error| format!("初始化 language 设置失败: {error}"))?;
    conn.execute(
        "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('environment', 'PROD')",
        [],
    )
    .map_err(|error| format!("初始化 environment 设置失败: {error}"))?;
    conn.execute(
        "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('viewMode', 'grid')",
        [],
    )
    .map_err(|error| format!("初始化 viewMode 设置失败: {error}"))?;

    Ok(())
}

fn insert_site(tx: &Transaction<'_>, site: &SiteItem) -> rusqlite::Result<()> {
    tx.execute(
    "INSERT INTO app_sites (id, title, description, icon, dev_url, prod_url, category_id, status, view_type)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
    params![
      site.id,
      site.title,
      site.description,
      site.icon,
      site.env_config.dev_url,
      site.env_config.prod_url,
      site.category_id,
      site.status,
      site.view_type
    ],
  )?;

    for tag in normalize_tags(&site.tags) {
        tx.execute(
            "INSERT INTO app_site_tags (site_id, tag) VALUES (?1, ?2)",
            params![site.id, tag],
        )?;
    }

    Ok(())
}

fn list_categories(conn: &Connection) -> rusqlite::Result<Vec<Category>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, icon, type
     FROM app_categories
     ORDER BY CASE WHEN type = 'system' THEN 0 ELSE 1 END, created_at ASC",
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(Category {
            id: row.get(0)?,
            name: row.get(1)?,
            icon: row.get(2)?,
            category_type: row.get(3)?,
        })
    })?;

    rows.collect()
}

fn list_sites(conn: &Connection) -> rusqlite::Result<Vec<SiteItem>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, description, icon, dev_url, prod_url, category_id, status, view_type
     FROM app_sites
     ORDER BY created_at ASC",
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(SiteItem {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            icon: row.get(3)?,
            env_config: EnvConfig {
                dev_url: row.get(4)?,
                prod_url: row.get(5)?,
            },
            category_id: row.get(6)?,
            tags: vec![],
            status: row.get(7)?,
            view_type: row.get(8)?,
        })
    })?;

    let mut sites: Vec<SiteItem> = Vec::new();
    for row in rows {
        let mut site = row?;
        site.tags = list_site_tags(conn, &site.id)?;
        sites.push(site);
    }

    Ok(sites)
}

fn list_site_tags(conn: &Connection, site_id: &str) -> rusqlite::Result<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT tag
     FROM app_site_tags
     WHERE site_id = ?1
     ORDER BY tag COLLATE NOCASE ASC",
    )?;

    let rows = stmt.query_map(params![site_id], |row| row.get(0))?;
    rows.collect::<rusqlite::Result<Vec<String>>>()
}

fn get_setting(conn: &Connection, key: &str, default_value: &str) -> rusqlite::Result<String> {
    conn.query_row(
        "SELECT value FROM app_settings WHERE key = ?1",
        params![key],
        |row| row.get(0),
    )
    .optional()
    .map(|value| value.unwrap_or_else(|| default_value.to_string()))
}

fn normalize_tags(tags: &[String]) -> Vec<String> {
    let mut visited = HashSet::<String>::new();
    let mut normalized = Vec::<String>::new();

    for tag in tags {
        let clean = tag.trim();
        if clean.is_empty() {
            continue;
        }

        let fingerprint = clean.to_lowercase();
        if visited.insert(fingerprint) {
            normalized.push(clean.to_string());
        }
    }

    normalized
}

fn validate_site(site: &SiteItem) -> Result<(), String> {
    if site.title.trim().is_empty() {
        return Err("站点标题不能为空".to_string());
    }

    if site.category_id.trim().is_empty() {
        return Err("站点必须归属一个分类".to_string());
    }

    if site.status != "online" && site.status != "offline" && site.status != "pending" {
        return Err("站点状态不合法".to_string());
    }

    if site.view_type != "webview" && site.view_type != "browser" {
        return Err("站点视图类型不合法".to_string());
    }

    Ok(())
}

fn default_sites() -> Vec<SiteItem> {
    vec![
        SiteItem {
            id: "1".to_string(),
            title: "Jenkins CI".to_string(),
            description: "Main build pipeline and CI/CD orchestration.".to_string(),
            icon: None,
            env_config: EnvConfig {
                dev_url: "https://dev-jenkins.company.internal".to_string(),
                prod_url: "https://jenkins.company.com".to_string(),
            },
            category_id: "cat-system-dev".to_string(),
            tags: vec!["CI/CD".to_string(), "Java".to_string()],
            status: "online".to_string(),
            view_type: "browser".to_string(),
        },
        SiteItem {
            id: "2".to_string(),
            title: "Grafana Dash".to_string(),
            description: "System metrics, logs and real-time monitoring.".to_string(),
            icon: None,
            env_config: EnvConfig {
                dev_url: "https://dev-grafana.internal".to_string(),
                prod_url: "https://grafana.company.com".to_string(),
            },
            category_id: "cat-system-dev".to_string(),
            tags: vec!["Monitoring".to_string(), "Ops".to_string()],
            status: "online".to_string(),
            view_type: "webview".to_string(),
        },
        SiteItem {
            id: "3".to_string(),
            title: "JSON Formatter".to_string(),
            description: "Online JSON validator and formatter.".to_string(),
            icon: None,
            env_config: EnvConfig {
                dev_url: "".to_string(),
                prod_url: "https://jsonformatter.org".to_string(),
            },
            category_id: "cat-tools".to_string(),
            tags: vec!["Utils".to_string()],
            status: "online".to_string(),
            view_type: "browser".to_string(),
        },
        SiteItem {
            id: "4".to_string(),
            title: "React Docs".to_string(),
            description: "Official React documentation.".to_string(),
            icon: None,
            env_config: EnvConfig {
                dev_url: "".to_string(),
                prod_url: "https://react.dev".to_string(),
            },
            category_id: "cat-docs".to_string(),
            tags: vec!["Frontend".to_string(), "Docs".to_string()],
            status: "online".to_string(),
            view_type: "browser".to_string(),
        },
    ]
}
