# AGENTS.md - Project Guidelines

## Tailwind CSS v4 Compatibility
- **DO NOT** use custom colors defined in `tailwind.config` with `@apply` or in Blade templates.
- Use standard Tailwind colors (e.g., `green-500`) instead of custom tokens.
- Avoid opacity modifiers (e.g., `bg-color/50`) on custom colors. Use `rgba()` in CSS or separate classes.
- For layout widths, prefer Tailwind utility classes (`w-36`) over CSS custom rules that might conflict with flex/grid.

## Laravel Environment (Railway/Vercel)
- Hardcode `SESSION_DRIVER`, `CACHE_STORE`, and `QUEUE_CONNECTION` to `file` or `sync` in `config/` files if no database is used.
- Never commit real API keys or `APP_KEY`; `config/` must read them from `env()` with empty-string (not real) fallbacks so a missing key cannot cause a `null` type error.

## UI/UX Design Principles
- **Consistency**: Ensure card sizes are uniform across pages.
- **Responsiveness**: Use Tailwind breakpoints (`sm:`, `md:`, `lg:`) for mobile-first design.
- **Accessibility**: Maintain high contrast and clear focus states.
- **Performance**: Optimize images (WebP/AVIF) and use lazy loading.

## Deployment Checklist
- Verify build success locally before pushing.
- Check runtime logs for errors (e.g., 500 Internal Server Error).
- Ensure all environment variables are correctly set in the deployment dashboard.
