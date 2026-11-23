// 访问令牌存系统钥匙串：Windows Credential Manager / macOS Keychain / Linux Secret Service。
// 不落 localStorage、不写日志文件；前端只拿得到 token 本身，拿不到存储位置。
use keyring::Entry;

const SERVICE: &str = "com.modernchat.desktop";
const USERNAME: &str = "access-token";

fn entry() -> Result<Entry, String> {
    Entry::new(SERVICE, USERNAME).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_token(token: String) -> Result<(), String> {
    if token.is_empty() {
        return clear_token();
    }
    entry()?.set_password(&token).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_token() -> Result<Option<String>, String> {
    match entry()?.get_password() {
        Ok(t) => Ok(Some(t)),
        // NoEntry 是首次启动的正常状态，不是错误
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn clear_token() -> Result<(), String> {
    match entry()?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
