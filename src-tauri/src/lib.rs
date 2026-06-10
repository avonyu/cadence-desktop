// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri_plugin_http::reqwest;

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

    // Strip markdown code fences
    let stripped = text
        .replace("```srt\n", "")
        .replace("```ass\n", "")
        .replace("```ssa\n", "")
        .replace("```\n", "")
        .replace("```", "")
        .trim()
        .to_string();

    Ok(stripped)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![call_deepseek_api])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
