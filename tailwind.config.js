/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#182332',
        primary: '#c7b079',
        secondary: '#232d3c',
        accent: '#233c58',
      },
    },
  },
  plugins: [],
}

