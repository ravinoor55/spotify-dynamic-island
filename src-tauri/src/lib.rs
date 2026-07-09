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
async fn get_spotify_state() -> String {
    let script = r#"
if application "Spotify" is running then
    try
        tell application "Spotify"
            set tName to name of current track
            set tArtist to artist of current track
            set tArt to artwork url of current track
            set pState to player state as string
            return tName & "|||" & tArtist & "|||" & tArt & "|||" & pState
        end tell
    on error
        return "error"
    end try
else
    return "not_running"
end if
"#;

    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output();

    match output {
        Ok(output) => String::from_utf8_lossy(&output.stdout).trim().to_string(),
        Err(_) => String::from("error"),
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
            get_spotify_state,
            open_spotify_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}