/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0a1a',
          card: '#1a1a2e',
          'card-hover': '#16213e',
        },
        accent: {
          green: '#4ade80',
          'green-hover': '#38b866',
          gold: '#ffd700',
        },
        correct: '#22c55e',
        incorrect: '#ef4444',
        'streak-fire': '#ff4500',
        'text-primary': '#e0e0e0',
        'text-secondary': '#8892b0',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.no-scrollbar': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      });
    },
  ],
};
