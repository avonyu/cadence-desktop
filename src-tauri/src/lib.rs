use std::process::Command;
use serde::Serialize;
use tauri_plugin_http::reqwest;

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
    let system_prompt = r#"You are a subtitle processor. Your task is to clean and enhance subtitle files.

Rules:
1. Keep ALL original timestamps and numbering exactly as-is. Do not modify, shift, or remove any timing information.
2. Only keep dialogue-related lines (including song lyrics). Remove credits, scene descriptions, translator names, and any non-dialogue text.
3. Remove all style and control information enclosed in curly braces {}.
4. For bilingual subtitles (containing both Chinese and English), preserve the \N line breaks that separate the two languages.
5. For single-language subtitles:
   - If the subtitle is only in Chinese, translate each line to English and append it after the original text separated by \N.
   - If the subtitle is only in English, translate each line to Chinese and prepend it before the original text separated by \N.
6. Output the result in the SAME format as the input (SRT stays SRT, ASS stays ASS). Do not change formats.
7. Return ONLY the processed subtitle content. Do NOT wrap the output in markdown code fences, do NOT add any explanation, do NOT add any commentary — just the raw subtitle text."#;

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.deepseek.com/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "model": model,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": content }
            ],
            "temperature": 0.1,
            "thinking": { "type": "enabled" },
            "reasoning_effort": "high"
        }))
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

    let text = json["choices"][0]["message"]["content"]
        .as_str()
        .ok_or("Invalid API response format")?
        .to_string();

    // Strip markdown code fences and literal \r characters.
    // The AI may still wrap output in fences despite the prompt asking not to.
    let stripped = strip_markdown_fences(&text)
        .replace("\\r", "") // Remove literal \r (AI may output this as text)
        .trim()
        .to_string();

    Ok(stripped)
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

fn is_command_available(name: &str) -> bool {
    Command::new(if cfg!(target_os = "windows") { "where" } else { "which" })
        .arg(name)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[tauri::command]
fn check_ffmpeg_tools() -> FfmpegTools {
    FfmpegTools {
        ffmpeg: is_command_available("ffmpeg"),
        ffprobe: is_command_available("ffprobe"),
        ffplay: is_command_available("ffplay"),
    }
}

#[tauri::command]
fn detect_video_codecs(file_path: String) -> Result<VideoCodecResult, String> {
    if !is_command_available("ffprobe") {
        return Err("ffprobe is not installed or not found in PATH".into());
    }

    let output = Command::new("ffprobe")
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![call_deepseek_api, check_ffmpeg_tools, detect_video_codecs])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
