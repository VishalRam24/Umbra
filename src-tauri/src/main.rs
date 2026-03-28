#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![cfg_attr(target_os = "macos", allow(unexpected_cfgs))]

use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

// ---------- macOS Biometric (Touch ID) ----------
#[cfg(target_os = "macos")]
mod biometric {
    use objc::runtime::{Object, BOOL, YES};
    use objc::{class, msg_send, sel, sel_impl};
    use std::sync::mpsc;

    #[link(name = "LocalAuthentication", kind = "framework")]
    extern "C" {}

    /// Check if biometric authentication (Touch ID) is available.
    pub fn is_available() -> bool {
        unsafe {
            let context: *mut Object = msg_send![class!(LAContext), new];
            let mut error: *mut Object = std::ptr::null_mut();
            // LAPolicyDeviceOwnerAuthenticationWithBiometrics = 1
            let available: BOOL = msg_send![context, canEvaluatePolicy:1i64 error:&mut error];
            let _: () = msg_send![context, release];
            available == YES
        }
    }

    /// Prompt Touch ID and return true if authentication succeeded.
    pub fn authenticate(reason: &str) -> Result<bool, String> {
        unsafe {
            let context: *mut Object = msg_send![class!(LAContext), new];
            let mut error: *mut Object = std::ptr::null_mut();
            let available: BOOL = msg_send![context, canEvaluatePolicy:1i64 error:&mut error];
            if available != YES {
                let _: () = msg_send![context, release];
                return Err("Biometric authentication not available on this device".into());
            }

            // Build NSString for the reason
            let reason_nsstring: *mut Object = {
                let s: *mut Object = msg_send![class!(NSString), alloc];
                msg_send![s, initWithBytes:reason.as_ptr()
                             length:reason.len()
                             encoding:4u64] // NSUTF8StringEncoding
            };

            let (tx, rx) = mpsc::channel::<bool>();

            // Objective-C block: void (^)(BOOL success, NSError *error)
            let block = block::ConcreteBlock::new(move |success: BOOL, _err: *mut Object| {
                let _ = tx.send(success == YES);
            });
            let block = block.copy();

            // evaluatePolicy:localizedReason:reply:
            let _: () = msg_send![context,
                evaluatePolicy:1i64
                localizedReason:reason_nsstring
                reply:&*block
            ];

            let result = rx.recv().map_err(|e| e.to_string())?;
            let _: () = msg_send![reason_nsstring, release];
            let _: () = msg_send![context, release];
            Ok(result)
        }
    }
}

#[cfg(not(target_os = "macos"))]
mod biometric {
    pub fn is_available() -> bool { false }
    pub fn authenticate(_reason: &str) -> Result<bool, String> {
        Err("Biometric authentication is only available on macOS".into())
    }
}

fn app_data_dir(app: &tauri::AppHandle) -> PathBuf {
    let base = app
        .path()
        .app_data_dir()
        .expect("failed to resolve app data dir");
    let dir = base.join("umbra_data");
    fs::create_dir_all(&dir).ok();
    dir
}

fn state_file(app: &tauri::AppHandle) -> PathBuf {
    app_data_dir(app).join("state.json")
}

fn assets_dir(app: &tauri::AppHandle) -> PathBuf {
    let dir = app_data_dir(app).join("assets");
    fs::create_dir_all(&dir).ok();
    dir
}

#[tauri::command]
fn save_state(app: tauri::AppHandle, json: String) -> Result<(), String> {
    let path = state_file(&app);
    fs::write(&path, &json).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_state(app: tauri::AppHandle) -> Result<String, String> {
    let path = state_file(&app);
    if path.exists() {
        fs::read_to_string(&path).map_err(|e| e.to_string())
    } else {
        Ok(String::new())
    }
}

#[derive(Serialize)]
struct ImportedAsset {
    asset_id: String,
    path: String,
}

#[tauri::command]
fn import_asset(
    app: tauri::AppHandle,
    source_path: String,
    file_name: String,
) -> Result<ImportedAsset, String> {
    let asset_id = uuid::Uuid::new_v4().to_string();
    let ext = std::path::Path::new(&file_name)
        .extension()
        .map(|e| format!(".{}", e.to_string_lossy()))
        .unwrap_or_default();
    let dest_name = format!("{}{}", asset_id, ext);
    let dest = assets_dir(&app).join(&dest_name);

    fs::copy(&source_path, &dest).map_err(|e| e.to_string())?;

    Ok(ImportedAsset {
        asset_id,
        path: dest.to_string_lossy().to_string(),
    })
}

#[tauri::command]
fn get_asset_path(app: tauri::AppHandle, asset_id: String) -> Result<String, String> {
    let dir = assets_dir(&app);
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with(&asset_id) {
            return Ok(entry.path().to_string_lossy().to_string());
        }
    }
    Err("Asset not found".to_string())
}

