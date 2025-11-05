/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0f0f0f',
          panel: '#1a1a1a',
          card: '#242424',
          border: '#333333',
          hover: '#2a2a2a',
        },
      },
    },
  },
  plugins: [],
};
