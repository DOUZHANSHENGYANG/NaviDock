mod db;
mod models;

use db::AppState;
use models::{Category, PersistedAppData, SiteItem};
use scraper::{Html, Selector};
use serde::Serialize;
use std::time::Duration;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct UrlMetadata {
    title: Option<String>,
    description: Option<String>,
}

#[tauri::command]
fn load_app_data(state: tauri::State<'_, AppState>) -> Result<PersistedAppData, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|error| format!("Database lock failed: {error}"))?;

    db::load_app_data(&conn).map_err(|error| format!("Failed to load app data: {error}"))
}

#[tauri::command]
fn create_site(state: tauri::State<'_, AppState>, site: SiteItem) -> Result<SiteItem, String> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|error| format!("Database lock failed: {error}"))?;

    db::create_site(&mut conn, site)
}

#[tauri::command]
fn update_site(state: tauri::State<'_, AppState>, site: SiteItem) -> Result<SiteItem, String> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|error| format!("Database lock failed: {error}"))?;

    db::update_site(&mut conn, site)
}

#[tauri::command]
fn delete_site(state: tauri::State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state
        .conn
        .lock()
        .map_err(|error| format!("Database lock failed: {error}"))?;

    db::delete_site(&conn, &id)
}

#[tauri::command]
fn create_category(state: tauri::State<'_, AppState>, name: String) -> Result<Category, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|error| format!("Database lock failed: {error}"))?;

    db::create_category(&conn, &name)
}

#[tauri::command]
fn update_category(
    state: tauri::State<'_, AppState>,
    id: String,
    name: String,
) -> Result<Category, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|error| format!("Database lock failed: {error}"))?;

    db::update_category(&conn, &id, &name)
}

#[tauri::command]
fn delete_category(state: tauri::State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state
        .conn
        .lock()
        .map_err(|error| format!("Database lock failed: {error}"))?;

    db::delete_category(&conn, &id)
}

#[tauri::command]
fn update_setting(
    state: tauri::State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), String> {
    let conn = state
        .conn
        .lock()
        .map_err(|error| format!("Database lock failed: {error}"))?;

    db::update_setting(&conn, &key, &value)
}

#[tauri::command]
fn export_config(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|error| format!("Database lock failed: {error}"))?;

    db::export_config(&conn)
}

#[tauri::command]
fn export_config_to_file(
    state: tauri::State<'_, AppState>,
    suggested_filename: Option<String>,
) -> Result<Option<String>, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|error| format!("Database lock failed: {error}"))?;

    let config_json = db::export_config(&conn)?;
    drop(conn);

    let default_filename = suggested_filename
        .as_deref()
        .filter(|name| !name.trim().is_empty())
        .unwrap_or("navidock-config.json");

    let save_path = rfd::FileDialog::new()
        .set_file_name(default_filename)
        .add_filter("JSON", &["json"])
        .save_file();

    let Some(path) = save_path else {
        return Ok(None);
    };

    std::fs::write(&path, config_json)
        .map_err(|error| format!("Failed to write exported config: {error}"))?;

    Ok(Some(path.to_string_lossy().to_string()))
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err("URL cannot be empty.".to_string());
    }

    if !trimmed.starts_with("http://") && !trimmed.starts_with("https://") {
        return Err("Only http/https URLs are allowed.".to_string());
    }

    open::that_detached(trimmed).map_err(|error| format!("Failed to open URL: {error}"))?;
    Ok(())
}

#[tauri::command]
fn open_site_window(
    app: tauri::AppHandle,
    url: String,
    title: Option<String>,
) -> Result<(), String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err("URL cannot be empty.".to_string());
    }

    let parsed = tauri::Url::parse(trimmed).map_err(|error| format!("Invalid URL: {error}"))?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return Err("Only http/https URLs are allowed.".to_string());
    }

    let host_title = parsed.host_str().unwrap_or("NaviDock").to_string();
    let window_title = title
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(host_title.as_str());

    let label = format!("site-{}", uuid::Uuid::new_v4().simple());

    WebviewWindowBuilder::new(&app, label, WebviewUrl::External(parsed))
        .title(window_title)
        .inner_size(1320.0, 900.0)
        .min_inner_size(960.0, 640.0)
        .build()
        .map_err(|error| format!("Failed to create internal window: {error}"))?;

    Ok(())
}

