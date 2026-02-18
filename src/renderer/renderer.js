const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");
const modePill = document.getElementById("modePill");
const osuBtn = document.getElementById("osuBtn");
const illuBtn = document.getElementById("illuBtn");
const readmeBtn = document.getElementById("readmeBtn");
const stability = document.getElementById("stability");
const dotWrap = document.getElementById("dotWrap");
const dot = document.getElementById("dot");

const README_URL = "https://github.com/Redkush01/InkLink#readme";

function setStatus(t) { statusEl.innerHTML = `<small>${t}</small>`; }
function setMode(m) { modePill.textContent = m; }

function guardInklink() {
  if (!window.inklink) {
    setStatus("Preload not loaded (window.inklink missing). Check preload.js / main.js.");
    return false;
  }
  return true;
}

startBtn.onclick = async () => {
  if (!guardInklink()) return;
  const r = await window.inklink.start();
  setStatus(r.msg || "Started");
};

stopBtn.onclick = async () => {
  if (!guardInklink()) return;
  const r = await window.inklink.stop();
  setStatus(r.msg || "Stopped");
};

osuBtn.onclick = async () => {
  if (!guardInklink()) return;
  await window.inklink.setMode("osu");
};

illuBtn.onclick = async () => {
  if (!guardInklink()) return;
  await window.inklink.setMode("illustrator");
};

readmeBtn.onclick = async () => {
  if (!guardInklink()) return;
  await window.inklink.openExternal(README_URL);
};

stability.oninput = async () => {
  if (!guardInklink()) return;
  await window.inklink.setOsuStability(parseFloat(stability.value));
};

if (window.inklink) {
  window.inklink.onStatus((s) => {
    setStatus(s.msg || "");
    if (typeof s.running === "boolean") {
      startBtn.disabled = s.running;
      stopBtn.disabled = !s.running;
    }
  });

  window.inklink.onMode((m) => setMode(m));

  window.inklink.onPacket((p) => {
    if (!p.touching) return;
    const r = dotWrap.getBoundingClientRect();
    dot.style.left = `${(p.x / 320) * r.width}px`;
    dot.style.top = `${(p.y / 240) * r.height}px`;
  });
} else {
  setStatus("Preload not loaded (window.inklink missing).");
}
