/// Suivi d'usage API (requêtes, tokens, coûts estimés)
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

const USAGE_FILENAME: &str = "usage.json";

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct UsageStats {
    pub transcription_requests: u64,
    pub llm_requests: u64,
    #[serde(default)]
    pub tokens_input: u64,
    #[serde(default)]
    pub tokens_output: u64,
}

impl UsageStats {
    pub fn estimated_cost_usd(&self) -> f64 {
        let llm_input = (self.tokens_input as f64 / 1_000_000.0) * 0.15;
        let llm_output = (self.tokens_output as f64 / 1_000_000.0) * 0.60;
        (llm_input + llm_output).max(0.0)
    }
}

fn usage_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| e.to_string())
        .map(|p| p.join(USAGE_FILENAME))
}

fn load_from_file(path: &std::path::Path) -> UsageStats {
    std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_to_file(path: &std::path::Path, stats: &UsageStats) {
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let _ = std::fs::write(
        path,
        serde_json::to_string_pretty(stats).unwrap_or_default(),
    );
}

pub fn increment_transcription(app: &tauri::AppHandle) {
    if let Ok(path) = usage_path(app) {
        let mut stats = load_from_file(&path);
        stats.transcription_requests += 1;
        save_to_file(&path, &stats);
    }
}

pub fn increment_llm(app: &tauri::AppHandle, tokens_input: u64, tokens_output: u64) {
    if let Ok(path) = usage_path(app) {
        let mut stats = load_from_file(&path);
        stats.llm_requests += 1;
        stats.tokens_input += tokens_input;
        stats.tokens_output += tokens_output;
        save_to_file(&path, &stats);
    }
}

pub fn get_usage_stats(app: &tauri::AppHandle) -> UsageStats {
    usage_path(app)
        .map(|p| load_from_file(&p))
        .unwrap_or_default()
}

pub fn reset_usage_stats(app: &tauri::AppHandle) -> UsageStats {
    let path = match usage_path(app) {
        Ok(p) => p,
        Err(_) => return UsageStats::default(),
    };
    let prev = load_from_file(&path);
    save_to_file(&path, &UsageStats::default());
    prev
}
