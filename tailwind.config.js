/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        wordmark: ["SFT Schrifted Sans TRIAL", "Inter", "system-ui", "sans-serif"],
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        meridianRed: '#E71800',
        meridianPink: '#FF51CB',
        meridianWhite: '#F7F7F7',
        bgBlack: '#000000',
        textSecondary: 'rgba(255, 255, 255, 0.65)',
        darkGray: '#1A1A1A',
        hoverDarkGray: '#262626',
      },
    },
  },
  plugins: [],
}

