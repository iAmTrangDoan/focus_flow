/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5FAF6E',
          light: '#DDF3DF',
          dark: '#4A9459',
        },
        secondary: {
          DEFAULT: '#E8F5E8',
          light: '#F4FAF4',
        },
        surface: '#FFFFFF',
        border: '#E8F5E8',
        text: {
          DEFAULT: '#243024',
          secondary: '#5F6E5F',
          muted: '#9CA3AF',
        },
        accent: {
          peach: '#FDF4F2',
          'peach-text': '#C1644C',
          blue: '#E0F2FE',
          'blue-text': '#0369A1',
          yellow: '#FEF3C7',
          'yellow-text': '#D97706',
          red: '#FEE2E2',
          'red-text': '#DC2626',
        },
      },
    },
  },
  plugins: [],
}
