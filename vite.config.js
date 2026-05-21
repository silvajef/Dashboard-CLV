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
          // Extrai o path do query param ?p= e reescreve para /api/v2/{path}
          rewrite: path => {
            const qs = path.split('?')[1] || ''
            const p  = new URLSearchParams(qs).get('p') || ''
            return `/api/v2/${p}`
          },
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
