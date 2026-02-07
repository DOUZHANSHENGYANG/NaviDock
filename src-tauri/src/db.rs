use std::{
    collections::HashSet,
    fs,
    path::PathBuf,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};
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

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportPackage {
    format_version: String,
    exported_at: String,
    data: PersistedAppData,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum ImportPayload {
    Wrapped(ExportPackage),
    Bare(PersistedAppData),
}

pub fn init_state(app: &AppHandle) -> Result<AppState, String> {
    let db_path = resolve_db_path(app)?;

    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create data directory: {error}"))?;
    }

    let conn = Connection::open(&db_path).map_err(|error| {
        format!(
            "Failed to open SQLite database ({}): {error}",
            db_path.display()
        )
    })?;

    conn.pragma_update(None, "foreign_keys", "ON")
        .map_err(|error| format!("Failed to enable foreign_keys: {error}"))?;
    conn.pragma_update(None, "journal_mode", "WAL")
        .map_err(|error| format!("Failed to enable WAL mode: {error}"))?;

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
        import_category_id: get_setting(conn, "importCategoryId", "cat-imported")?,
    })
}

pub fn export_config(conn: &Connection) -> Result<String, String> {
    let data = load_app_data(conn)
        .map_err(|error| format!("Failed to collect data for export: {error}"))?;

    let exported_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("Failed to generate export timestamp: {error}"))?
        .as_secs()
        .to_string();

    let package = ExportPackage {
        format_version: "1.0.0".to_string(),
        exported_at,
        data,
    };

    serde_json::to_string_pretty(&package)
        .map_err(|error| format!("Failed to serialize export payload: {error}"))
}

pub fn import_config(conn: &mut Connection, config_json: &str) -> Result<PersistedAppData, String> {
    let payload: ImportPayload = serde_json::from_str(config_json)
        .map_err(|error| format!("Invalid import JSON payload: {error}"))?;

    let data = match payload {
        ImportPayload::Wrapped(wrapper) => wrapper.data,
        ImportPayload::Bare(bare) => bare,
    };

    validate_import_payload(&data)?;
    replace_all_data(conn, &data)?;

    load_app_data(conn).map_err(|error| format!("Failed to reload data after import: {error}"))
}

pub fn create_site(conn: &mut Connection, mut site: SiteItem) -> Result<SiteItem, String> {
    validate_site(&site)?;

    if site.id.trim().is_empty() {
        site.id = format!("site-{}", Uuid::new_v4().simple());
    }

    site.tags = normalize_tags(&site.tags);

    let tx = conn
        .transaction()
        .map_err(|error| format!("Failed to create transaction: {error}"))?;

    insert_site(&tx, &site).map_err(|error| format!("Failed to insert site: {error}"))?;

    tx.commit()
        .map_err(|error| format!("Failed to commit site transaction: {error}"))?;

    Ok(site)
}

pub fn update_site(conn: &mut Connection, site: SiteItem) -> Result<SiteItem, String> {
    validate_site(&site)?;

    let mut normalized = site.clone();
    normalized.tags = normalize_tags(&site.tags);

    let tx = conn
        .transaction()
        .map_err(|error| format!("Failed to create transaction: {error}"))?;

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
        .map_err(|error| format!("Failed to update site: {error}"))?;

    if changed_rows == 0 {
        return Err("Site not found.".to_string());
    }

    tx.execute(
        "DELETE FROM app_site_tags WHERE site_id = ?1",
        params![normalized.id],
    )
    .map_err(|error| format!("Failed to clean previous tags: {error}"))?;

    for tag in &normalized.tags {
        tx.execute(
            "INSERT INTO app_site_tags (site_id, tag) VALUES (?1, ?2)",
            params![normalized.id, tag],
        )
        .map_err(|error| format!("Failed to insert updated tags: {error}"))?;
    }

    tx.commit()
        .map_err(|error| format!("Failed to commit site update: {error}"))?;

    Ok(normalized)
}

pub fn delete_site(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM app_sites WHERE id = ?1", params![id])
        .map_err(|error| format!("Failed to delete site: {error}"))?;
    Ok(())
}

