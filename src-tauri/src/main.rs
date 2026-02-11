// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod formulas;
mod recent_files;
mod settings;

use commands::*;
use formulas::FormulaManager;
use recent_files::RecentFilesManager;
use settings::SettingsManager;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub recent_files: Mutex<RecentFilesManager>,
    pub settings: Mutex<SettingsManager>,
    pub formulas: Mutex<FormulaManager>,
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_dir = app
                .path_resolver()
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
