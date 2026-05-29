/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
        body: ['DM Sans', 'sans-serif'],
      },
      colors: {
        // Sistema de cores PokerMind Pro — via CSS custom properties para suporte a temas
        // Sintaxe 'rgb(var(--c-xx) / <alpha-value>)' permite usar /50, /20, etc.
        bg: {
          base:     'rgb(var(--c-bg-base)     / <alpha-value>)',
          surface:  'rgb(var(--c-bg-surface)  / <alpha-value>)',
          elevated: 'rgb(var(--c-bg-elevated) / <alpha-value>)',
          overlay:  'rgb(var(--c-bg-overlay)  / <alpha-value>)',
        },
        text: {
          primary:   'rgb(var(--c-text-primary)   / <alpha-value>)',
          secondary: 'rgb(var(--c-text-secondary) / <alpha-value>)',
          muted:     'rgb(var(--c-text-muted)     / <alpha-value>)',
          inverse:   'rgb(var(--c-text-inverse)   / <alpha-value>)',
        },
        border: {
          subtle:  'rgb(var(--c-border-subtle)  / <alpha-value>)',
          DEFAULT: 'rgb(var(--c-border-default) / <alpha-value>)',
          strong:  'rgb(var(--c-border-strong)  / <alpha-value>)',
        },
        // Cores de acento — fixas em todos os temas (identidade visual)
        accent: {
          gold: '#f5c842',
          'gold-dim': '#b8942e',
          emerald: '#00e5a0',
          'emerald-dim': '#00a873',
          crimson: '#ff3d5a',
          'crimson-dim': '#cc2040',
          blue: '#3d9bff',
          'blue-dim': '#2070cc',
          purple: '#a855f7',
        },
        // Naipes — fixos
        suit: {
          spade: '#c8d0e8',
          heart: '#ff3d5a',
          diamond: '#ff3d5a',
          club: '#c8d0e8',
        },
        // Heatmap de ranges — fixos
        range: {
          call: '#00c47a',
          raise: '#f5c842',
          fold: '#1a1a2e',
          '3bet': '#ff6b35',
          jam: '#ff3d5a',
          mixed: '#a855f7',
        },
      },
      backgroundImage: {
        'felt-texture': "radial-gradient(ellipse at center, #0d1f0d 0%, #070f07 100%)",
        'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 60%)',
        'gold-gradient': 'linear-gradient(135deg, #f5c842, #b8942e)',
        'emerald-gradient': 'linear-gradient(135deg, #00e5a0, #00a873)',
        'premium-gradient': 'linear-gradient(135deg, #f5c842 0%, #a855f7 50%, #3d9bff 100%)',
        'surface-gradient': 'linear-gradient(180deg, #14141f 0%, #0e0e1a 100%)',
      },
      boxShadow: {
        'glow-gold': '0 0 20px rgba(245, 200, 66, 0.25)',
        'glow-emerald': '0 0 20px rgba(0, 229, 160, 0.25)',
        'glow-crimson': '0 0 20px rgba(255, 61, 90, 0.25)',
        'card': '0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        'panel': '0 8px 32px rgba(0,0,0,0.5)',
      },
      borderRadius: {
        'xl2': '1rem',
        'xl3': '1.5rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
