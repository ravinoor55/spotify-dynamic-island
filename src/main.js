// 1. The Vanilla JS Tauri Bridge
const { invoke } = window.__TAURI__.core;

// 2. Grab all the HTML elements
const playPauseBtn = document.getElementById("play-pause-btn");
const nextBtn = document.getElementById("next-btn");
const prevBtn = document.getElementById("prev-btn");
const openSpotifyBtn = document.getElementById("open-spotify-btn");
const albumArts = document.querySelectorAll(".album-art");
const trackTitle = document.getElementById("track-title");
const trackArtist = document.getElementById("track-artist");
const bars = document.querySelectorAll(".bar");

let isPlaying = true;
let equalizerInterval;

// 3. Auto-fetch the song from macOS
async function syncSpotifyData() {
  try {
    const songName = await invoke("get_track_name");
    const artistName = await invoke("get_track_artist");
    const artworkUrl = await invoke("get_track_artwork"); 
    const playerState = await invoke("get_player_state");
    
    // Print the data to the console so we can debug it
    console.log("Live Song:", songName, " | URL:", artworkUrl);
    
    if (songName && !songName.includes("execution error")) {
      trackTitle.textContent = songName;
      trackArtist.textContent = artistName;
      
      if (artworkUrl && artworkUrl.startsWith("http")) {
        // Automatically handle both <img> tags and <div> tags for all album arts
        albumArts.forEach(art => {
          if (art.tagName.toLowerCase() === 'img') {
            art.src = artworkUrl;
          } else {
            art.style.backgroundImage = `url('${artworkUrl}')`;
          }
        });
        
        // Update the ambient glow background
        const ambientGlow = document.getElementById('ambient-glow');
        if (ambientGlow) {
          ambientGlow.style.backgroundImage = `url('${artworkUrl}')`;
        }
      }

      // Sync the play/pause button state with Spotify's actual state
      const actualIsPlaying = (playerState === 'playing');
      if (isPlaying !== actualIsPlaying) {
        isPlaying = actualIsPlaying;
        playPauseBtn.textContent = isPlaying ? "⏸" : "▶"; 
        if (isPlaying) {
          albumArts.forEach(a => a.classList.remove("paused"));
        } else {
          albumArts.forEach(a => a.classList.add("paused"));
        }
        updateEqualizer();
      }
    }
  } catch (error) {
    // If Rust crashes, it will print the exact reason here in red
    console.error("CRASH REPORT:", error);
  } finally {
    // Recursively call setTimeout so we don't stack requests if they take too long
    setTimeout(syncSpotifyData, 2000);
  }
}

syncSpotifyData();

// 4. Waveform Equalizer Logic
function updateEqualizer() {
  if (isPlaying) {
    bars.forEach(bar => {
      const height = Math.random() * 16 + 4;
      bar.style.height = `${height}px`;
    });
  } else {
    bars.forEach(bar => {
      bar.style.height = "4px";
    });
  }
}

equalizerInterval = setInterval(updateEqualizer, 150);

// 5. Button Click Listeners
if (playPauseBtn) {
  playPauseBtn.addEventListener("click", () => {
    invoke("toggle_play_pause");
    
    isPlaying = !isPlaying;

    if (isPlaying) {
      playPauseBtn.textContent = "⏸"; 
      albumArts.forEach(a => a.classList.remove("paused"));
      updateEqualizer();
    } else {
      playPauseBtn.textContent = "▶"; 
      albumArts.forEach(a => a.classList.add("paused"));
      updateEqualizer();
    }
  });
}

if (nextBtn) {
  nextBtn.addEventListener("click", () => {
    invoke("next_track");
    setTimeout(syncSpotifyData, 500); 
  });
}

if (prevBtn) {
  prevBtn.addEventListener("click", () => {
    invoke("previous_track");
    setTimeout(syncSpotifyData, 500);
  });
}

if (openSpotifyBtn) {
  openSpotifyBtn.addEventListener("click", () => {
    invoke("open_spotify_app");
  });
}