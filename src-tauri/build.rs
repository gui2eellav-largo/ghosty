use std::path::PathBuf;

fn main() {
    // So that generate_context!() and cargo test work without running npm run build first
    let dist: PathBuf = [std::env::var("CARGO_MANIFEST_DIR").unwrap(), "..".into(), "dist".into()]
        .iter()
        .collect();
    if !dist.exists() {
        let _ = std::fs::create_dir_all(&dist);
    }

    // Embed Info.plist into the binary so macOS TCC can read NSMicrophoneUsageDescription
    // even when running as an unbundled debug binary (tauri dev).
    #[cfg(target_os = "macos")]
    {
        let plist_path = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap()).join("Info.plist");
        if plist_path.exists() {
            println!("cargo:rustc-env=MACOSX_DEPLOYMENT_TARGET=10.13");
            // __info_plist section tells macOS to read plist from the binary itself
            println!("cargo:rustc-link-arg=-sectcreate");
            println!("cargo:rustc-link-arg=__TEXT");
            println!("cargo:rustc-link-arg=__info_plist");
            println!("cargo:rustc-link-arg={}", plist_path.display());
        }
    }

    tauri_build::build()
}
