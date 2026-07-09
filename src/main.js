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
const progressContainer = document.getElementById("progress-container");
const loopBtn = document.getElementById("loop-btn");
const likeBtn = document.getElementById("like-btn");

let isPlaying = true;
let isLooping = false;
let equalizerInterval;
let currentProgressSec = 0;
let totalDurationSec = 0;
let currentLyrics = [];
let currentLyricIndex = -1;

// 3. Auto-fetch the song from macOS
async function syncSpotifyData() {
  try {
    const stateStr = await invoke("get_spotify_state");
    
    if (stateStr !== "not_running" && stateStr !== "error") {
      const parts = stateStr.split("|||");
      if (parts.length >= 4) {
        const songName = parts[0];
        const artistName = parts[1];
        const artworkUrl = parts[2];
        const playerState = parts[3];
        
        currentProgressSec = parts.length > 4 ? parseInt(parts[4]) : 0;
        totalDurationSec = parts.length > 5 ? Math.floor(parseInt(parts[5]) / 1000) : 0;
        
        if (parts.length > 6) {
          isLooping = (parts[6] === "true");
          if (loopBtn) {
            loopBtn.style.color = isLooping ? "#1db954" : "white";
          }
        }

        // Print the data to the console so we can debug it
        console.log("Live Song:", songName, " | URL:", artworkUrl);
        
        trackTitle.textContent = songName;
        trackArtist.textContent = artistName;
        
        if (artworkUrl && artworkUrl.startsWith("http")) {
          // Check if the song has changed to avoid redundant work
          if (window.lastArtworkUrl !== artworkUrl) {
            window.lastArtworkUrl = artworkUrl;
            
            // 1. Reset and Fetch Lyrics
            currentLyrics = [];
            currentLyricIndex = -1;
            const lyricsTicker = document.getElementById("lyrics-ticker");
            if (lyricsTicker) lyricsTicker.textContent = "";

            const searchArtist = encodeURIComponent(artistName);
            const searchTrack = encodeURIComponent(songName);
            
            fetch(`https://lrclib.net/api/get?track_name=${searchTrack}&artist_name=${searchArtist}`)
              .then(res => res.json())
              .then(data => {
                if (data && data.syncedLyrics) {
                  // Parse LRC format: [mm:ss.xx] text
                  const lines = data.syncedLyrics.split('\n');
                  currentLyrics = lines.map(line => {
                    // Match [mm:ss.xx] or [mm:ss]
                    const match = line.match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
                    if (match) {
                      const mins = parseInt(match[1]);
                      const secs = parseFloat(match[2]);
                      return {
                        time: mins * 60 + secs,
                        text: match[3].trim()
                      };
                    }
                    return null;
                  }).filter(Boolean);
                } else if (data && data.plainLyrics) {
                  if (lyricsTicker) lyricsTicker.textContent = "♫ (Lyrics not synced)";
                } else {
                  if (lyricsTicker) lyricsTicker.textContent = "♫ (No lyrics found)";
                }
              })
              .catch(err => console.error("Lyrics fetch error:", err));
            
            // 2. Update Album Art
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
                
                // Pass the extracted color to CSS via variables
                const island = document.querySelector('.dynamic-island');
                island.style.background = ''; // clear any old inline background
                island.style.setProperty('--dominant-r', r);
                island.style.setProperty('--dominant-g', g);
                island.style.setProperty('--dominant-b', b);
                
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

// 4. Waveform Equalizer & Progress Bar Logic
function updateEqualizer() {
  // Update compact view equalizer (if it still exists)
  if (bars.length > 0) {
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

  // Update real progress bar
  if (isPlaying && currentProgressSec < totalDurationSec) {
    currentProgressSec += 0.15; // 150ms interval = 0.15s
  }
  
  const fill = document.getElementById("progress-fill");
  if (fill && totalDurationSec > 0) {
    const percent = (currentProgressSec / totalDurationSec) * 100;
    fill.style.width = `${Math.min(Math.max(percent, 0), 100)}%`;
  }
  
  // Update Lyrics Ticker
  if (currentLyrics.length > 0) {
    let activeIndex = -1;
    for (let i = 0; i < currentLyrics.length; i++) {
      if (currentProgressSec >= currentLyrics[i].time) {
        activeIndex = i;
      } else {
        break; // Lyrics are sorted chronologically
      }
    }
    
    if (activeIndex !== currentLyricIndex) {
      currentLyricIndex = activeIndex;
      const lyricsTicker = document.getElementById("lyrics-ticker");
      if (lyricsTicker) {
        if (activeIndex >= 0) {
          lyricsTicker.textContent = currentLyrics[activeIndex].text || "♫";
        } else {
          // If we are before the very first lyric line
          lyricsTicker.textContent = "♫";
        }
      }
    }
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

// 6. Progress Bar Seeking
if (progressContainer) {
  progressContainer.addEventListener("click", (e) => {
    if (totalDurationSec <= 0) return;
    
    // Get click position relative to the container
    const rect = progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    
    // Calculate new position
    const newPositionSec = percentage * totalDurationSec;
    
    // Instantly update UI for immediate feedback
    currentProgressSec = newPositionSec;
    const fill = document.getElementById("progress-fill");
    if (fill) {
      fill.style.width = `${Math.min(Math.max(percentage * 100, 0), 100)}%`;
    }
    
    // Tell Rust to seek in Spotify
    invoke("seek_track", { position: newPositionSec });
  });
}

if (loopBtn) {
  loopBtn.addEventListener("click", () => {
    isLooping = !isLooping;
    loopBtn.style.color = isLooping ? "#1db954" : "white";
    invoke("toggle_loop");
  });
}

if (likeBtn) {
  likeBtn.addEventListener("click", () => {
    // Just toggle locally since AppleScript doesn't support 'Like' natively
    const svg = likeBtn.querySelector('svg');
    if (svg) {
      const isLiked = svg.getAttribute('fill') === 'currentColor';
      if (isLiked) {
        svg.setAttribute('fill', 'none');
        likeBtn.style.color = 'white';
      } else {
        svg.setAttribute('fill', 'currentColor');
        likeBtn.style.color = '#1db954';
      }
    }
  });
}