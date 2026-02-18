const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("inklink", {
  start: () => ipcRenderer.invoke("start"),
  stop: () => ipcRenderer.invoke("stop"),
  setMode: (m) => ipcRenderer.invoke("setMode", m),
  setOsuStability: (v) => ipcRenderer.invoke("setOsuStability", v),
  openExternal: (url) => ipcRenderer.invoke("openExternal", url),

  onStatus: (cb) => ipcRenderer.on("status", (_e, d) => cb(d)),
  onMode: (cb) => ipcRenderer.on("mode", (_e, d) => cb(d)),
  onPacket: (cb) => ipcRenderer.on("packet", (_e, d) => cb(d)),
});
