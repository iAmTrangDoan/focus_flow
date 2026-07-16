/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sage: {
          bg: '#F4FAF4',
          mint: '#DDF3DF',
          primary: '#5FAF6E',
          primaryDark: '#4A9459',
          primaryLight: '#EAF6EB',
        },
        forest: {
          text: '#243024',
          muted: '#5F6E5F',
          border: '#D4E8D4',
        },
      },
      borderRadius: {
        '3xl': '20px',
        '4xl': '24px',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
