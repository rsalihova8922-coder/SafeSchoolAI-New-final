# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Reconstructed export
This repository was reconstructed from the Lovable download so the original `src/` directory layout and `@/` imports work again. The original environment values are intentionally not committed; copy `.env.example` to `.env` and fill in your Supabase publishable configuration when needed.

Survey/dashboard data continues to use the existing SafeSchool Render/FastAPI API configured in `src/lib/safeschool.ts`. Student support actions currently use Supabase via `src/lib/support-case.ts`.
