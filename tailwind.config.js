/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#fdf6f0", // Creamy peach background
        primary: "#ffb7b2",    // Soft pastel pink
        secondary: "#b2e2f2",  // Baby blue
        accent: "#d1e9cf",     // Soft sage green
        text: "#4a4a4a",
        muted: "#8e8e8e",
      },
      fontFamily: {
        'cute': ['"Quicksand"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
