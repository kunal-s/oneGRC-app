/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        canvas: 'hsl(var(--canvas))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // State colors — color is used for state only, not decoration
        critical: { DEFAULT: 'hsl(var(--critical))', soft: 'hsl(var(--critical-soft))' },
        high: { DEFAULT: 'hsl(var(--high))', soft: 'hsl(var(--high-soft))' },
        medium: { DEFAULT: 'hsl(var(--medium))', soft: 'hsl(var(--medium-soft))' },
        low: { DEFAULT: 'hsl(var(--low))', soft: 'hsl(var(--low-soft))' },
        ok: { DEFAULT: 'hsl(var(--ok))', soft: 'hsl(var(--ok-soft))' },
        info: { DEFAULT: 'hsl(var(--info))', soft: 'hsl(var(--info-soft))' },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.875rem' }],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'draw': { from: { strokeDashoffset: '1000' }, to: { strokeDashoffset: '0' } },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 hsl(var(--critical) / 0.35)' },
          '70%': { boxShadow: '0 0 0 6px hsl(var(--critical) / 0)' },
          '100%': { boxShadow: '0 0 0 0 hsl(var(--critical) / 0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.35s ease-out both',
        'slide-in-right': 'slide-in-right 0.25s cubic-bezier(0.32,0.72,0,1)',
        'draw': 'draw 1.2s ease-out forwards',
        'pulse-ring': 'pulse-ring 2s infinite',
      },
    },
  },
  plugins: [],
}
