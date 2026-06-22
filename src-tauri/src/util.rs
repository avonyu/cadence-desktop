use std::path::Path;

/// Read a single variable from the project .env file at runtime.
/// Tries multiple paths relative to known locations (dev mode only).
#[cfg(debug_assertions)]
pub(crate) fn read_dotenv_var(key: &str) -> Option<String> {
    let candidates = [
        Path::new("../.env"), // dev: cargo run from src-tauri/
        Path::new(".env"),    // fallback: exe directory
    ];
    for path in &candidates {
        let content = match std::fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };
        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if let Some((k, v)) = line.split_once('=') {
                if k.trim() == key {
                    let val = v.trim();
                    // Strip surrounding quotes if present
                    let val = if val.len() >= 2
                        && ((val.starts_with('"') && val.ends_with('"'))
                            || (val.starts_with('\'') && val.ends_with('\'')))
                    {
                        &val[1..val.len() - 1]
                    } else {
                        val
                    };
                    return Some(val.to_string());
                }
            }
        }
    }
    None
}

/// Remove markdown code fences from AI output.
/// Handles any language identifier (```srt, ```ass, ```plaintext, etc.)
/// and leading/trailing commentary lines outside the fence.
pub(crate) fn strip_markdown_fences(input: &str) -> String {
    let input = input.replace("\r\n", "\n").replace('\r', "\n");

    // Find the first line that starts with ``` (opening fence)
    let lines: Vec<&str> = input.lines().collect();
    let fence_start = lines.iter().position(|l| l.trim_start().starts_with("```"));

    if let Some(start_idx) = fence_start {
        // Find matching closing fence (line that is just ``` or starts with ```)
        let closing_idx = lines[start_idx + 1..]
            .iter()
            .position(|l| l.trim() == "```");

        let content_lines = if let Some(end_offset) = closing_idx {
            &lines[start_idx + 1..start_idx + 1 + end_offset]
        } else {
            // No closing fence; take everything after opening
            &lines[start_idx + 1..]
        };

        return content_lines.join("\n");
    }

    // No fences found; return as-is.
    input.to_string()
}

#[tauri::command]
pub(crate) fn check_file_exists(file_path: String) -> bool {
    Path::new(&file_path).exists()
}
