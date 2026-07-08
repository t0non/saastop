// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4F46E5",
        "primary-light": "#6366F1",
        "primary-dark": "#3730A3",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6",
        background: "#F7F8FA",
        surface: "#FFFFFF",
        "surface-dark": "#F3F4F6"
      },
      borderRadius: {
        sm: "0.375rem",
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem"
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.05)",
        DEFAULT: "0 1px 3px rgba(0,0,0,0.1)"
      }
    }
  },
  plugins: []
};
