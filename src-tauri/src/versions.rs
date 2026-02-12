use crate::AppState;
use flate2::read::GzDecoder;
use flate2::write::GzEncoder;
use flate2::Compression;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VersionEntry {
    pub id: String,
    pub document_path: String,
    pub timestamp: String,
    pub comment: Option<String>,
    pub word_count: u32,
    pub file_size_bytes: u64,
    pub content_hash: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct VersionManifest {
    versions: Vec<VersionEntry>,
}

/// Hash a document path to create a stable directory name
fn document_hash(path: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(path.as_bytes());
    let result = hasher.finalize();
    hex::encode(&result[..8])
}

/// Get the versions directory for a document
fn versions_dir(app_data_dir: &PathBuf, document_path: &str) -> PathBuf {
    let hash = document_hash(document_path);
    app_data_dir.join("versions").join(hash)
}

/// Read the manifest file for a document
fn read_manifest(dir: &PathBuf) -> VersionManifest {
    let manifest_path = dir.join("manifest.json");
    if manifest_path.exists() {
        if let Ok(content) = fs::read_to_string(&manifest_path) {
            if let Ok(manifest) = serde_json::from_str(&content) {
                return manifest;
            }
        }
    }
    VersionManifest { versions: vec![] }
}

/// Write the manifest file
fn write_manifest(dir: &PathBuf, manifest: &VersionManifest) -> Result<(), String> {
    let manifest_path = dir.join("manifest.json");
    let content =
        serde_json::to_string_pretty(manifest).map_err(|e| format!("Serialize error: {}", e))?;
    fs::write(&manifest_path, content).map_err(|e| format!("Write manifest error: {}", e))
}

/// Count words in content
fn count_words(content: &str) -> u32 {
    content.split_whitespace().count() as u32
}

/// Hash content for dedup
fn content_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    hex::encode(&hasher.finalize()[..8])
}

#[tauri::command]
pub fn create_version(
    document_path: String,
    content: String,
    comment: Option<String>,
    state: State<AppState>,
) -> Result<VersionEntry, String> {
    let app_data_dir = state
        .app_data_dir
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    let dir = versions_dir(&app_data_dir, &document_path);
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create versions dir: {}", e))?;

    let mut manifest = read_manifest(&dir);

    // Check if content hasn't changed since last version
    let hash = content_hash(&content);
    if let Some(last) = manifest.versions.first() {
        if last.content_hash == hash {
            return Ok(last.clone());
        }
    }

    let id = uuid::Uuid::new_v4().to_string();

    // Compress content with gzip
    let gz_path = dir.join(format!("{}.lml.gz", id));
    let file = fs::File::create(&gz_path).map_err(|e| format!("Create gz file error: {}", e))?;
    let mut encoder = GzEncoder::new(file, Compression::default());
    encoder
        .write_all(content.as_bytes())
        .map_err(|e| format!("Compress error: {}", e))?;
    encoder
        .finish()
        .map_err(|e| format!("Finish compress error: {}", e))?;

    let file_size = fs::metadata(&gz_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let entry = VersionEntry {
        id,
        document_path: document_path.clone(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        comment,
        word_count: count_words(&content),
        file_size_bytes: file_size,
        content_hash: hash,
    };

    // Insert at front (newest first)
    manifest.versions.insert(0, entry.clone());

    // Keep max 100 versions
    if manifest.versions.len() > 100 {
        let removed = manifest.versions.split_off(100);
        for v in removed {
            let path = dir.join(format!("{}.lml.gz", v.id));
            fs::remove_file(&path).ok();
        }
    }

    write_manifest(&dir, &manifest)?;

    Ok(entry)
}

#[tauri::command]
pub fn list_versions(
    document_path: String,
    state: State<AppState>,
) -> Vec<VersionEntry> {
    let app_data_dir = match state.app_data_dir.lock() {
        Ok(dir) => dir,
        Err(_) => return vec![],
    };
    let dir = versions_dir(&app_data_dir, &document_path);
    let manifest = read_manifest(&dir);
    manifest.versions
}

#[tauri::command]
pub fn restore_version(
    version_id: String,
    document_path: String,
    state: State<AppState>,
) -> Result<String, String> {
    let app_data_dir = state
        .app_data_dir
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    let dir = versions_dir(&app_data_dir, &document_path);

    let gz_path = dir.join(format!("{}.lml.gz", version_id));
    if !gz_path.exists() {
        return Err(format!("Version file not found: {}", version_id));
    }

    let file = fs::File::open(&gz_path).map_err(|e| format!("Open gz file error: {}", e))?;
    let mut decoder = GzDecoder::new(file);
    let mut content = String::new();
    decoder
        .read_to_string(&mut content)
        .map_err(|e| format!("Decompress error: {}", e))?;

    Ok(content)
}

#[tauri::command]
pub fn delete_version(
    version_id: String,
    document_path: String,
    state: State<AppState>,
) -> Result<(), String> {
    let app_data_dir = state
        .app_data_dir
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    let dir = versions_dir(&app_data_dir, &document_path);

    // Remove compressed file
    let gz_path = dir.join(format!("{}.lml.gz", version_id));
    if gz_path.exists() {
        fs::remove_file(&gz_path).map_err(|e| format!("Delete file error: {}", e))?;
    }

    // Update manifest
    let mut manifest = read_manifest(&dir);
    manifest.versions.retain(|v| v.id != version_id);
    write_manifest(&dir, &manifest)?;

    Ok(())
}
