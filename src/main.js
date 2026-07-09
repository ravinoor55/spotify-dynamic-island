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
    const stateStr = await invoke("get_spotify_state");
    
    if (stateStr !== "not_running" && stateStr !== "error") {
      const parts = stateStr.split("|||");
      if (parts.length === 4) {
        const songName = parts[0];
        const artistName = parts[1];
        const artworkUrl = parts[2];
        const playerState = parts[3];

        // Print the data to the console so we can debug it
        console.log("Live Song:", songName, " | URL:", artworkUrl);
        
        trackTitle.textContent = songName;
        trackArtist.textContent = artistName;
        
        if (artworkUrl && artworkUrl.startsWith("http")) {
          // Check if the song has changed to avoid redundant work
          if (window.lastArtworkUrl !== artworkUrl) {
            window.lastArtworkUrl = artworkUrl;
            
            albumArts.forEach(art => {
              if (art.tagName.toLowerCase() === 'img') {
                art.src = artworkUrl;
              } else {
                art.style.backgroundImage = `url('${artworkUrl}')`;
              }
            });
            
            // Extract dominant color from album art
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = artworkUrl;
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);
              
              try {
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imgData.data;
                let r = 0, g = 0, b = 0, count = 0;
                
                // Sample every 10th pixel for speed
                for (let i = 0; i < data.length; i += 40) {
                  r += data[i];
                  g += data[i+1];
                  b += data[i+2];
                  count++;
                }
                
                r = Math.floor(r / count);
                g = Math.floor(g / count);
                b = Math.floor(b / count);
                
                // Apply a subtle gradient using the extracted color
                const island = document.querySelector('.dynamic-island');
                island.style.background = `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.3) 0%, rgba(0,0,0,1) 70%)`;
                
                // Also update the ambient glow if the user wants it back later
                const ambientGlow = document.getElementById('ambient-glow');
                if (ambientGlow) {
                  ambientGlow.style.backgroundImage = `url('${artworkUrl}')`;
                }
              } catch(e) {
                console.error("CORS issue extracting color:", e);
              }
            };
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