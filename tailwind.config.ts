import type { Config } from "tailwindcss";

// Farben und Schrift aus dem CSP-Solutions-Stil (Skills csp-dokumente / csp-grafiken, stil.md).
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        csp: {
          ink: "#141413",
          text: "#35332f",
          grau: "#55534e",
          "grau-titel": "#9c9993",
          linie: "#dcd9d2",
          sand: "#EDEBE6",
          hell: "#f7f6f3",
          rot: "#D5362F",
          gelb: "#FFAE01",
          gruen: "#00C61C",
          blau: "#0093D3",
        },
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "Segoe UI", "sans-serif"],
      },
      letterSpacing: {
        titel: "-0.045em",
      },
    },
  },
  plugins: [],
};

export default config;
