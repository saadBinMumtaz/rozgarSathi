/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Semantic tokens — map to CSS custom properties for theme switching */
        'bg-primary': 'var(--color-bg-primary)',
        'surface': 'var(--color-surface)',
        'text-primary': 'var(--color-text-primary)',
        'text-muted': 'var(--color-text-muted)',
        'border-theme': 'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',
        'icon-muted': 'var(--color-icon-muted)',
        'icon-active': 'var(--color-icon-active)',
        'bg-hover': 'var(--color-bg-hover)',
        'bg-active': 'var(--color-bg-active)',
        'surface-hover': 'var(--color-surface-hover)',
        'surface-text': 'var(--color-surface-text)',
        'surface-text-muted': 'var(--color-surface-text-muted)',
        'overlay': 'var(--color-overlay)',

        /* Semantic accents */
        'success': 'var(--color-success)',
        'warning': 'var(--color-warning)',
        'danger': 'var(--color-danger)',
      },
    },
  },
  plugins: [],
}