pub fn create_category(conn: &Connection, name: &str) -> Result<Category, String> {
    let normalized_name = name.trim();
    if normalized_name.is_empty() {
        return Err("Category name cannot be empty.".to_string());
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
    .map_err(|error| format!("Failed to create category: {error}"))?;

    Ok(category)
}

pub fn update_category(conn: &Connection, id: &str, name: &str) -> Result<Category, String> {
    let normalized_name = name.trim();
    if normalized_name.is_empty() {
        return Err("Category name cannot be empty.".to_string());
    }

    let changed_rows = conn
        .execute(
            "UPDATE app_categories
             SET name = ?2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?1 AND type = 'user'",
            params![id, normalized_name],
        )
        .map_err(|error| format!("Failed to update category: {error}"))?;

    if changed_rows == 0 {
        return Err("Category not found or not editable.".to_string());
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
        .map_err(|error| format!("Failed to delete category: {error}"))?;

    if changed_rows == 0 {
        return Err("Category not found or protected.".to_string());
    }

    Ok(())
}

pub fn update_setting(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        return Err("Setting value cannot be empty.".to_string());
    }

    conn.execute(
        "INSERT INTO app_settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
        params![key, value],
    )
    .map_err(|error| format!("Failed to update setting: {error}"))?;

    Ok(())
}

fn resolve_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Failed to resolve app data directory: {error}"))?;

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
    .map_err(|error| format!("Failed to initialize database schema: {error}"))?;

    Ok(())
}

fn seed_default_data(conn: &Connection) -> Result<(), String> {
    let category_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM app_categories", [], |row| row.get(0))
        .map_err(|error| format!("Failed to read category count: {error}"))?;

    if category_count == 0 {
        conn.execute_batch(
            r#"
            INSERT INTO app_categories (id, name, icon, type) VALUES
              ('cat-system-dev', 'cat.system_dev', 'Terminal', 'system'),
              ('cat-tools', 'cat.tools', 'Wrench', 'user'),
              ('cat-docs', 'cat.docs', 'Book', 'user'),
              ('cat-imported', 'cat.imported', 'Folder', 'user');
            "#,
        )
        .map_err(|error| format!("Failed to seed default categories: {error}"))?;
    }

    conn.execute(
        "INSERT OR IGNORE INTO app_categories (id, name, icon, type) VALUES ('cat-imported', 'cat.imported', 'Folder', 'user')",
        [],
    )
    .map_err(|error| format!("Failed to ensure imported category exists: {error}"))?;

    let site_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM app_sites", [], |row| row.get(0))
        .map_err(|error| format!("Failed to read site count: {error}"))?;

    if site_count == 0 {
        let tx = conn
            .unchecked_transaction()
            .map_err(|error| format!("Failed to create seed transaction: {error}"))?;

        for site in default_sites() {
            insert_site(&tx, &site).map_err(|error| format!("Failed to seed site: {error}"))?;
        }

        tx.commit()
            .map_err(|error| format!("Failed to commit seed transaction: {error}"))?;
    }

    conn.execute(
        "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('theme', 'system')",
        [],
    )
    .map_err(|error| format!("Failed to seed theme setting: {error}"))?;
    conn.execute(
        "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('language', 'zh')",
        [],
    )
    .map_err(|error| format!("Failed to seed language setting: {error}"))?;
    conn.execute(
        "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('environment', 'PROD')",
        [],
    )
    .map_err(|error| format!("Failed to seed environment setting: {error}"))?;
    conn.execute(
        "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('viewMode', 'grid')",
        [],
    )
    .map_err(|error| format!("Failed to seed view mode setting: {error}"))?;
    conn.execute(
        "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('importCategoryId', 'cat-imported')",
        [],
    )
    .map_err(|error| format!("Failed to seed import category setting: {error}"))?;

    Ok(())
}

fn replace_all_data(conn: &mut Connection, data: &PersistedAppData) -> Result<(), String> {
    let tx = conn
        .transaction()
        .map_err(|error| format!("Failed to create import transaction: {error}"))?;

    tx.execute_batch(
        r#"
        DELETE FROM app_site_tags;
        DELETE FROM app_sites;
        DELETE FROM app_categories;
        "#,
    )
    .map_err(|error| format!("Failed to clear existing data: {error}"))?;

    for category in &data.categories {
        tx.execute(
            "INSERT INTO app_categories (id, name, icon, type) VALUES (?1, ?2, ?3, ?4)",
            params![
                category.id,
                category.name,
                category.icon,
                category.category_type
            ],
        )
        .map_err(|error| {
            format!(
                "Failed to insert imported category '{}': {error}",
                category.id
            )
        })?;
    }

    for site in &data.sites {
        insert_site(&tx, site)
            .map_err(|error| format!("Failed to insert imported site '{}': {error}", site.id))?;
    }

    let resolved_import_category_id = if data
        .categories
        .iter()
        .any(|category| category.id == data.import_category_id)
    {
        data.import_category_id.clone()
    } else {
        data.categories
            .iter()
            .find(|category| category.category_type == "user")
            .map(|category| category.id.clone())
            .unwrap_or_else(|| data.categories[0].id.clone())
    };

    upsert_setting_tx(&tx, "environment", &data.environment)?;
    upsert_setting_tx(&tx, "viewMode", &data.view_mode)?;
    upsert_setting_tx(&tx, "theme", &data.theme)?;
    upsert_setting_tx(&tx, "language", &data.language)?;
    upsert_setting_tx(&tx, "importCategoryId", &resolved_import_category_id)?;

    tx.commit()
        .map_err(|error| format!("Failed to commit import transaction: {error}"))?;

    Ok(())
}

