use std::path::PathBuf;

fn main() {
    // So that generate_context!() and cargo test work without running npm run build first
    let dist: PathBuf = [std::env::var("CARGO_MANIFEST_DIR").unwrap(), "..".into(), "dist".into()]
        .iter()
        .collect();
    if !dist.exists() {
        let _ = std::fs::create_dir_all(&dist);
    }
    tauri_build::build()
}
