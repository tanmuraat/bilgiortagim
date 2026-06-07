import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        surface: "#141414",
        accent: {
          DEFAULT: "#E02424",
          foreground: "#F5F5F5",
        },
        foreground: "#F5F5F5",
      },
    },
  },
};

export default config;