fn upsert_setting_tx(tx: &Transaction<'_>, key: &str, value: &str) -> Result<(), String> {
    tx.execute(
        "INSERT INTO app_settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
        params![key, value],
    )
    .map_err(|error| format!("Failed to upsert setting '{key}': {error}"))?;

    Ok(())
}

fn validate_import_payload(data: &PersistedAppData) -> Result<(), String> {
    if data.categories.is_empty() {
        return Err("Import payload must include at least one category.".to_string());
    }

    let mut category_ids = HashSet::new();
    for category in &data.categories {
        if category.id.trim().is_empty() {
            return Err("Category id cannot be empty.".to_string());
        }
        if !category_ids.insert(category.id.clone()) {
            return Err(format!("Duplicate category id: {}", category.id));
        }
        if category.category_type != "system" && category.category_type != "user" {
            return Err(format!(
                "Invalid category type for '{}': {}",
                category.id, category.category_type
            ));
        }
    }

    let mut site_ids = HashSet::new();
    for site in &data.sites {
        if !site_ids.insert(site.id.clone()) {
            return Err(format!("Duplicate site id: {}", site.id));
        }
        if !category_ids.contains(&site.category_id) {
            return Err(format!(
                "Site '{}' references non-existing category '{}'.",
                site.id, site.category_id
            ));
        }
        validate_site(site)?;
    }

    if data.environment != "DEV" && data.environment != "PROD" {
        return Err("Invalid environment value. Expected DEV or PROD.".to_string());
    }

    if data.view_mode != "grid" && data.view_mode != "list" {
        return Err("Invalid viewMode value. Expected grid or list.".to_string());
    }

    if data.theme != "light" && data.theme != "dark" && data.theme != "system" {
        return Err("Invalid theme value. Expected light/dark/system.".to_string());
    }

    if data.language != "zh" && data.language != "en" {
        return Err("Invalid language value. Expected zh or en.".to_string());
    }

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
        return Err("Site title cannot be empty.".to_string());
    }

    if site.category_id.trim().is_empty() {
        return Err("Site categoryId cannot be empty.".to_string());
    }

    if site.status != "online" && site.status != "offline" && site.status != "pending" {
        return Err("Site status is invalid.".to_string());
    }

    if site.view_type != "webview" && site.view_type != "browser" {
        return Err("Site viewType is invalid.".to_string());
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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn setup_test_connection() -> Connection {
        let conn = Connection::open_in_memory().expect("in-memory sqlite should be created");
        conn.pragma_update(None, "foreign_keys", "ON")
            .expect("foreign keys should be enabled");
        init_schema(&conn).expect("schema should be initialized");
        seed_default_data(&conn).expect("seed data should be inserted");
        conn
    }

    #[test]
    fn export_config_should_contain_wrapper_format() {
        let conn = setup_test_connection();
        let exported = export_config(&conn).expect("export should succeed");
        assert!(exported.contains("\"formatVersion\""));
        assert!(exported.contains("\"data\""));
    }

    #[test]
    fn import_config_should_replace_existing_data() {
        let mut conn = setup_test_connection();

        let payload = json!({
          "formatVersion": "1.0.0",
          "exportedAt": "2026-02-07T16:30:00.000Z",
          "data": {
            "categories": [
              { "id": "cat-system-dev", "name": "cat.system_dev", "icon": "Terminal", "type": "system" },
              { "id": "cat-import", "name": "Imported", "icon": "Folder", "type": "user" }
            ],
            "sites": [
              {
                "id": "imported-1",
                "title": "Imported Site",
                "description": "Imported by test",
                "icon": null,
                "envConfig": { "devUrl": "https://dev.imported.local", "prodUrl": "https://imported.local" },
                "categoryId": "cat-import",
                "tags": ["Imported"],
                "status": "online",
                "viewType": "browser"
              }
            ],
            "environment": "DEV",
            "viewMode": "list",
            "theme": "dark",
            "language": "en",
            "importCategoryId": "cat-import"
          }
        })
        .to_string();

        let imported = import_config(&mut conn, &payload).expect("import should succeed");
        assert_eq!(imported.categories.len(), 2);
        assert_eq!(imported.sites.len(), 1);
        assert_eq!(imported.sites[0].title, "Imported Site");
        assert_eq!(imported.environment, "DEV");
        assert_eq!(imported.view_mode, "list");
        assert_eq!(imported.theme, "dark");
        assert_eq!(imported.language, "en");
        assert_eq!(imported.import_category_id, "cat-import");
    }
}
