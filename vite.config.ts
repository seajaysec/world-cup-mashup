/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `base` must match the GitHub Pages sub-path (https://<user>.github.io/world-cup-mashup/).
// Override with BASE_PATH=/ for local previews served from the domain root.
const base = process.env.BASE_PATH ?? '/world-cup-mashup/'

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
})
