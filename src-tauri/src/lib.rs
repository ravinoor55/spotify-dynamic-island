use std::process::Command;

#[tauri::command]
fn toggle_play_pause() {
    Command::new("osascript")
        .arg("-e")
        .arg("tell application \"Spotify\" to playpause")
        .spawn()
        .expect("Failed to toggle Spotify");
}

#[tauri::command]
fn next_track() {
    Command::new("osascript")
        .arg("-e")
        .arg("tell application \"Spotify\" to next track")
        .spawn()
        .expect("Failed to skip forward");
}

#[tauri::command]
fn previous_track() {
    Command::new("osascript")
        .arg("-e")
        .arg("tell application \"Spotify\" to previous track")
        .spawn()
        .expect("Failed to skip backward");
}

#[tauri::command]
async fn get_track_name() -> String {
    let output = Command::new("osascript")
        .arg("-e")
        .arg("tell application \"Spotify\" to name of current track")
        .output();

    match output {
        Ok(output) => String::from_utf8_lossy(&output.stdout).trim().to_string(),
        Err(_) => String::from("Unknown Track"),
    }
}

#[tauri::command]
async fn get_track_artist() -> String {
    let output = Command::new("osascript")
        .arg("-e")
        .arg("tell application \"Spotify\" to artist of current track")
        .output();

    match output {
        Ok(output) => String::from_utf8_lossy(&output.stdout).trim().to_string(),
        Err(_) => String::from("Unknown Artist"),
    }
}

// 1. ADD THIS NEW FUNCTION FOR THE ARTWORK
#[tauri::command]
async fn get_track_artwork() -> String {
    let output = Command::new("osascript")
        .arg("-e")
        .arg("tell application \"Spotify\" to artwork url of current track")
        .output();

    match output {
        Ok(output) => String::from_utf8_lossy(&output.stdout).trim().to_string(),
        Err(_) => String::new(),
    }
}

#[tauri::command]
async fn get_player_state() -> String {
    let output = Command::new("osascript")
        .arg("-e")
        .arg("tell application \"Spotify\" to player state")
        .output();

    match output {
        Ok(output) => String::from_utf8_lossy(&output.stdout).trim().to_string(),
        Err(_) => String::from("stopped"),
    }
}

#[tauri::command]
fn open_spotify_app() {
    Command::new("osascript")
        .arg("-e")
        .arg("tell application \"Spotify\" to activate")
        .spawn()
        .expect("Failed to open Spotify");
}

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_shadow(false);
                
                // Auto-center the widget perfectly at the top edge (notch area)
                if let Ok(Some(monitor)) = window.primary_monitor() {
                    let monitor_size = monitor.size();
                    let window_size = window.outer_size().unwrap_or_default();
                    let x = (monitor_size.width as i32 - window_size.width as i32) / 2;
                    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(x, 0)));
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            toggle_play_pause,
            next_track,
            previous_track,
            get_track_name,
            get_track_artist,
            get_track_artwork,
            get_player_state,
            open_spotify_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}