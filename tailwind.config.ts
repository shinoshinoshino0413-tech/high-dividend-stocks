import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101418",
        mist: "#eef2eb",
        pine: "#143b2c",
        moss: "#7aa37a",
        sand: "#efe1c6",
        ember: "#b85c38"
      },
      fontFamily: {
        sans: ["'Noto Sans JP'", "sans-serif"]
      },
      boxShadow: {
        panel: "0 18px 50px rgba(16, 20, 24, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
