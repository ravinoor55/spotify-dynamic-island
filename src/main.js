// 1. Grab the button from the HTML using the ID we just created
const playPauseBtn = document.getElementById("play-pause-btn");

// 2. Keep track of the state (it starts as "playing" since our default icon is pause)
let isPlaying = true;

// 3. Listen for a click on the button
playPauseBtn.addEventListener("click", () => {
  
  // Flip the state (if true, make it false; if false, make it true)
  isPlaying = !isPlaying;

  // Change the text (emoji) inside the button based on the new state
  if (isPlaying) {
    playPauseBtn.textContent = "⏸"; // Show pause if music is playing
  } else {
    playPauseBtn.textContent = "▶"; // Show play if music is paused
  }
  
});