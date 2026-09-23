const net = require('node:net');

async function ready() {
  for (let attempt = 0; attempt < 60; attempt++) {
    const connected = await new Promise(resolve => {
      const socket = net.connect(5173, '127.0.0.1');
      socket.on('connect', () => { socket.destroy(); resolve(true); });
      socket.on('error', () => resolve(false));
    });
    if (connected) process.exit(0);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  process.exit(1);
}
void ready();
