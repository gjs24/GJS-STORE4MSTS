import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forge: {
          black: "#05070b",
          panel: "#0c1524",
          steel: "#16263d",
          rail: "#263a59",
          red: "#ef3b2d",
          amber: "#ff8a1f",
          cyan: "#39c7ff"
        }
      },
      boxShadow: {
        forge: "0 24px 70px rgba(0,0,0,.45)",
        heat: "0 0 34px rgba(239,59,45,.28)"
      }
    }
  },
  plugins: []
};

export default config;
