use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::sync::{LazyLock, Mutex};
use serde::Serialize;
use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_http::reqwest;
use tauri_plugin_store::StoreExt;
use ffmpeg_sidecar::command::ffmpeg_is_installed;
use ffmpeg_sidecar::ffprobe::ffprobe_is_installed;

mod activation;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

/// Remove markdown code fences from AI output.
/// Handles any language identifier (```srt, ```ass, ```plaintext, etc.)
/// and leading/trailing commentary lines outside the fence.
fn strip_markdown_fences(input: &str) -> String {
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
async fn call_deepseek_api(
    content: String,
    api_key: String,
    model: String,
) -> Result<String, String> {
    let system_prompt = include_str!("../prompts/subtitle-processor.md");

    let text = deepseek_chat(&api_key, &model, system_prompt, &content, 0.1, None).await?;

    let stripped = strip_markdown_fences(&text)
        .replace("\\r", "")
        .trim()
        .to_string();

    Ok(stripped)
}

async fn deepseek_chat(
    api_key: &str,
    model: &str,
    system_prompt: &str,
    user_content: &str,
    temperature: f64,
    max_tokens: Option<u32>,
) -> Result<String, String> {
    let mut body = serde_json::json!({
        "model": model,
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": user_content }
        ],
        "temperature": temperature,
    });

    if let Some(tokens) = max_tokens {
        body["max_tokens"] = serde_json::json!(tokens);
    }

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.deepseek.com/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, body));
    }

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(json["choices"][0]["message"]["content"]
        .as_str()
        .ok_or("Invalid API response format")?
        .to_string())
}

#[tauri::command]
async fn call_deepseek_dictionary(
    word: String,
    api_key: String,
    model: String,
) -> Result<String, String> {
    let system_prompt = include_str!("../prompts/word-dictionary.md");
    let user_content = format!("Define: {}", word.trim().to_lowercase());

    deepseek_chat(&api_key, &model, system_prompt, &user_content, 0.3, Some(1024)).await
}

static ACTIVE_FFMPEG_PID: LazyLock<Mutex<Option<u32>>> = LazyLock::new(|| Mutex::new(None));

fn kill_process(pid: u32) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let mut cmd = Command::new("taskkill");
        cmd.creation_flags(0x08000000);
        cmd.args(["/F", "/PID", &pid.to_string()])
            .output()
            .map_err(|e| format!("Failed to kill process: {}", e))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output()
            .map_err(|e| format!("Failed to kill process: {}", e))?;
    }
    Ok(())
}

#[derive(Debug, Serialize)]
struct FfmpegTools {
    ffmpeg: bool,
    ffprobe: bool,
    ffplay: bool,
}

#[derive(Debug, Serialize)]
struct CodecInfo {
    codec_name: String,
    codec_long_name: String,
}

#[derive(Debug, Serialize)]
struct VideoCodecResult {
    video: Option<CodecInfo>,
    audio: Option<CodecInfo>,
}

fn resolve_ffmpeg() -> Option<String> {
    if ffmpeg_is_installed() {
        Some(if cfg!(target_os = "windows") { "ffmpeg.exe" } else { "ffmpeg" }.to_string())
    } else {
        None
    }
}

fn resolve_ffprobe() -> Option<String> {
    if ffprobe_is_installed() {
        Some(if cfg!(target_os = "windows") { "ffprobe.exe" } else { "ffprobe" }.to_string())
    } else {
        None
    }
}

#[tauri::command]
fn check_ffmpeg_tools() -> FfmpegTools {
    FfmpegTools {
        ffmpeg: ffmpeg_is_installed(),
        ffprobe: ffprobe_is_installed(),
        ffplay: false,
    }
}

#[tauri::command]
fn check_file_exists(file_path: String) -> bool {
    Path::new(&file_path).exists()
}

#[tauri::command]
fn cancel_transcode() -> Result<(), String> {
    let mut guard = ACTIVE_FFMPEG_PID.lock().map_err(|e| e.to_string())?;
    if let Some(pid) = *guard {
        kill_process(pid)?;
        *guard = None;
        Ok(())
    } else {
        Err("No active transcode to cancel".into())
    }
}

#[tauri::command]
fn detect_video_codecs(file_path: String) -> Result<VideoCodecResult, String> {
    let ffprobe = resolve_ffprobe()
        .ok_or("ffprobe is not installed or not found")?;

    let mut cmd = Command::new(&ffprobe);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);
    let output = cmd
        .args([
            "-v", "error",
            "-show_entries", "stream=codec_name,codec_long_name,codec_type",
            "-of", "json",
            &file_path,
        ])
        .output()
        .map_err(|e| format!("Failed to run ffprobe: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffprobe error: {}", stderr));
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;

    let streams = json["streams"]
        .as_array()
        .ok_or("Missing streams in ffprobe output")?;

    let mut video: Option<CodecInfo> = None;
    let mut audio: Option<CodecInfo> = None;

    for stream in streams {
        let codec_type = stream["codec_type"].as_str().unwrap_or("");
        let codec_name = stream["codec_name"].as_str().unwrap_or("unknown").to_string();
        let codec_long_name = stream["codec_long_name"].as_str().unwrap_or("Unknown").to_string();

        match codec_type {
            "video" if video.is_none() => {
                video = Some(CodecInfo { codec_name, codec_long_name });
            }
            "audio" if audio.is_none() => {
                audio = Some(CodecInfo { codec_name, codec_long_name });
            }
            _ => {}
        }
    }

    Ok(VideoCodecResult { video, audio })
}

