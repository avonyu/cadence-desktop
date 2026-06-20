mod activation;
mod activation_commands;
mod deepseek;
mod ffmpeg;
mod tts;
mod util;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            deepseek::call_deepseek_api,
            deepseek::call_deepseek_dictionary,
            tts::synthesize_edge_tts,
            ffmpeg::check_ffmpeg_tools,
            ffmpeg::detect_video_codecs,
            ffmpeg::transcode_audio,
            ffmpeg::cancel_transcode,
            activation_commands::activate,
            activation_commands::get_activation_status,
            util::check_file_exists,
        ])
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
