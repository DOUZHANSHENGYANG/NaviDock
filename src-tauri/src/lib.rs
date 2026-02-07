mod db;
mod models;

use db::AppState;
use models::{Category, PersistedAppData, SiteItem};
use tauri::Manager;

#[tauri::command]
fn load_app_data(state: tauri::State<'_, AppState>) -> Result<PersistedAppData, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|error| format!("数据库连接锁定失败: {error}"))?;

    db::load_app_data(&conn).map_err(|error| format!("读取应用数据失败: {error}"))
}

#[tauri::command]
fn create_site(state: tauri::State<'_, AppState>, site: SiteItem) -> Result<SiteItem, String> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|error| format!("数据库连接锁定失败: {error}"))?;

    db::create_site(&mut conn, site)
}

#[tauri::command]
fn update_site(state: tauri::State<'_, AppState>, site: SiteItem) -> Result<SiteItem, String> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|error| format!("数据库连接锁定失败: {error}"))?;

    db::update_site(&mut conn, site)
}

#[tauri::command]
fn delete_site(state: tauri::State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state
        .conn
        .lock()
        .map_err(|error| format!("数据库连接锁定失败: {error}"))?;

    db::delete_site(&conn, &id)
}

#[tauri::command]
fn create_category(state: tauri::State<'_, AppState>, name: String) -> Result<Category, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|error| format!("数据库连接锁定失败: {error}"))?;

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
        .map_err(|error| format!("数据库连接锁定失败: {error}"))?;

    db::update_category(&conn, &id, &name)
}

#[tauri::command]
fn delete_category(state: tauri::State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state
        .conn
        .lock()
        .map_err(|error| format!("数据库连接锁定失败: {error}"))?;

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
        .map_err(|error| format!("数据库连接锁定失败: {error}"))?;

    db::update_setting(&conn, &key, &value)
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
            update_setting
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
