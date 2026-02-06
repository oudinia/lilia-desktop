use crate::commands::WindowState;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    // Editor settings
    #[serde(default = "default_font_size")]
    pub editor_font_size: u32,
    #[serde(default = "default_font_family")]
    pub editor_font_family: String,
    #[serde(default = "default_tab_size")]
    pub tab_size: u32,
    #[serde(default)]
    pub word_wrap: bool,
    #[serde(default = "default_true")]
    pub line_numbers: bool,
    #[serde(default = "default_true")]
    pub minimap: bool,

    // Theme
    #[serde(default = "default_theme")]
    pub theme: String,

    // Preview settings
    #[serde(default = "default_true")]
    pub live_preview: bool,
    #[serde(default = "default_preview_font_size")]
    pub preview_font_size: u32,

    // Auto-save
    #[serde(default)]
    pub auto_save: bool,
    #[serde(default = "default_auto_save_delay")]
    pub auto_save_delay: u32,

    // Window state
    #[serde(default)]
    pub window_state: Option<WindowState>,

    // Last opened directory
    #[serde(default)]
    pub last_directory: Option<String>,
}

fn default_font_size() -> u32 {
    14
}

fn default_font_family() -> String {
    "JetBrains Mono, Consolas, monospace".to_string()
}

fn default_tab_size() -> u32 {
    2
}

fn default_true() -> bool {
    true
}

fn default_theme() -> String {
    "dark".to_string()
}

fn default_preview_font_size() -> u32 {
    16
}

fn default_auto_save_delay() -> u32 {
    5000
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            editor_font_size: default_font_size(),
            editor_font_family: default_font_family(),
            tab_size: default_tab_size(),
            word_wrap: false,
            line_numbers: true,
            minimap: true,
            theme: default_theme(),
            live_preview: true,
            preview_font_size: default_preview_font_size(),
            auto_save: false,
            auto_save_delay: default_auto_save_delay(),
            window_state: None,
            last_directory: None,
        }
    }
}

pub struct SettingsManager {
    path: PathBuf,
    settings: Settings,
}

impl SettingsManager {
    pub fn new(path: PathBuf) -> Self {
        let settings = Self::load_from_path(&path).unwrap_or_default();
        Self { path, settings }
    }

    fn load_from_path(path: &PathBuf) -> io::Result<Settings> {
        let content = fs::read_to_string(path)?;
        serde_json::from_str(&content).map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))
    }

    pub fn get_settings(&self) -> Settings {
        self.settings.clone()
    }

    pub fn update_settings(&mut self, settings: Settings) {
        self.settings = settings;
    }

    pub fn save(&self) -> io::Result<()> {
        let content = serde_json::to_string_pretty(&self.settings)?;
        fs::write(&self.path, content)
    }
}
