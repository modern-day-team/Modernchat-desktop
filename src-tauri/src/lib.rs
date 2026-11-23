mod token_store;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            token_store::save_token,
            token_store::load_token,
            token_store::clear_token,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
