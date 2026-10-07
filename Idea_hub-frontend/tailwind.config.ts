import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    screens: {
      xs: '375px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        brand: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0F766E',
          DEFAULT: '#0F766E',
          700: '#0D9488',
          800: '#115E59',
          900: '#134E4A',
        },
        accent: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          DEFAULT: '#0F766E',
          600: '#0D9488',
          700: '#115E59',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
          overlay: 'var(--color-surface-overlay)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover':
          '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        modal: '0 20px 60px rgba(0,0,0,0.12)',
        dropdown: '0 8px 30px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        card: '16px',
        btn: '9999px',
        pill: '9999px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16,1,0.3,1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1)',
        'heart-beat': 'heartBeat 0.4s cubic-bezier(0.36,0.07,0.19,0.97)',
        'float-up': 'floatUp 0.6s ease-out forwards',
        skeleton: 'skeleton 1.5s ease-in-out infinite',
        'spin-once': 'spinOnce 0.3s ease-in-out',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.36,0.07,0.19,0.97)',
        'ring-pulse': 'ringPulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'story-spin': 'storySpin 3s linear infinite',
        'badge-pop': 'badgePop 0.35s ease-out',
        'post-enter': 'postEnter 0.45s ease-out both',
        'landing-fade-up': 'landingFadeUp 0.65s cubic-bezier(0.16,1,0.3,1) both',
        'landing-float': 'landingFloat 8s ease-in-out infinite',
        'landing-shimmer': 'landingShimmer 12s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        heartBeat: {
          '0%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.3)' },
          '50%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
        floatUp: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-30px)' },
        },
        skeleton: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        spinOnce: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '60%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        ringPulse: {
          '0%,100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.1)' },
        },
        storySpin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        badgePop: {
          '0%': { transform: 'scale(0.6)' },
          '70%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        postEnter: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        landingFadeUp: {
          '0%': { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        landingFloat: {
          '0%,100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-12px) scale(1.02)' },
        },
        landingShimmer: {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [typography],
} satisfies Config;

export default config;
