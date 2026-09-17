/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1B2A41',
        paper: '#F7F5F0',
        gold: '#A97D2E',
        goldDeep: '#8A6420',
      },
    },
  },
  plugins: [],
};
