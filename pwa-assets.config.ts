import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// The source SVG is already full-bleed, so no padding or white backgrounds.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#6b3fd6' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#6b3fd6' } },
  },
  images: ['public/icon.svg'],
})