#[tauri::command]
fn fetch_url_metadata(url: String) -> Result<UrlMetadata, String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err("URL cannot be empty.".to_string());
    }

    let parsed = tauri::Url::parse(trimmed).map_err(|error| format!("Invalid URL: {error}"))?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return Err("Only http/https URLs are allowed.".to_string());
    }

    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(12))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) NaviDock/0.1")
        .build()
        .map_err(|error| format!("Failed to create metadata client: {error}"))?;

    let fetch_html = |target: tauri::Url| -> Result<String, String> {
        let response = client
            .get(target)
            .send()
            .map_err(|error| format!("Failed to fetch page: {error}"))?;

        if !response.status().is_success() {
            return Err(format!("Failed to fetch page, status: {}", response.status()));
        }

        response
            .text()
            .map_err(|error| format!("Failed to read page content: {error}"))
    };

    let mut body = fetch_html(parsed.clone())?;
    let lowered_body = body.to_ascii_lowercase();
    let should_retry_http = parsed.scheme() == "https"
        && ((body.contains("location.replace")
            && body.contains("https://")
            && body.contains("http://"))
            || (lowered_body.contains("http-equiv=\"refresh\"")
                && lowered_body.contains("url=http://")));

    if should_retry_http {
        let mut retry_url = parsed.clone();
        let _ = retry_url.set_scheme("http");
        body = fetch_html(retry_url)?;
    }

    let document = Html::parse_document(&body);
    let title_selector = Selector::parse("title").map_err(|error| format!("{error}"))?;
    let meta_selector = Selector::parse("meta").map_err(|error| format!("{error}"))?;

    let mut title = document
        .select(&title_selector)
        .next()
        .map(|node| node.text().collect::<String>().trim().to_string())
        .filter(|value| !value.is_empty());

    let mut description: Option<String> = None;

    for meta in document.select(&meta_selector) {
        let name = meta
            .value()
            .attr("name")
            .map(|value| value.to_ascii_lowercase())
            .unwrap_or_default();
        let property = meta
            .value()
            .attr("property")
            .map(|value| value.to_ascii_lowercase())
            .unwrap_or_default();
        let content = meta
            .value()
            .attr("content")
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToOwned::to_owned);

        if title.is_none() && (property == "og:title" || name == "twitter:title") {
            title = content.clone();
        }

        if description.is_none()
            && (name == "description"
                || property == "og:description"
                || name == "twitter:description"
                || name == "keywords")
        {
            description = content;
        }

        if title.is_some() && description.is_some() {
            break;
        }
    }

    if title.is_none() {
        title = parsed.host_str().map(ToOwned::to_owned);
    }

    if description.is_none() {
        let body_selector = Selector::parse("body").map_err(|error| format!("{error}"))?;
        description = document
            .select(&body_selector)
            .next()
            .map(|node| node.text().collect::<String>())
            .map(|text| text.split_whitespace().collect::<Vec<_>>().join(" "))
            .map(|text| text.trim().to_string())
            .filter(|value| !value.is_empty())
            .map(|value| {
                let mut chars = value.chars();
                let summary: String = chars.by_ref().take(180).collect();
                if chars.next().is_some() {
                    format!("{summary}...")
                } else {
                    summary
                }
            });
    }

    Ok(UrlMetadata { title, description })
}

#[tauri::command]
fn import_config(
    state: tauri::State<'_, AppState>,
    config_json: String,
) -> Result<PersistedAppData, String> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|error| format!("Database lock failed: {error}"))?;

    db::import_config(&mut conn, &config_json)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let state = db::init_state(app.handle()).map_err(std::io::Error::other)?;
            app.manage(state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_app_data,
            create_site,
            update_site,
            delete_site,
            create_category,
            update_category,
            delete_category,
            update_setting,
            export_config,
            export_config_to_file,
            open_url,
            open_site_window,
            fetch_url_metadata,
            import_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
