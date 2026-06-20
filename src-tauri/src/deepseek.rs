use tauri_plugin_http::reqwest;

use crate::util::strip_markdown_fences;

#[tauri::command]
pub async fn call_deepseek_api(
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

pub(crate) async fn deepseek_chat(
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
pub async fn call_deepseek_dictionary(
    word: String,
    api_key: String,
    model: String,
) -> Result<String, String> {
    let system_prompt = include_str!("../prompts/word-dictionary.md");
    let user_content = format!("Define: {}", word.trim().to_lowercase());

    deepseek_chat(
        &api_key,
        &model,
        system_prompt,
        &user_content,
        0.3,
        Some(1024),
    )
    .await
}
