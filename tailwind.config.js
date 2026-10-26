/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/dashboard/views/**/*.ejs',
    './src/dashboard/public/js/**/*.js',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        discord: {
          blurple: '#5865F2',
          dark: '#23272A',
          darker: '#1E2124',
          darkest: '#181A1C',
          greyple: '#99AAB5',
          white: '#FFFFFF',
          green: '#3BA55C',
          yellow: '#FAA61A',
          red: '#ED4245',
          black: '#000000',
        },
        stellar: {
          navy: '#0D1117',
          'navy-light': '#161B22',
          'blurple-glow': '#5865F2',
          'star-gold': '#FFD700',
          'nebula-purple': '#6B46C1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(88, 101, 242, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(88, 101, 242, 0.6)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      backgroundImage: {
        'starfield': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      boxShadow: {
        'glow-blurple': '0 0 20px rgba(88, 101, 242, 0.4)',
        'glow-blurple-lg': '0 0 40px rgba(88, 101, 242, 0.5)',
        'inner-glow': 'inset 0 0 20px rgba(88, 101, 242, 0.1)',
      },
    },
  },
  plugins: [],
};