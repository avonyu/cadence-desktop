use ffmpeg_sidecar::command::ffmpeg_is_installed;
use ffmpeg_sidecar::ffprobe::ffprobe_is_installed;
use serde::Serialize;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::{LazyLock, Mutex};
use tauri::Emitter;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

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
pub struct FfmpegTools {
    pub ffmpeg: bool,
    pub ffprobe: bool,
    pub ffplay: bool,
}

#[derive(Debug, Serialize)]
pub struct CodecInfo {
    pub codec_name: String,
    pub codec_long_name: String,
}

#[derive(Debug, Serialize)]
pub struct VideoCodecResult {
    pub video: Option<CodecInfo>,
    pub audio: Option<CodecInfo>,
}

fn resolve_ffmpeg() -> Option<String> {
    if ffmpeg_is_installed() {
        Some(
            if cfg!(target_os = "windows") {
                "ffmpeg.exe"
            } else {
                "ffmpeg"
            }
            .to_string(),
        )
    } else {
        None
    }
}

fn resolve_ffprobe() -> Option<String> {
    if ffprobe_is_installed() {
        Some(
            if cfg!(target_os = "windows") {
                "ffprobe.exe"
            } else {
                "ffprobe"
            }
            .to_string(),
        )
    } else {
        None
    }
}

#[tauri::command]
pub fn check_ffmpeg_tools() -> FfmpegTools {
    FfmpegTools {
        ffmpeg: ffmpeg_is_installed(),
        ffprobe: ffprobe_is_installed(),
        ffplay: false,
    }
}

#[tauri::command]
pub fn cancel_transcode() -> Result<(), String> {
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
pub fn detect_video_codecs(file_path: String) -> Result<VideoCodecResult, String> {
    let ffprobe = resolve_ffprobe().ok_or("ffprobe is not installed or not found")?;

    let mut cmd = Command::new(&ffprobe);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);
    let output = cmd
        .args([
            "-v",
            "error",
            "-show_entries",
            "stream=codec_name,codec_long_name,codec_type",
            "-of",
            "json",
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
        let codec_name = stream["codec_name"]
            .as_str()
            .unwrap_or("unknown")
            .to_string();
        let codec_long_name = stream["codec_long_name"]
            .as_str()
            .unwrap_or("Unknown")
            .to_string();

        match codec_type {
            "video" if video.is_none() => {
                video = Some(CodecInfo {
                    codec_name,
                    codec_long_name,
                });
            }
            "audio" if audio.is_none() => {
                audio = Some(CodecInfo {
                    codec_name,
                    codec_long_name,
                });
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
    let ffprobe = resolve_ffprobe().ok_or("ffprobe is not installed")?;

    let mut cmd = Command::new(&ffprobe);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);
    let output = cmd
        .args([
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "csv=p=0",
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
pub async fn transcode_audio(app: tauri::AppHandle, input_path: String) -> Result<String, String> {
    let ffmpeg = resolve_ffmpeg().ok_or("ffmpeg is not installed or not found")?;

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
                "-i",
                &input,
                "-c:v",
                "copy",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-ac",
                "2",
                "-progress",
                "pipe:1",
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
                    ((ms as f64 / (duration * 1_000_000.0)) * 100.0).min(99.0) as u32
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
