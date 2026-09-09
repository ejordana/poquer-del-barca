import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        barca: {
          blue: "#004D98",
          "blue-dark": "#002855",
          "blue-light": "#1A66B8",
          red: "#A50044",
          "red-dark": "#70002E",
          "red-light": "#C91A5B",
          yellow: "#EDBB00",
          gold: "#FFD700",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
