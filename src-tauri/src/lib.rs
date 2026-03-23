#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use std::sync::Mutex;
use std::time::{Instant, Duration};
use tauri::{State, Manager, WebviewWindow};

// Состояние Discord RPC
struct DiscordState {
    client: Mutex<Option<DiscordIpcClient>>,
    last_update: Mutex<Option<Instant>>,
}

#[tauri::command]
fn set_discord_presence(
    state: State<'_, DiscordState>,
    details: Option<String>,
    state_str: Option<String>,
    large_image_key: Option<String>,
    large_text: Option<String>,
    small_image_key: Option<String>,
    small_text: Option<String>,
    start_timestamp: Option<i64>,
    end_timestamp: Option<i64>,
    button1_label: Option<String>,
    button1_url: Option<String>,
) -> Result<(), String> {
    // 🔒 Безопасная блокировка мьютекса
    let mut client_opt = state.client.lock().map_err(|_| "Mutex poisoned")?;
    
    // ⚡ Rate limiting: не чаще раза в 15 секунд (лимит Discord)
    {
        let mut last_opt = state.last_update.lock().map_err(|_| "Mutex poisoned")?;
        if let Some(last) = *last_opt {
            if last.elapsed() < Duration::from_secs(15) {
                log::debug!("[Discord RPC] Rate limited, skipping update");
                return Ok(());
            }
        }
        *last_opt = Some(Instant::now());
    }

    // 🔌 Ленивая инициализация клиента
    if client_opt.is_none() {
        match DiscordIpcClient::new("1484809741959036949") {
            Ok(mut new_client) => {
                if new_client.connect().is_ok() {
                    log::info!("[Discord RPC] Connected");
                    *client_opt = Some(new_client);
                } else {
                    log::warn!("[Discord RPC] Failed to connect");
                    return Err("Failed to connect to Discord".into());
                }
            }
            Err(e) => {
                log::error!("[Discord RPC] Init error: {}", e);
                return Err(format!("Failed to init RPC: {}", e));
            }
        }
    }

    // 🎯 Обновление активности, если клиент есть
    if let Some(client) = client_opt.as_mut() {
        let mut act = activity::Activity::new();
        
        // Текст
        if let Some(d) = &details {
            act = act.details(d);
        }
        if let Some(s) = &state_str {
            act = act.state(s);
        }
        
        // Изображения
        let mut has_assets = false;
        let mut assets = activity::Assets::new();
        if let Some(lik) = &large_image_key {
            assets = assets.large_image(lik);
            has_assets = true;
            if let Some(lt) = &large_text {
                assets = assets.large_text(lt);
            }
        }
        if let Some(sik) = &small_image_key {
            assets = assets.small_image(sik);
            has_assets = true;
            if let Some(st) = &small_text {
                assets = assets.small_text(st);
            }
        }
        if has_assets {
            act = act.assets(assets);
        }

        // ⏱️ Timestamps для прогресс-бара
        if let (Some(start), Some(end)) = (start_timestamp, end_timestamp) {
            if start < end && end - start <= 86400 {
                let timestamps = activity::Timestamps::new()
                    .start(start)
                    .end(end);
                act = act.timestamps(timestamps);
            }
        } else if let Some(start) = start_timestamp {
            let timestamps = activity::Timestamps::new().start(start);
            act = act.timestamps(timestamps);
        }

        // 🔘 Кнопки
        let mut buttons = vec![];
        if let (Some(l), Some(u)) = (&button1_label, &button1_url) {
            if !l.is_empty() && !u.is_empty() {
                buttons.push(activity::Button::new(l, u));
            }
        }
        if !buttons.is_empty() {
            act = act.buttons(buttons);
        }

        // 🚀 Отправка с обработкой ошибок
        if let Err(e) = client.set_activity(act) {
            log::warn!("[Discord RPC] Failed to update: {}", e);
            let _ = client.reconnect();
        }
    }
    
    Ok(())
}

#[tauri::command]
fn clear_discord_presence(state: State<'_, DiscordState>) -> Result<(), String> {
    let mut client_opt = state.client.lock().map_err(|_| "Mutex poisoned")?;
    
    if let Some(client) = client_opt.as_mut() {
        if let Err(e) = client.clear_activity() {
            log::warn!("[Discord RPC] Failed to clear: {}", e);
            let _ = client.reconnect();
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(DiscordState {
            client: Mutex::new(None),
            last_update: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            set_discord_presence,
            clear_discord_presence
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Debug)
                        .build(),
                )?;
            }
            log::info!("[Discord RPC] Tauri app initialized");
            Ok(())
        })
        .on_window_event(|window, event| {
            // Очищаем статус при закрытии окна (Tauri v2 signature)
            if let tauri::WindowEvent::Destroyed = event {
                // 🔧 FIX: try_state возвращает Option, а не Result!
                if let Some(state) = window.app_handle().try_state::<DiscordState>() {
                    let _ = clear_discord_presence(state);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}