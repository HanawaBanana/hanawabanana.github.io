import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#161616",
        paper: "#f3efe3",
        bone: "#fbf7ec",
        coal: "#20231e",
        brass: "#a87332",
        cinnabar: "#bc442d",
        malachite: "#0f6b57",
        smoke: "#ded7c6",
        graphite: "#4d5149"
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"]
      },
      boxShadow: {
        ledger: "0 20px 80px rgba(32, 35, 30, 0.14)",
        insetLine: "inset 0 0 0 1px rgba(22, 22, 22, 0.12)"
      },
      animation: {
        "rise-in": "riseIn 720ms cubic-bezier(.19,1,.22,1) both",
        "ticker": "ticker 28s linear infinite"
      },
      keyframes: {
        riseIn: {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        ticker: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
