# RECOLECTA

SvelteKit directory for donation centers supporting Venezuela's 2026 earthquake relief.

## Local development

```bash
npm install
npm run dev
```

## Required environment variables

Create `.env` locally and configure the public Supabase values used by the browser app:

```bash
PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
PUBLIC_SUPABASE_ANON_KEY="your-anon-or-publishable-key"
PUBLIC_SUPABASE_STORAGE_BUCKET="Imagenes"
```

The app expects the existing Supabase `centros` table and the `Imagenes` storage bucket.
The map picker uses Leaflet with OpenStreetMap tiles and does not require a Google Maps API key. Selected coordinates are still saved as Google Maps links.

## Vercel

Vercel builds the SvelteKit app with:

```bash
npm run build
```

Set the same public Supabase environment variables in the Vercel project settings before deploying.
