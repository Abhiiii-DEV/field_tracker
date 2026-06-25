import { io, Socket } from 'socket.io-client';
import { API_BASE, tokens } from '../api/client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(API_BASE || '/', {
    auth: { token: tokens.access },
    transports: ['websocket'],
    autoConnect: true,
  });
  // Keep auth fresh if the token rotates.
  socket.on('connect_error', () => {
    if (socket) socket.auth = { token: tokens.access };
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
