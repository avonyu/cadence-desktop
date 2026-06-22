use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::http::Request;
use tokio_tungstenite::tungstenite::Message as WsMessage;

use base64::Engine as _;

fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

#[tauri::command]
pub async fn synthesize_edge_tts(text: String) -> Result<String, String> {
    let url = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491C6F4";

    let req = Request::builder()
        .uri(url)
        .header(
            "Origin",
            "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
        )
        .header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
        )
        .header("Accept-Encoding", "gzip, deflate, br")
        .header("Accept-Language", "en-US,en;q=0.9")
        .body(())
        .map_err(|e| format!("Failed to build request: {}", e))?;

    let (mut ws, _) = connect_async(req)
        .await
        .map_err(|e| format!("WebSocket connection failed: {}", e))?;

    let config_msg = concat!(
        "Content-Type:application/json; charset=utf-8\r\n",
        "Path:speech.config\r\n",
        "\r\n",
        r#"{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":false,"wordBoundaryEnabled":true},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}"#
    );
    ws.send(WsMessage::Text(config_msg.to_string()))
        .await
        .map_err(|e| format!("Failed to send config: {}", e))?;

    let request_id = uuid::Uuid::new_v4().to_string().replace('-', "");
    let ssml = format!(
        "X-RequestId:{}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n<speak version=\"1.0\" xmlns=\"http://www.w3.org/2001/10/synthesis\" xmlns:mstts=\"http://www.w3.org/2001/mstts\" xml:lang=\"en-US\"><voice name=\"en-US-AriaNeural\"><prosody rate=\"0.8\">{}</prosody></voice></speak>",
        request_id,
        xml_escape(&text),
    );
    ws.send(WsMessage::Text(ssml))
        .await
        .map_err(|e| format!("Failed to send SSML: {}", e))?;

    let mut audio = Vec::new();

    while let Some(msg) = ws.next().await {
        match msg.map_err(|e| format!("WebSocket error: {}", e))? {
            WsMessage::Binary(data) => {
                let needle = b"Path:audio\r\n";
                if let Some(pos) = data.windows(needle.len()).position(|w| w == needle) {
                    audio.extend_from_slice(&data[pos + needle.len()..]);
                }
            }
            WsMessage::Text(txt) => {
                if txt.contains("Path:turn.end") {
                    break;
                }
            }
            WsMessage::Close(_) => break,
            _ => {}
        }
    }

    let _ = ws.close(None).await;

    if audio.is_empty() {
        return Err("No audio received".into());
    }

    Ok(base64::engine::general_purpose::STANDARD.encode(&audio))
}
