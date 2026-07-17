import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        csp: {
          cyan: "#0093D3",
          navy: "#0093D3",
          light: "#FFFFFF",
        },
      },
    },
  },
  plugins: [],
};

export default config;
