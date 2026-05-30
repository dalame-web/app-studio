/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      animation: {
        'confeti-1': 'caer1 1.2s ease-in forwards',
        'confeti-2': 'caer2 1.4s ease-in forwards',
        'confeti-3': 'caer3 1.1s ease-in forwards',
        'aparecer': 'aparecer 0.3s ease-out',
        'insignia': 'insignia 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        // G8: shake suave en lugar de borde rojo
        'shake': 'shake 0.45s ease-in-out',
        'correcto-flash': 'correctoFlash 0.5s ease-out',
      },
      keyframes: {
        caer1: {
          '0%': { transform: 'translateY(-10px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
        caer2: {
          '0%': { transform: 'translateY(-10px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(-540deg)', opacity: '0' },
        },
        caer3: {
          '0%': { transform: 'translateY(-10px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(360deg)', opacity: '0' },
        },
        // G8
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '15%': { transform: 'translateX(-7px)' },
          '35%': { transform: 'translateX(7px)' },
          '55%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
          '90%': { transform: 'translateX(-2px)' },
        },
        correctoFlash: {
          '0%': { backgroundColor: 'rgba(134,239,172,0.4)' },
          '100%': { backgroundColor: 'transparent' },
        },
        aparecer: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        insignia: {
          '0%': { transform: 'scale(0) rotate(-15deg)', opacity: '0' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

