// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod bibliography;
mod commands;
mod formulas;
mod recent_files;
mod settings;
mod versions;

use bibliography::*;
use commands::*;
use formulas::FormulaManager;
use recent_files::RecentFilesManager;
use settings::SettingsManager;
use versions::*;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct AppState {
    pub recent_files: Mutex<RecentFilesManager>,
    pub settings: Mutex<SettingsManager>,
    pub formulas: Mutex<FormulaManager>,
    pub app_data_dir: Mutex<PathBuf>,
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            use tauri::Manager;

            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");

            // Ensure app directory exists
            std::fs::create_dir_all(&app_dir).ok();

            let recent_files = RecentFilesManager::new(app_dir.join("recent_files.json"));
            let settings = SettingsManager::new(app_dir.join("settings.json"));
            let formulas = FormulaManager::new(app_dir.join("formulas.json"));

            app.manage(AppState {
                recent_files: Mutex::new(recent_files),
                settings: Mutex::new(settings),
                formulas: Mutex::new(formulas),
                app_data_dir: Mutex::new(app_dir.clone()),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // File operations
            read_file,
            write_file,
            file_exists,
            get_file_info,
            // Recent files
            get_recent_files,
            add_recent_file,
            clear_recent_files,
            // Settings
            get_settings,
            update_settings,
            // Export
            export_to_format,
            // Image operations
            save_image,
            save_image_bytes,
            // Window state
            get_window_state,
            save_window_state,
            // Formula library
            get_formulas,
            create_formula,
            update_formula,
            delete_formula,
            toggle_formula_favorite,
            increment_formula_usage,
            // Bibliography
            read_bib_file,
            write_bib_file,
            lookup_doi,
            lookup_isbn,
            // Version history
            create_version,
            list_versions,
            restore_version,
            delete_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
