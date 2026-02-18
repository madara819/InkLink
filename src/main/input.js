const { mouse, keyboard, screen, Button, Key } = require("@nut-tree-fork/nut-js");

const SRC_W = 320;
const SRC_H = 240;

const MODE_OSU = "osu";
const MODE_ILLU = "illustrator";

// 3DS key masks (libctru)
const KEY_A      = 1 << 0;
const KEY_B      = 1 << 1;
const KEY_SELECT = 1 << 2;
const KEY_R      = 1 << 8;
const KEY_L      = 1 << 9;
const KEY_X      = 1 << 10;
const KEY_Y      = 1 << 11;

const isMac = process.platform === "darwin";

// ------- screen cache -------
let screenSize = null;
async function ensureScreen() {
  if (!screenSize) {
    const w = await screen.width();
    const h = await screen.height();
    screenSize = { width: w, height: h };
  }
  return screenSize;
}
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

// ------- One Euro filter -------
class LowPass {
  constructor(alpha) { this.alpha = alpha; this.s = 0; this.init = false; }
  setAlpha(a) { this.alpha = a; }
  reset() { this.init = false; }
  filter(x) {
    if (!this.init) { this.init = true; this.s = x; return x; }
    this.s = this.alpha * x + (1 - this.alpha) * this.s;
    return this.s;
  }
}
function alpha(cutoff, dt) {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}
class OneEuro {
  constructor(minCutoff, beta, dCutoff) {
    this.minCutoff = minCutoff; this.beta = beta; this.dCutoff = dCutoff;
    this.x = new LowPass(1);
    this.dx = new LowPass(1);
    this.lastTime = null;
    this.lastRaw = null;
  }
  setParams(minCutoff, beta, dCutoff) {
    this.minCutoff = minCutoff; this.beta = beta; this.dCutoff = dCutoff;
  }
  reset() { this.x.reset(); this.dx.reset(); this.lastTime = null; this.lastRaw = null; }
  filter(value, nowMs) {
    const now = nowMs / 1000;
    let dt = 1 / 120;
    if (this.lastTime !== null) dt = Math.max(1e-6, now - this.lastTime);
    this.lastTime = now;

    let dvalue = 0;
    if (this.lastRaw !== null) dvalue = (value - this.lastRaw) / dt;
    this.lastRaw = value;

    this.dx.setAlpha(alpha(this.dCutoff, dt));
    const ed = this.dx.filter(dvalue);

    const cutoff = this.minCutoff + this.beta * Math.abs(ed);

    this.x.setAlpha(alpha(cutoff, dt));
    return this.x.filter(value);
  }
}

// ------- tuning (UI controls OSU) -------
let paramsOSU = { minCutoff: 1.10, beta: 0.020, dCutoff: 1.00, deadzone: 0.55 };
let paramsILL = { minCutoff: 0.90, beta: 0.010, dCutoff: 1.00, deadzone: 0.20 };

const fx = new OneEuro(paramsOSU.minCutoff, paramsOSU.beta, paramsOSU.dCutoff);
const fy = new OneEuro(paramsOSU.minCutoff, paramsOSU.beta, paramsOSU.dCutoff);

let lastRawX = null, lastRawY = null;
function applyDeadzone(mode, x, y) {
  const dz = (mode === MODE_OSU ? paramsOSU.deadzone : paramsILL.deadzone);
  if (lastRawX === null || lastRawY === null) { lastRawX = x; lastRawY = y; return { x, y }; }
  const dist = Math.hypot(x - lastRawX, y - lastRawY);
  if (dist < dz) return { x: lastRawX, y: lastRawY };
  lastRawX = x; lastRawY = y;
  return { x, y };
}
function setFilterForMode(mode) {
  const p = mode === MODE_OSU ? paramsOSU : paramsILL;
  fx.setParams(p.minCutoff, p.beta, p.dCutoff);
  fy.setParams(p.minCutoff, p.beta, p.dCutoff);
}
function resetFilter() {
  fx.reset(); fy.reset();
  lastRawX = lastRawY = null;
}

