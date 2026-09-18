/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette officielle de la marque Discord.
        discord: {
          blurple: "#5865F2",
          "blurple-dark": "#4752C4",
          green: "#57F287",
          yellow: "#FEE75C",
          fuchsia: "#EB459E",
          red: "#ED4245",
        },
      },
      keyframes: {
        "discord-float": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(0, 14px, 0) scale(1.08)" },
        },
        "discord-wiggle": {
          "0%, 100%": { transform: "rotate(-4deg)" },
          "50%": { transform: "rotate(4deg)" },
        },
      },
      animation: {
        "discord-float": "discord-float 9s ease-in-out infinite",
        "discord-float-slow": "discord-float 13s ease-in-out infinite reverse",
        "discord-wiggle": "discord-wiggle 3.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
