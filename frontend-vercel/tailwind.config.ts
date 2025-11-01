import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      colors: {
        brown: {
          300: '#a78a6f',
          400: '#8b6f47',
          500: '#6b4423',
          600: '#5a3d1e',
        },
        beige: {
          300: '#f5f5dc',
          400: '#e8e8d0',
          500: '#d2d2b8',
        }
      }
    },
  },
  plugins: [],
}
export default config 
