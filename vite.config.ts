import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 4175,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3005',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyRequest, request) => {
            proxyRequest.setHeader('x-office-client-address', request.socket.remoteAddress ?? '')
          })
        },
      },
    },
  },
})
