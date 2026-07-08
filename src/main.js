const playPauseBtn = document.getElementById("play-pause-btn");
const albumArt = document.querySelector(".album-art");
const bars = document.querySelectorAll(".bar");

let isPlaying = true;
let equalizerInterval;

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

if (playPauseBtn) {
  playPauseBtn.addEventListener("click", () => {
    isPlaying = !isPlaying;

    if (isPlaying) {
      playPauseBtn.textContent = "⏸"; 
      albumArt.classList.remove("paused");
    } else {
      playPauseBtn.textContent = "▶"; 
      albumArt.classList.add("paused");
      updateEqualizer(); 
    }
  });
}