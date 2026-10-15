import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Security headers plugin for dev server
function securityHeaders() {
  return {
    name: 'security-headers',
    configureServer(server) {
      server.middlewares.use((_, res, next) => {
        res.setHeader('X-Frame-Options', 'DENY')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('X-XSS-Protection', '1; mode=block')
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
        res.setHeader('Content-Security-Policy', [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "img-src 'self' https://image.tmdb.org https://*.fontsource.org data:",
          "font-src 'self' https://fonts.gstatic.com data:",
          // image.tmdb.org must be in connect-src, not just img-src. Chrome
          // refuses the img request outright (net::ERR_FAILED, no response)
          // when the host is missing here, and the service worker's own
          // fetch() for posters is a connect-src request by definition.
          // Omitting it killed every poster on every page.
          "connect-src 'self' https://api.themoviedb.org https://image.tmdb.org",
          "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
          "media-src 'self' https://*.tmdb.org",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
        ].join('; '))
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), securityHeaders()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-motion': ['motion'],
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    chunkSizeWarningLimit: 500,
    cssCodeSplit: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
  },
})