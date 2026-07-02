use serde::Serialize;
use tauri_plugin_http::reqwest;

use crate::util::strip_markdown_fences;

#[derive(Serialize)]
pub struct DeepSeekModel {
    pub id: String,
}

#[tauri::command]
pub async fn fetch_deepseek_models(api_key: String) -> Result<Vec<DeepSeekModel>, String> {
    if api_key.trim().is_empty() {
        return Err("API key is required".to_string());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to build client: {}", e))?;

    let response = client
        .get("https://api.deepseek.com/models")
        .header("Authorization", format!("Bearer {}", api_key))
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

    let models = json["data"]
        .as_array()
        .ok_or("Invalid API response format")?
        .iter()
        .filter_map(|m| {
            m["id"]
                .as_str()
                .map(|id| DeepSeekModel { id: id.to_string() })
        })
        .collect();

    Ok(models)
}

#[tauri::command]
pub async fn call_deepseek_api(
    content: String,
    format: String,
    api_key: String,
    model: String,
) -> Result<String, String> {
    let system_prompt = include_str!("../prompts/subtitle-processor.md");
    let user_content = format!("Format: {}\n\n{}", format, content);

    let text = deepseek_chat(&api_key, &model, system_prompt, &user_content, 0.1, Some(65536)).await?;

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

#[tauri::command]
pub async fn call_deepseek_explain_sentence(
    sentence: String,
    translation: String,
    learning_language: String,
    native_language: String,
    api_key: String,
    model: String,
) -> Result<String, String> {
    let system_prompt = include_str!("../prompts/sentence-explainer.md");
    let learning_name = match learning_language.as_str() {
        "zh" => "Chinese",
        "en" => "English",
        _ => &learning_language,
    };
    let native_name = match native_language.as_str() {
        "zh" => "Chinese",
        "en" => "English",
        _ => &native_language,
    };
    let user_content = format!(
        "The student is learning {}. Their native language is {}.\n\nSentence: {}\nTranslation: {}",
        learning_name,
        native_name,
        sentence.trim(),
        translation.trim()
    );

    deepseek_chat(
        &api_key,
        &model,
        system_prompt,
        &user_content,
        0.3,
        Some(2048),
    )
    .await
}
