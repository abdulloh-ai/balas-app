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
        primary: {
          DEFAULT: "#2F6A55",
          hover: "#245342",
        },
        warm: {
          bg: "#F5F3EE",
          border: "#E2E0D8",
          muted: "#6B7570",
          text: "#1F2A24",
        },
      },
    },
  },
  plugins: [],
};
export default config;
