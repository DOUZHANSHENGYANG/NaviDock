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
            import_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
