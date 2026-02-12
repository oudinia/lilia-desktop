use crate::AppState;
use crate::formulas::{Formula, FormulaUpdate};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub modified: Option<String>,
    pub created: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowState {
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
    pub maximized: bool,
}

// ============================================================================
// File Operations
// ============================================================================

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
pub fn file_exists(path: String) -> bool {
    PathBuf::from(&path).exists()
}

#[tauri::command]
pub fn get_file_info(path: String) -> Result<FileInfo, String> {
    let path_buf = PathBuf::from(&path);
    let metadata = fs::metadata(&path_buf).map_err(|e| format!("Failed to get metadata: {}", e))?;

    let name = path_buf
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let modified = metadata
        .modified()
        .ok()
        .and_then(|t| {
            chrono::DateTime::<chrono::Utc>::from(t)
                .format("%Y-%m-%d %H:%M:%S")
                .to_string()
                .into()
        });

    let created = metadata
        .created()
        .ok()
        .and_then(|t| {
            chrono::DateTime::<chrono::Utc>::from(t)
                .format("%Y-%m-%d %H:%M:%S")
                .to_string()
                .into()
        });

    Ok(FileInfo {
        path,
        name,
        size: metadata.len(),
        modified,
        created,
    })
}

// ============================================================================
// Recent Files
// ============================================================================

#[tauri::command]
pub fn get_recent_files(state: State<AppState>) -> Vec<String> {
    let manager = state.recent_files.lock().unwrap();
    manager.get_files()
}

#[tauri::command]
pub fn add_recent_file(path: String, state: State<AppState>) -> Result<(), String> {
    let mut manager = state.recent_files.lock().unwrap();
    manager.add_file(&path);
    manager.save().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_recent_files(state: State<AppState>) -> Result<(), String> {
    let mut manager = state.recent_files.lock().unwrap();
    manager.clear();
    manager.save().map_err(|e| e.to_string())
}

// ============================================================================
// Settings
// ============================================================================

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> crate::settings::Settings {
    let manager = state.settings.lock().unwrap();
    manager.get_settings()
}

#[tauri::command]
pub fn update_settings(
    settings: crate::settings::Settings,
    state: State<AppState>,
) -> Result<(), String> {
    let mut manager = state.settings.lock().unwrap();
    manager.update_settings(settings);
    manager.save().map_err(|e| e.to_string())
}

// ============================================================================
// Export
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportOptions {
    pub format: String,
    pub content: String,
    pub output_path: String,
}

#[tauri::command]
pub fn export_to_format(options: ExportOptions) -> Result<String, String> {
    // For now, we just write the content directly
    // The actual format conversion happens in the frontend
    write_file(options.output_path.clone(), options.content)?;
    Ok(options.output_path)
}

// ============================================================================
// Image Operations
// ============================================================================

#[tauri::command]
pub fn save_image(source: String, destination: String) -> Result<String, String> {
    let dest_path = PathBuf::from(&destination);

    // Ensure parent directory exists
    if let Some(parent) = dest_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create assets directory: {}", e))?;
    }

    fs::copy(&source, &destination)
        .map_err(|e| format!("Failed to copy image: {}", e))?;

    Ok(destination)
}

#[tauri::command]
pub fn save_image_bytes(bytes: Vec<u8>, destination: String) -> Result<String, String> {
    let dest_path = PathBuf::from(&destination);

    // Ensure parent directory exists
    if let Some(parent) = dest_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create assets directory: {}", e))?;
    }

    fs::write(&destination, bytes)
        .map_err(|e| format!("Failed to save image: {}", e))?;

    Ok(destination)
}

// ============================================================================
// Window State
// ============================================================================

#[tauri::command]
pub fn get_window_state(state: State<AppState>) -> Option<WindowState> {
    let settings = state.settings.lock().unwrap();
    settings.get_settings().window_state
}

#[tauri::command]
pub fn save_window_state(window_state: WindowState, state: State<AppState>) -> Result<(), String> {
    let mut manager = state.settings.lock().unwrap();
    let mut settings = manager.get_settings();
    settings.window_state = Some(window_state);
    manager.update_settings(settings);
    manager.save().map_err(|e| e.to_string())
}

// ============================================================================
// Formula Library
// ============================================================================

#[tauri::command]
pub fn get_formulas(state: State<AppState>) -> Vec<Formula> {
    let manager = state.formulas.lock().unwrap();
    manager.get_all()
}

#[tauri::command]
pub fn create_formula(formula: Formula, state: State<AppState>) -> Result<Formula, String> {
    let mut manager = state.formulas.lock().unwrap();
    let result = manager.add(formula);
    manager.save().map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
pub fn update_formula(
    id: String,
    updates: FormulaUpdate,
    state: State<AppState>,
) -> Result<Option<Formula>, String> {
    let mut manager = state.formulas.lock().unwrap();
    let result = manager.update(&id, updates);
    manager.save().map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
pub fn delete_formula(id: String, state: State<AppState>) -> Result<bool, String> {
    let mut manager = state.formulas.lock().unwrap();
    let result = manager.remove(&id);
    manager.save().map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
pub fn toggle_formula_favorite(id: String, state: State<AppState>) -> Result<Option<Formula>, String> {
    let mut manager = state.formulas.lock().unwrap();
    let result = manager.toggle_favorite(&id);
    manager.save().map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
pub fn increment_formula_usage(id: String, state: State<AppState>) -> Result<Option<Formula>, String> {
    let mut manager = state.formulas.lock().unwrap();
    let result = manager.increment_usage(&id);
    manager.save().map_err(|e| e.to_string())?;
    Ok(result)
}
