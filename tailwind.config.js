/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Deep ink-blue with soft light behind it; colour only where it means something.
      colors: {
        navy: "#060b14",
        panel: "#0c1524",
        panel2: "#101d30",
        line: "rgba(255,255,255,0.08)",
        line2: "rgba(255,255,255,0.14)",
        ink: "#e2eaf4",
        dim: "#8da3be",
        ghost: "#56708f",
        pass: "#00d68f",
        block: "#ff4d6a",
        hold: "#f5a623",
        info: "#4ea8de",
        admin: "#b197fc",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ['"IBM Plex Mono"', '"Courier New"', "monospace"],
      },
    },
  },
  plugins: [],
};
