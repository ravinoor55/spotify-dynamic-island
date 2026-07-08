const playPauseBtn = document.getElementById("play-pause-btn");
const albumArt = document.querySelector(".album-art");

let isPlaying = true;

if (playPauseBtn) {
  playPauseBtn.addEventListener("click", () => {
    isPlaying = !isPlaying;

    if (isPlaying) {
      playPauseBtn.textContent = "⏸"; 
      albumArt.classList.remove("paused");
    } else {
      playPauseBtn.textContent = "▶"; 
      albumArt.classList.add("paused");
    }
  });
}