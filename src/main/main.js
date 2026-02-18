const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");

const { createUdpServer } = require("./udp");
const input = require("./input");

let win = null;
let udp = null;

function canSend() {
  return (
    win &&
    !win.isDestroyed() &&
    win.webContents &&
    !win.webContents.isDestroyed()
  );
}

function send(channel, payload) {
  if (!canSend()) return;
  try {
    win.webContents.send(channel, payload);
  } catch (_) {}
}

function sendStatus(obj) {
  send("status", obj);
}

function sendMode() {
  send("mode", input.getMode());
}

async function stopUdpSilently() {
  try {
    if (udp) {
      await udp.close();
      udp = null;
    }
  } catch (_) {}
}

function createWindow() {
  win = new BrowserWindow({
    width: 560,
    height: 700,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // ✅ PROD: app-prod/index.html exists in the packaged build
  // ✅ DEV:  fallback to src/renderer/index.html
  const prodHtml = path.join(__dirname, "index.html");
  const devHtml = path.join(__dirname, "../renderer/index.html");
  const htmlToLoad = fs.existsSync(prodHtml) ? prodHtml : devHtml;

  win.loadFile(htmlToLoad);

  // Optional: helps debug white-screen if it ever happens again
  win.webContents.on("did-fail-load", (_e, code, desc) => {
    console.log("❌ did-fail-load:", code, desc);
  });

  // Stop UDP ASAP when window is closing (prevents "Object has been destroyed")
  win.on("close", () => {
    stopUdpSilently();
  });

  win.on("closed", () => {
    win = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  sendMode();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("start", async () => {
  if (udp) return { ok: true, msg: "Already running" };

  udp = createUdpServer({
    port: 4545,
    onListening: () =>
      sendStatus({ running: true, msg: "Listening on UDP :4545" }),
    onError: (err) =>
      sendStatus({ running: false, msg: "UDP error: " + err.message }),
    onPacket: (pkt) => {
      // UI preview
      send("packet", { x: pkt.x, y: pkt.y, touching: pkt.touching });

      // Real input (never throw outside)
      Promise.resolve(input.handlePacket(pkt))
        .then(() => sendMode())
        .catch((e) =>
          sendStatus({ running: true, msg: "Input error: " + (e?.message || e) })
        );
    },
  });

  sendStatus({ running: true, msg: "Starting..." });
  sendMode();
  return { ok: true, msg: "Started" };
});

ipcMain.handle("stop", async () => {
  await stopUdpSilently();
  sendStatus({ running: false, msg: "Stopped" });
  return { ok: true, msg: "Stopped" };
});

ipcMain.handle("setMode", async (_e, m) => {
  if (m === input.MODE_OSU || m === input.MODE_ILLU) {
    input.setMode(m);
    sendMode();
    sendStatus({ running: !!udp, msg: "Mode: " + m });
    return { ok: true };
  }
  return { ok: false, msg: "Invalid mode" };
});

ipcMain.handle("setOsuStability", async (_e, value01) => {
  input.updateOsuStability(value01);
  return { ok: true };
});

ipcMain.handle("openExternal", async (_e, url) => {
  if (typeof url === "string" && url.startsWith("https://")) {
    await shell.openExternal(url);
    return { ok: true };
  }
  return { ok: false };
});
