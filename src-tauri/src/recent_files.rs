use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::PathBuf;

const MAX_RECENT_FILES: usize = 10;

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct RecentFilesData {
    pub files: Vec<String>,
}

pub struct RecentFilesManager {
    path: PathBuf,
    data: RecentFilesData,
}

impl RecentFilesManager {
    pub fn new(path: PathBuf) -> Self {
        let data = Self::load_from_path(&path).unwrap_or_default();
        Self { path, data }
    }

    fn load_from_path(path: &PathBuf) -> io::Result<RecentFilesData> {
        let content = fs::read_to_string(path)?;
        serde_json::from_str(&content).map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))
    }

    pub fn get_files(&self) -> Vec<String> {
        // Filter out files that no longer exist
        self.data
            .files
            .iter()
            .filter(|f| PathBuf::from(f).exists())
            .cloned()
            .collect()
    }

    pub fn add_file(&mut self, path: &str) {
        // Remove if already exists (to move to top)
        self.data.files.retain(|f| f != path);

        // Add to front
        self.data.files.insert(0, path.to_string());

        // Trim to max size
        if self.data.files.len() > MAX_RECENT_FILES {
            self.data.files.truncate(MAX_RECENT_FILES);
        }
    }

    pub fn clear(&mut self) {
        self.data.files.clear();
    }

    pub fn save(&self) -> io::Result<()> {
        let content = serde_json::to_string_pretty(&self.data)?;
        fs::write(&self.path, content)
    }
}
