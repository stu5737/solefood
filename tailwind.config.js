/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // 賽博工業風配色
        'cyber-cyan': '#06B6D4',
        'cyber-amber': '#F59E0B',
        'cyber-red': '#EF4444',
        'cyber-slate': '#0F172A',
        'cyber-dark': '#1A1A1A',
      },
    },
  },
  plugins: [],
}
