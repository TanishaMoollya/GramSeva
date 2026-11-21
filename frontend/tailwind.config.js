/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          primary: '#1E3A8A',     // Bharat Government Navy
          secondary: '#D97706',   // Indian Saffron / Amber
          accent: '#059669',      // Rural Green
          surface: '#F8FAFC',     // Clean Off-white
          border: '#E2E8F0',
          dark: '#0F172A',
        }
      },
    },
  },
  plugins: [],
};