fn build_output_path(input: &str) -> String {
    let path = Path::new(input);
    let stem = path.file_stem().unwrap_or_default();
    let output_name = format!("{}_transcoded.mp4", stem.to_string_lossy());
    if let Some(parent) = path.parent() {
        parent.join(&output_name).to_string_lossy().to_string()
    } else {
        output_name
    }
}

fn get_video_duration(file_path: &str) -> Result<f64, String> {
    let ffprobe = resolve_ffprobe()
        .ok_or("ffprobe is not installed")?;

    let mut cmd = Command::new(&ffprobe);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);
    let output = cmd
        .args([
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "csv=p=0",
            file_path,
        ])
        .output()
        .map_err(|e| format!("Failed to run ffprobe: {}", e))?;

    if !output.status.success() {
        return Err("Failed to get video duration".into());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout
        .trim()
        .parse::<f64>()
        .map_err(|_| "Failed to parse duration".into())
}

#[tauri::command]
async fn transcode_audio(
    app: tauri::AppHandle,
    input_path: String,
) -> Result<String, String> {
    let ffmpeg = resolve_ffmpeg()
        .ok_or("ffmpeg is not installed or not found")?;

    let output_path = build_output_path(&input_path);

    if Path::new(&output_path).exists() {
        match get_video_duration(&output_path) {
            Ok(d) if d > 0.0 => return Ok(output_path),
            _ => {
                let _ = std::fs::remove_file(&output_path);
            }
        }
    }

    let duration = get_video_duration(&input_path).unwrap_or(0.0);

    let input = input_path.clone();
    let output = output_path.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let mut cmd = Command::new(&ffmpeg);
        #[cfg(target_os = "windows")]
        cmd.creation_flags(0x08000000);
        let mut child = cmd
            .args([
                "-i", &input,
                "-c:v", "copy",
                "-c:a", "aac",
                "-b:a", "192k",
                "-ac", "2",
                "-progress", "pipe:1",
                "-nostats",
                "-y",
                &output,
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn ffmpeg: {}", e))?;

        *ACTIVE_FFMPEG_PID.lock().unwrap() = Some(child.id());

        let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
        let reader = BufReader::new(stdout);

        for line in reader.lines() {
            let line = line.map_err(|e| format!("Read error: {}", e))?;
            if let Some(rest) = line.strip_prefix("out_time_ms=") {
                let ms: u64 = rest.parse().unwrap_or(0);
                let pct = if duration > 0.0 {
                    ((ms as f64 / (duration * 1_000_000.0)) * 100.0)
                        .min(99.0) as u32
                } else {
                    0
                };
                let _ = app.emit("transcode-progress", pct);
            }
        }

        let status = child
            .wait()
            .map_err(|e| format!("Failed to wait for ffmpeg: {}", e))?;

        *ACTIVE_FFMPEG_PID.lock().unwrap() = None;

        if !status.success() {
            let _ = std::fs::remove_file(&output);
            return Err("ffmpeg transcode failed".into());
        }

        let _ = app.emit("transcode-progress", 100u32);
        Ok(output)
    })
    .await
    .map_err(|e| format!("Transcode task failed: {}", e))?
}

#[derive(Debug, Serialize)]
struct ActivateResult {
    success: bool,
    error: Option<String>,
    fingerprint: Option<String>,
}

#[tauri::command]
fn activate(code: String, app: tauri::AppHandle) -> Result<ActivateResult, String> {
    match activation::validate_code(&code) {
        Some(_index) => {
            let fingerprint = activation::get_machine_fingerprint();
            let store = app.store("activation.dat").map_err(|e| e.to_string())?;
            store.set("activated", serde_json::json!(true));
            store.set("fingerprint", serde_json::json!(&fingerprint));
            store.set("code", serde_json::json!(&code));
            store.save().map_err(|e| e.to_string())?;
            Ok(ActivateResult {
                success: true,
                error: None,
                fingerprint: Some(fingerprint),
            })
        }
        None => Ok(ActivateResult {
            success: false,
            error: Some("Invalid activation code".into()),
            fingerprint: None,
        }),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            call_deepseek_api,
            call_deepseek_dictionary,
            check_ffmpeg_tools,
            detect_video_codecs,
            transcode_audio,
            cancel_transcode,
            activate,
            check_file_exists,
        ])
        .setup(|app| {
            let window = app.get_webview_window("main")
                .expect("main window not found");

            // Restore saved window geometry
            if let Ok(store) = app.store("window-state.dat") {
                if let Some(x) = store.get("x").and_then(|v| v.as_i64()) {
                    let y = store.get("y").and_then(|v| v.as_i64()).unwrap_or(0);
                    let w = store.get("w").and_then(|v| v.as_u64()).unwrap_or(1200);
                    let h = store.get("h").and_then(|v| v.as_u64()).unwrap_or(720);
                    let _ = window.set_position(tauri::PhysicalPosition::new(x as i32, y as i32));
                    let _ = window.set_size(tauri::PhysicalSize::new(w as u32, h as u32));
                }
                if let Some(true) = store.get("maximized").and_then(|v| v.as_bool()) {
                    let _ = window.maximize();
                }
            }

            // Save window geometry on close
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { .. } = event {
                    if let Ok(store) = window_clone.app_handle().store("window-state.dat") {
                        let is_max = window_clone.is_maximized().unwrap_or(false);
                        let pos = window_clone.outer_position().unwrap_or(tauri::PhysicalPosition::new(100, 100));
                        let size = window_clone.outer_size().unwrap_or(tauri::PhysicalSize::new(1200, 720));
                        store.set("x", serde_json::json!(pos.x));
                        store.set("y", serde_json::json!(pos.y));
                        store.set("w", serde_json::json!(size.width));
                        store.set("h", serde_json::json!(size.height));
                        store.set("maximized", serde_json::json!(is_max));
                        let _ = store.save();
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
