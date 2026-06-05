import path from 'path'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@skribbl/shared': path.resolve(__dirname, '../shared/src/index.ts'),
      'zod': path.resolve(__dirname, '../node_modules/zod'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:6969', changeOrigin: true },
    },
    fs: {
      allow: ['..'],
    },
  },
})
