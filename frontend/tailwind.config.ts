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
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc5fb",
          400: "#36a7f7",
          500: "#0c8de9",
          600: "#026fc7",
          700: "#0358a1",
          800: "#074b85",
          900: "#0c3f6e",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
