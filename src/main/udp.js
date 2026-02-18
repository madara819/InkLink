const dgram = require("dgram");

function createUdpServer({ port, onPacket, onError, onListening }) {
  const sock = dgram.createSocket("udp4");

  sock.on("error", (err) => onError?.(err));
  sock.on("listening", () => onListening?.());
  sock.on("message", (msg) => {
    const txt = msg.toString().trim();
    const p = txt.split(/\s+/);
    if (p.length < 6) return;

    const x = Number(p[0]);
    const y = Number(p[1]);
    const touching = Number(p[2]) === 1;
    const held = (parseInt(p[3], 16) >>> 0);
    const down = (parseInt(p[4], 16) >>> 0);
    const up   = (parseInt(p[5], 16) >>> 0);

    if (Number.isFinite(x) && Number.isFinite(y)) {
      onPacket?.({ x, y, touching, held, down, up });
    }
  });

  sock.bind(port);
  return { close: () => new Promise((res) => sock.close(res)) };
}

module.exports = { createUdpServer };
