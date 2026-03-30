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
    #[serde(default)]
    pub words_generated: u64,
}

impl UsageStats {
    #[allow(dead_code)]
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

pub fn increment_words(app: &tauri::AppHandle, words: u64) {
    if let Ok(path) = usage_path(app) {
        let mut stats = load_from_file(&path);
        stats.words_generated += words;
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

#[cfg(test)]
mod tests {
    use super::*;

    // ── UsageStats defaults ─────────────────────────────────────────

    #[test]
    fn test_usage_stats_default() {
        let stats = UsageStats::default();
        assert_eq!(stats.transcription_requests, 0);
        assert_eq!(stats.llm_requests, 0);
        assert_eq!(stats.tokens_input, 0);
        assert_eq!(stats.tokens_output, 0);
    }

    // ── estimated_cost_usd ──────────────────────────────────────────

    #[test]
    fn test_estimated_cost_zero_for_defaults() {
        let stats = UsageStats::default();
        assert!((stats.estimated_cost_usd() - 0.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_estimated_cost_with_tokens() {
        let stats = UsageStats {
            transcription_requests: 10,
            llm_requests: 5,
            tokens_input: 1_000_000,
            tokens_output: 1_000_000,
            ..Default::default()
        };
        let cost = stats.estimated_cost_usd();
        // Input: 1M * 0.15 / 1M = 0.15
        // Output: 1M * 0.60 / 1M = 0.60
        // Total: 0.75
        assert!((cost - 0.75).abs() < 0.001);
    }

    #[test]
    fn test_estimated_cost_never_negative() {
        let stats = UsageStats {
            transcription_requests: 0,
            llm_requests: 0,
            tokens_input: 0,
            tokens_output: 0,
            ..Default::default()
        };
        assert!(stats.estimated_cost_usd() >= 0.0);
    }

    // ── Serialization roundtrip ─────────────────────────────────────

    #[test]
    fn test_usage_stats_serialization_roundtrip() {
        let stats = UsageStats {
            transcription_requests: 42,
            llm_requests: 17,
            tokens_input: 50000,
            tokens_output: 30000,
            ..Default::default()
        };
        let json = serde_json::to_string(&stats).unwrap();
        let loaded: UsageStats = serde_json::from_str(&json).unwrap();
        assert_eq!(loaded.transcription_requests, 42);
        assert_eq!(loaded.llm_requests, 17);
        assert_eq!(loaded.tokens_input, 50000);
        assert_eq!(loaded.tokens_output, 30000);
    }

    #[test]
    fn test_usage_stats_deserialize_missing_token_fields() {
        // Older format might not have tokens_input / tokens_output
        let json = r#"{"transcription_requests": 5, "llm_requests": 3}"#;
        let stats: UsageStats = serde_json::from_str(json).unwrap();
        assert_eq!(stats.transcription_requests, 5);
        assert_eq!(stats.llm_requests, 3);
        assert_eq!(stats.tokens_input, 0);
        assert_eq!(stats.tokens_output, 0);
    }

    // ── File-based load/save ────────────────────────────────────────

    #[test]
    fn test_load_from_file_missing_returns_defaults() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("nonexistent.json");
        let stats = load_from_file(&path);
        assert_eq!(stats.transcription_requests, 0);
    }

    #[test]
    fn test_save_and_load_roundtrip() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("usage.json");
        let stats = UsageStats {
            transcription_requests: 100,
            llm_requests: 50,
            tokens_input: 1000,
            tokens_output: 2000,
            ..Default::default()
        };
        save_to_file(&path, &stats);
        let loaded = load_from_file(&path);
        assert_eq!(loaded.transcription_requests, 100);
        assert_eq!(loaded.llm_requests, 50);
        assert_eq!(loaded.tokens_input, 1000);
        assert_eq!(loaded.tokens_output, 2000);
    }

    #[test]
    fn test_save_creates_parent_dirs() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("deep").join("usage.json");
        save_to_file(&path, &UsageStats::default());
        assert!(path.exists());
    }

    #[test]
    fn test_load_corrupted_file_returns_defaults() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("bad.json");
        std::fs::write(&path, "not json!").unwrap();
        let stats = load_from_file(&path);
        assert_eq!(stats.transcription_requests, 0);
    }

    #[test]
    fn test_save_and_increment_pattern() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("usage.json");

        // Simulate incrementing transcription
        let mut stats = load_from_file(&path);
        stats.transcription_requests += 1;
        save_to_file(&path, &stats);

        stats = load_from_file(&path);
        stats.transcription_requests += 1;
        save_to_file(&path, &stats);

        let final_stats = load_from_file(&path);
        assert_eq!(final_stats.transcription_requests, 2);
    }

    #[test]
    fn test_save_and_reset_pattern() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("usage.json");

        let stats = UsageStats {
            transcription_requests: 50,
            llm_requests: 25,
            tokens_input: 10000,
            tokens_output: 5000,
            ..Default::default()
        };
        save_to_file(&path, &stats);

        // Reset
        save_to_file(&path, &UsageStats::default());
        let loaded = load_from_file(&path);
        assert_eq!(loaded.transcription_requests, 0);
        assert_eq!(loaded.llm_requests, 0);
    }
}