#[tauri::command]
fn open_file_external(path: String) -> Result<(), String> {
    open::that(&path).map_err(|e| e.to_string())
}

#[derive(Serialize)]
struct LinkMeta {
    title: String,
    description: String,
    image: String,
    favicon: String,
}

#[tauri::command]
async fn fetch_link_meta(url: String) -> Result<LinkMeta, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15")
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let html = resp.text().await.map_err(|e| e.to_string())?;

    // Simple regex-based extraction (no heavy HTML parser dependency)
    let get_meta = |property: &str| -> String {
        // Try og:property first, then name=property
        let patterns = [
            format!(r#"property="{property}" content="([^"]*)""#),
            format!(r#"property='{property}' content='([^']*)'"#),
            format!(r#"content="([^"]*)" property="{property}""#),
            format!(r#"name="{property}" content="([^"]*)""#),
            format!(r#"content="([^"]*)" name="{property}""#),
        ];
        for pat in &patterns {
            if let Ok(re) = regex::Regex::new(pat) {
                if let Some(caps) = re.captures(&html) {
                    if let Some(m) = caps.get(1) {
                        let val = m.as_str().to_string();
                        if !val.is_empty() {
                            return val;
                        }
                    }
                }
            }
        }
        String::new()
    };

    let title = {
        let og = get_meta("og:title");
        if !og.is_empty() {
            og
        } else {
            // Fallback: extract <title>
            regex::Regex::new(r"<title[^>]*>([^<]*)</title>")
                .ok()
                .and_then(|re| re.captures(&html))
                .and_then(|c| c.get(1))
                .map(|m| m.as_str().trim().to_string())
                .unwrap_or_default()
        }
    };

    let description = {
        let og = get_meta("og:description");
        if !og.is_empty() { og } else { get_meta("description") }
    };

    let image = get_meta("og:image");

    // Extract favicon
    let raw_favicon = regex::Regex::new(r#"<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["']"#)
        .ok()
        .and_then(|re| re.captures(&html))
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
        .unwrap_or_default();
    let favicon = if raw_favicon.starts_with("//") {
        format!("https:{}", raw_favicon)
    } else if raw_favicon.starts_with('/') {
        if let Ok(parsed) = url::Url::parse(&url) {
            format!("{}://{}{}", parsed.scheme(), parsed.host_str().unwrap_or(""), raw_favicon)
        } else {
            raw_favicon
        }
    } else if raw_favicon.is_empty() {
        if let Ok(parsed) = url::Url::parse(&url) {
            format!("{}://{}/favicon.ico", parsed.scheme(), parsed.host_str().unwrap_or(""))
        } else {
            String::new()
        }
    } else {
        raw_favicon
    };

    // Resolve relative og:image URL
    let image = if image.starts_with("//") {
        format!("https:{}", image)
    } else if image.starts_with('/') {
        if let Ok(parsed) = url::Url::parse(&url) {
            format!("{}://{}{}", parsed.scheme(), parsed.host_str().unwrap_or(""), image)
        } else {
            image
        }
    } else {
        image
    };

    // Decode common HTML entities
    let decode = |s: String| -> String {
        s.replace("&amp;", "&")
         .replace("&lt;", "<")
         .replace("&gt;", ">")
         .replace("&quot;", "\"")
         .replace("&#39;", "'")
         .replace("&#x27;", "'")
         .replace("&apos;", "'")
    };

    Ok(LinkMeta {
        title: decode(title),
        description: decode(description),
        image,
        favicon,
    })
}

#[tauri::command]
fn copy_asset_to_path(
    app: tauri::AppHandle,
    asset_id: String,
    dest_path: String,
) -> Result<(), String> {
    let dir = assets_dir(&app);
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with(&asset_id) {
            fs::copy(entry.path(), &dest_path).map_err(|e| e.to_string())?;
            return Ok(());
        }
    }
    Err("Asset not found".to_string())
}

#[tauri::command]
fn biometric_available() -> bool {
    biometric::is_available()
}

#[tauri::command]
async fn biometric_authenticate(reason: String) -> Result<bool, String> {
    // Run on a blocking thread because the ObjC call waits for user interaction
    tokio::task::spawn_blocking(move || biometric::authenticate(&reason))
        .await
        .map_err(|e| e.to_string())?
}

fn main() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            save_state,
            load_state,
            import_asset,
            get_asset_path,
            open_file_external,
            copy_asset_to_path,
            fetch_link_meta,
            biometric_available,
            biometric_authenticate,
        ]);

    #[cfg(debug_assertions)]
    let builder = builder.plugin(tauri_plugin_mcp_bridge::init());

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
