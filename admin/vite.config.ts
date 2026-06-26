// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// import fs from 'fs';

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     port: 5173,
//     https: {
//       key: fs.readFileSync('/home/abhigyan@ho.adiance.local/Certs/vmukti.key'),
//       cert: fs.readFileSync('/home/abhigyan@ho.adiance.local/Certs/vmukti.crt'),
//     },
//     proxy: {
//       '/api': { 
//         target: 'http://localhost:4000',
//         // target: 'https://abhigyan.vmukti.com:4000',

//         changeOrigin: true,
//         secure: false // <-- Bypasses TLS translation errors
//       },
//       '/socket.io': { 
//         // target: 'https://abhigyan.vmukti.com:4000', 
//         target: 'http://localhost:4000',
//         ws: true, 
//         changeOrigin: true,
//         secure: false // <-- The magic fix for the WebSockets!
//       },
//     },
//   },
// });

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // <-- Opens Vite to your abhigyan.vmukti.com hostname
    port: 5173,
    https: {
      key: fs.readFileSync('/home/abhigyan@ho.adiance.local/Certs/vmukti.key'),
      cert: fs.readFileSync('/home/abhigyan@ho.adiance.local/Certs/vmukti.crt'),
    },
    proxy: {
      '/api': { 
        target: 'http://localhost:4000',
        // target: 'https://abhigyan.vmukti.com:4000',
        changeOrigin: true,
        secure: false // <-- Bypasses TLS translation errors
      },
      '/socket.io': { 
        // target: 'https://abhigyan.vmukti.com:4000', 
        target: 'http://localhost:4000',
        ws: true, 
        changeOrigin: true,
        secure: false // <-- The magic fix for the WebSockets!
      },
    },
  },
});