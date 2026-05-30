import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        rail: {
          black: "#05070b",
          navy: "#071321",
          steel: "#132238",
          red: "#ef3b2d",
          amber: "#ff8a1f"
        }
      },
      boxShadow: {
        glow: "0 0 40px rgba(239, 59, 45, 0.25)"
      }
    }
  },
  plugins: []
};

export default config;
