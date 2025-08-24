/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf6f4',
          100: '#fbeae6',
          200: '#f7d4cb',
          300: '#f0b5a3',
          400: '#e88a70',
          500: '#bb5a38',
          600: '#a04d30',
          700: '#854027',
          800: '#6d3521',
          900: '#5a2f1f',
          950: '#31170d',
        },
        background: {
          DEFAULT: '#f4f3ed',
          secondary: '#ecebe3',
          sidebar: '#e8e7dd',
          'sidebar-secondary': '#ecebe3',
        },
        text: {
          DEFAULT: '#3d3a2a',
          secondary: '#5a5647',
          muted: '#8a8572',
        },
        border: {
          DEFAULT: '#d3d2ca',
        },
        code: {
          background: '#ecebe4',
        },
      },
      fontFamily: {
        sans: ['Styrene B', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'base': '0.6rem',
        'sm': 'calc(0.6rem * 0.7)',
        'md': '0.6rem',
        'lg': 'calc(0.6rem * 1.5)',
        'xl': 'calc(0.6rem * 2.5)',
      },
      boxShadow: {
        'light': '0 1px 3px rgba(61, 58, 42, 0.1)',
        'medium': '0 2px 8px rgba(61, 58, 42, 0.1)',
        'heavy': '0 4px 16px rgba(61, 58, 42, 0.15)',
      },
      animation: {
        'slide-in': 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'modal-slide-in': 'modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'typing-bounce': 'typingBounce 1.4s infinite',
        'pulse-recording': 'pulse 1.5s infinite',
        'toast-show': 'toastShow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        modalSlideIn: {
          '0%': { opacity: '0', transform: 'scale(0.9) translateY(-20px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        typingBounce: {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-6px)' },
        },
        pulse: {
          '0%': { boxShadow: '0 0 0 0 rgba(212, 70, 70, 0.7)' },
          '70%': { boxShadow: '0 0 0 10px rgba(212, 70, 70, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(212, 70, 70, 0)' },
        },
        toastShow: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
  darkMode: 'media',
}