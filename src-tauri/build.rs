use std::collections::HashMap;
use std::fs;

fn main() {
    println!("cargo::rustc-check-cfg=cfg(build_mode_commercial)");
    println!("cargo::rustc-check-cfg=cfg(build_mode_oss)");

    let env = read_dotenv();

    let mode = env
        .get("VITE_BUILD_MODE")
        .map(|v| v.as_str())
        .unwrap_or("oss");
    println!("cargo:rustc-cfg=build_mode_{}", mode);
    println!("cargo:warning=[cadence] Build mode: {}", mode);

    if mode == "commercial" {
        if let Some(secret) = env.get("CADENCE_ACTIVATION_SECRET") {
            println!("cargo:rustc-env=CADENCE_ACTIVATION_SECRET={}", secret);
        }
        if let Some(max_codes) = env.get("CADENCE_MAX_CODES") {
            println!("cargo:rustc-env=CADENCE_MAX_CODES={}", max_codes);
        }
    }

    // Pass VITE_EXPIRE_MODE for dev/QA activation status override
    if let Some(expire_mode) = env.get("VITE_EXPIRE_MODE") {
        println!("cargo:rustc-env=VITE_EXPIRE_MODE={}", expire_mode);
    }

    println!("cargo:rerun-if-changed=../.env");

    tauri_build::build()
}

fn read_dotenv() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let content = match fs::read_to_string("../.env") {
        Ok(c) => c,
        Err(_) => return map,
    };
    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        if let Some((key, val)) = line.split_once('=') {
            map.insert(key.trim().to_string(), strip_quotes(val.trim()));
        }
    }
    map
}

fn strip_quotes(s: &str) -> String {
    let s = s.trim();
    if s.len() >= 2
        && (s.starts_with('"') && s.ends_with('"') || s.starts_with('\'') && s.ends_with('\''))
    {
        s[1..s.len() - 1].to_string()
    } else {
        s.to_string()
    }
}