// ------- mouse helpers -------
let leftDown = false;
async function setLeft(isDown) {
  if (isDown && !leftDown) { await mouse.pressButton(Button.LEFT); leftDown = true; }
  if (!isDown && leftDown) { await mouse.releaseButton(Button.LEFT); leftDown = false; }
}

// ------- keyboard helpers -------
async function tapUndo() {
  if (isMac) {
    await keyboard.pressKey(Key.LeftSuper, Key.Z);
    await keyboard.releaseKey(Key.Z, Key.LeftSuper);
  } else {
    await keyboard.pressKey(Key.LeftControl, Key.Z);
    await keyboard.releaseKey(Key.Z, Key.LeftControl);
  }
}
async function tapKey(k) {
  await keyboard.pressKey(k);
  await keyboard.releaseKey(k);
}
async function tapShiftE() {
  await keyboard.pressKey(Key.LeftShift, Key.E);
  await keyboard.releaseKey(Key.E, Key.LeftShift);
}

// ------- state -------
let mode = MODE_ILLU;
let lastTool = "V";
let erasing = false;

function getMode() { return mode; }
function setMode(newMode) {
  mode = newMode;
  setFilterForMode(mode);
  resetFilter();
}

function updateOsuStability(value01) {
  // 0..1 : more right = more stable (more smoothing + more deadzone)
  const v = Math.max(0, Math.min(1, Number(value01) || 0));
  paramsOSU.minCutoff = 0.85 + v * 0.95;  // 0.85..1.80
  paramsOSU.beta      = 0.010 + v * 0.045; // 0.01..0.055
  paramsOSU.deadzone  = 0.25 + v * 0.70;  // 0.25..0.95
  setFilterForMode(mode);
}

// call once at start
setFilterForMode(mode);

// ------- main packet handler -------
async function handlePacket(pkt) {
  const { x, y, touching, held, down, up } = pkt;

  // SELECT on 3DS toggles mode
  if (down & KEY_SELECT) {
    setMode(mode === MODE_OSU ? MODE_ILLU : MODE_OSU);
    erasing = false;
    await setLeft(false);
  }

  // Move cursor only while touching (3DS no real hover)
  if (touching) {
    const s = await ensureScreen();
    const dz = applyDeadzone(mode, x, y);
    const now = Date.now();
    const xf = fx.filter(dz.x, now);
    const yf = fy.filter(dz.y, now);

    const sx = clamp(Math.round(xf * (s.width / SRC_W)), 0, s.width - 1);
    const sy = clamp(Math.round(yf * (s.height / SRC_H)), 0, s.height - 1);
    await mouse.setPosition({ x: sx, y: sy });
  }

  // OSU mode: touch aim + L hold click
  if (mode === MODE_OSU) {
    const wantDown = touching && !!(held & KEY_L);
    await setLeft(wantDown);
    return;
  }

  // Illustrator mode: A/X/Y tools, R spring eraser, B undo, L click/drag
  if (down & KEY_A) { lastTool = "V"; await tapKey(Key.V); }
  if (down & KEY_X) { lastTool = "P"; await tapKey(Key.P); }
  if (down & KEY_Y) { lastTool = "B"; await tapKey(Key.B); }

  if (down & KEY_B) await tapUndo();

  if ((down & KEY_R) && !erasing) { erasing = true; await tapShiftE(); }
  if ((up & KEY_R) && erasing) {
    erasing = false;
    if (lastTool === "V") await tapKey(Key.V);
    if (lastTool === "P") await tapKey(Key.P);
    if (lastTool === "B") await tapKey(Key.B);
  }

  const wantDown = touching && !!(held & KEY_L);
  await setLeft(wantDown);
}

module.exports = {
  MODE_OSU,
  MODE_ILLU,
  getMode,
  setMode,
  updateOsuStability,
  resetFilter,
  handlePacket,
};
