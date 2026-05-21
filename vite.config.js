import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    resolve: {
      alias: { '@': '/src' }
    },
    server: {
      proxy: {
        '/api/fipe': {
          target: 'https://fipe.parallelum.com.br',
          changeOrigin: true,
          secure: true,
          rewrite: path => path.replace(/^\/api\/fipe/, '/api/v2'),
          configure: proxy => {
            proxy.on('proxyReq', proxyReq => {
              proxyReq.setHeader('X-Subscription-Token', env.FIPE_TOKEN || '')
            })
          },
        },
      },
    },
  }
})
