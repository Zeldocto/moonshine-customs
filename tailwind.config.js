/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: '#FBF2E2',
        sandDeep: '#F3E4C9',
        shell: '#FFFFFF',
        ink: '#14323C',
        inkSoft: '#4E6E79',
        lagoon: '#0FA3B1',
        lagoonDeep: '#0A6C77',
        shine: '#FFC53D',
        goop: '#6B3FA0',
        coral: '#EF5F3C',
      },
      fontFamily: {
        display: ['"Baloo 2"', 'system-ui', 'sans-serif'],
        body: ['Rubik', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 0 #E7D8BB, 0 10px 24px -18px rgba(20,50,60,.55)',
        lift: '0 2px 0 0 #E7D8BB, 0 18px 34px -20px rgba(20,50,60,.6)',
      },
      borderRadius: {
        chip: '14px',
      },
    },
  },
  plugins: [],
}
