/** @type {import('tailwindcss').Config} */
const tokens = require("../packages/theme/tailwind-tokens.js");

module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // Follow the OS light/dark setting automatically (NativeWind reads useColorScheme).
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        ...tokens.colors,
        // Backwards-compatible aliases for existing class usages.
        secondary: "#5856D6",
        lightGray: tokens.colors.surfaceMuted,
        danger: tokens.colors.dangerFg,
        success: tokens.colors.successFg,
        warning: tokens.colors.pendingFg,
      },
      spacing: tokens.spacing,
      borderRadius: tokens.borderRadius,
      fontSize: tokens.fontSize,
    },
  },
  plugins: [],
};
