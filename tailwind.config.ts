import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          '50': '#f0fdf4',
          '100': '#dcfce7',
          '200': '#bbf7d0',
          '300': '#86efac',
          '400': '#4ade80',
          '500': '#22c55e',
          '600': '#16a34a',
          '700': '#15803d',
          '800': '#166534',
          '900': '#14532d',
          DEFAULT: 'rgb(var(--accent))',
          foreground: '#ffffff',
        },
        background: 'rgb(var(--app-bg))',
        foreground: 'rgb(var(--text-primary))',
        card: {
          DEFAULT: 'rgb(var(--panel))',
          foreground: 'rgb(var(--text-primary))',
        },
        popover: {
          DEFAULT: 'rgb(var(--panel))',
          foreground: 'rgb(var(--text-primary))',
        },
        secondary: {
          DEFAULT: 'rgb(var(--panel-2))',
          foreground: 'rgb(var(--text-primary))',
        },
        muted: {
          DEFAULT: 'rgb(var(--panel-2))',
          foreground: 'rgb(var(--text-muted))',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent))',
          foreground: '#ffffff',
        },
        destructive: {
          DEFAULT: 'rgb(var(--danger))',
          foreground: '#ffffff',
        },
        border: 'rgb(var(--panel-border))',
        input: 'rgb(var(--panel-border))',
        ring: 'rgb(var(--accent))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      fontFamily: {
        sans: ['var(--font-outfit)', 'var(--font-manrope)', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
