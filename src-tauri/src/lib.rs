#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Manager, State};

struct RpcState {
    client: Mutex<Option<DiscordIpcClient>>,
    last_update: Mutex<Option<Instant>>,
    last_track_id: Mutex<Option<String>>,
    connected: Mutex<bool>,
}

#[tauri::command]
fn set_discord_presence(
    state: State<'_, RpcState>,
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
    button2_label: Option<String>,
    button2_url: Option<String>,
    track_id: Option<String>,
) -> Result<(), String> {
    let mut client_opt = state.client.lock().map_err(|_| "Mutex poisoned")?;

    if let Some(new_id) = &track_id {
        let mut last_id_opt = state.last_track_id.lock().map_err(|_| "Mutex poisoned")?;
        if let Some(ref last_id) = *last_id_opt {
            if last_id != new_id {
                let mut last_opt = state.last_update.lock().map_err(|_| "Mutex poisoned")?;
                *last_opt = None;
                log::debug!("[RPC] Track changed: {} → {}", last_id, new_id);
            }
        }
        *last_id_opt = Some(new_id.clone());
    }

    {
        let mut last_opt = state.last_update.lock().map_err(|_| "Mutex poisoned")?;
        if let Some(last) = *last_opt {
            if last.elapsed() < Duration::from_secs(15) {
                return Ok(());
            }
        }
        *last_opt = Some(Instant::now());
    }

    if client_opt.is_none() {
        match DiscordIpcClient::new("1484809741959036949") {
            Ok(mut new_client) => {
                if new_client.connect().is_ok() {
                    log::info!("[RPC] Connected to Discord");
                    *client_opt = Some(new_client);
                    *state.connected.lock().map_err(|_| "Mutex poisoned")? = true;
                } else {
                    return Err("Failed to connect to Discord".into());
                }
            }
            Err(e) => return Err(format!("Failed to init RPC: {}", e)),
        }
    }

    let mut act = activity::Activity::new();

    if let Some(d) = &details {
        act = act.details(d);
    }
    if let Some(s) = &state_str {
        act = act.state(s);
    }

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

    if let (Some(start), Some(end)) = (start_timestamp, end_timestamp) {
        if start < end && end - start <= 86400 {
            act = act.timestamps(activity::Timestamps::new().start(start).end(end));
        }
    } else if let Some(start) = start_timestamp {
        act = act.timestamps(activity::Timestamps::new().start(start));
    }

    let mut buttons = vec![];
    if let (Some(l), Some(u)) = (&button1_label, &button1_url) {
        if !l.is_empty() && !u.is_empty() {
            buttons.push(activity::Button::new(l, u.trim()));
        }
    }
    if let (Some(l), Some(u)) = (&button2_label, &button2_url) {
        if !l.is_empty() && !u.is_empty() && buttons.len() < 2 {
            buttons.push(activity::Button::new(l, u.trim()));
        }
    }
    if !buttons.is_empty() {
        act = act.buttons(buttons);
    }

    if let Some(client) = client_opt.as_mut() {
        if let Err(e) = client.set_activity(act) {
            log::warn!("[RPC] Update failed: {}, reconnecting...", e);
            let _ = client.reconnect();
            let _ = state.connected.lock().map_err(|_| "Mutex poisoned").map(|mut c| *c = false);
        }
    }

    Ok(())
}

#[tauri::command]
fn clear_discord_presence(state: State<'_, RpcState>) -> Result<(), String> {
    let mut client_opt = state.client.lock().map_err(|_| "Mutex poisoned")?;
    if let Some(client) = client_opt.as_mut() {
        let _ = client.clear_activity();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(RpcState {
            client: Mutex::new(None),
            last_update: Mutex::new(None),
            last_track_id: Mutex::new(None),
            connected: Mutex::new(false),
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
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(state) = window.app_handle().try_state::<RpcState>() {
                    if let Ok(mut client_opt) = state.client.lock() {
                        if let Some(client) = client_opt.as_mut() {
                            let _ = client.clear_activity();
                        }
                        *client_opt = None;
                    }
                    log::info!("[RPC] Cleaned up on window destroy");
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
