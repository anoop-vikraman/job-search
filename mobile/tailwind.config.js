/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#007AFF',
        secondary: '#5856D6',
        background: '#FFFFFF',
        text: '#000000',
        textSecondary: '#8E8E93',
        lightGray: '#F2F2F7',
        danger: '#FF3B30',
        success: '#34C759',
        warning: '#FF9500',
      },
      spacing: {
        xs: 4,
        s: 8,
        m: 16,
        l: 24,
        xl: 32,
        xxl: 48,
      },
      fontSize: {
        h1: 32,
        h2: 24,
        h3: 20,
        body: 16,
        caption: 12,
      },
    },
  },
  plugins: [],
}
