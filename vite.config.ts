import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Configuration de Vite (l'outil qui lance et construit l'application).
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
