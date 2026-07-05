# Real Earth Simulation Setup Deployment Guide

This guide covers deploying Real Earth Simulation Setup to three popular static hosting platforms: **Vercel**, **Netlify**, and **GitHub Pages**.

> Real Earth Simulation Setup is a client-side single-page application (SPA) built with Vite, React, TypeScript, and PixiJS. It requires no server-side runtime and can be deployed as a static bundle.

---

## Prerequisites

- Node.js ≥ 20
- npm ≥ 10 (or pnpm ≥ 8)
- A Git repository with the Real Earth Simulation Setup source code pushed

### Local Build Test

Before deploying, verify the build works locally:

```bash
npm install
npm run build
# or with pnpm
pnpm install
pnpm run build
```

The production bundle will be output to the `dist/` directory.

---

## 1. Vercel

[Vercel](https://vercel.com) is the fastest way to deploy a Vite + React application with automatic preview deployments.

### Step 1: Import Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository (GitHub, GitLab, or Bitbucket)
3. Vercel will auto-detect the **Vite** framework preset

### Step 2: Configure Build Settings

Vercel usually auto-detects Vite. If not, set these manually:

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

### Step 3: Environment Variables (if any)

Real Earth Simulation Setup does not require backend API keys for core functionality. If you add Supabase or other integrations later, add environment variables in **Project Settings → Environment Variables**.

### Step 4: Deploy

Click **Deploy**. Vercel will build and deploy your app. Every push to the main branch triggers an automatic redeployment.

### SPA Routing (404 Fix)

Vercel handles SPA routing automatically. No additional configuration is needed — `react-router` will work out of the box.

### Custom Domain

Go to **Project Settings → Domains** and add your custom domain. Vercel provides free SSL certificates automatically.

---

## 2. Netlify

[Netlify](https://netlify.com) offers drag-and-drop deploys, branch previews, and generous free-tier bandwidth.

### Method A: Git-based Deploy (Recommended)

1. Go to [app.netlify.com/start](https://app.netlify.com/start)
2. Select **GitHub** (or GitLab/Bitbucket)
3. Authorize Netlify and select your Real Earth Simulation Setup repository
4. Netlify auto-detects Vite settings

### Method B: Manual Deploy (Drag & Drop)

1. Build locally:
   ```bash
   npm run build
   ```
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Drag the `dist/` folder onto the drop zone

### Build Settings

If Netlify does not auto-detect, configure these manually:

| Setting | Value |
|---------|-------|
| Build Command | `npm run build` |
| Publish Directory | `dist` |
| Node Version | `20` (set in environment variables) |

### SPA Routing (Redirect Rules)

Create a `public/_redirects` file (or `netlify.toml`) to handle client-side routing:

**`public/_redirects`**:
```
/*    /index.html   200
```

**Or `netlify.toml`** at project root:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Custom Domain

Go to **Site Settings → Domain Management** → add your custom domain. Netlify provisions SSL automatically.

---

## 3. GitHub Pages

[GitHub Pages](https://pages.github.com) is free for public repositories and integrates directly with your Git workflow.

### Step 1: Update `vite.config.ts`

Add the `base` option to match your repository name:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/your-repo-name/',  // <-- IMPORTANT: match your repository name
  // Example: base: '/evosphere/',
});
```

If deploying to a custom domain (not `username.github.io/repo-name`), set `base: '/'`.

### Step 2: Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```

### Step 3: Enable GitHub Pages

1. Go to **Settings → Pages** in your GitHub repository
2. Under **Build and deployment**:
   - Source: **GitHub Actions**
3. Push the workflow file to the `main` branch
4. The workflow will run automatically and deploy to `https://username.github.io/your-repo-name/`

### SPA Routing (404 Fix)

GitHub Pages does not natively support SPA routing. Add a `404.html` trick:

Create `public/404.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script>
    sessionStorage.redirect = location.href;
  </script>
  <meta http-equiv="refresh" content="0;URL='/'">
</head>
<body></body>
</html>
```

Then add this snippet to the top of `index.html` (inside `<head>`), before the main script tag:
```html
<script>
  (function() {
    var redirect = sessionStorage.redirect;
    delete sessionStorage.redirect;
    if (redirect && redirect !== location.href) {
      history.replaceState(null, null, redirect);
    }
  })();
</script>
```

This captures the original URL on 404, redirects to `/`, and then restores the original route client-side.

### Custom Domain

1. Go to **Settings → Pages → Custom domain**
2. Enter your domain (e.g., `evosphere.app`)
3. Add the DNS records GitHub provides (A records + CNAME)
4. GitHub automatically provisions an SSL certificate

---

## Platform Comparison

| Feature | Vercel | Netlify | GitHub Pages |
|---------|--------|---------|--------------|
| **Cost** | Free tier | Free tier | Free (public repos) |
| **SPA Routing** | Native | Requires `_redirects` | Requires `404.html` workaround |
| **Preview Deployments** | Per-branch | Per-branch | None (manual) |
| **Custom Domain** | ✅ Free SSL | ✅ Free SSL | ✅ Free SSL |
| **Build CI/CD** | ✅ Built-in | ✅ Built-in | ✅ GitHub Actions |
| **Analytics** | ✅ Built-in | ✅ Built-in | ❌ None |
| **Best For** | Fast iteration | Simple drag-and-drop | Open-source projects |

---

## Troubleshooting

### Blank page after deploy
- Check browser console for 404 errors on JS/CSS chunks
- Verify `base` path in `vite.config.ts` matches your deployment URL
- Ensure `dist/` contains `index.html` and asset files

### PixiJS canvas not rendering
- PixiJS requires WebGL. Some CI build environments may have issues. The build is client-side only, so this should not affect deployment.
- Check that `dist/` contains all static assets from `public/`

### Routing returns 404 on refresh
- See SPA Routing sections above for each platform
- Vercel handles this automatically; Netlify and GitHub Pages need configuration

### Build fails in CI
- Ensure Node.js version is ≥ 20
- If using pnpm, set the install command accordingly in CI config
- Check that `npm ci` or `pnpm install --frozen-lockfile` succeeds

---

## Environment Variables Reference

Real Earth Simulation Setup currently uses these environment variables (all optional for basic deployment):

| Variable | Purpose | Required? |
|----------|---------|-----------|
| `VITE_APP_ID` | Application identifier | No (has default) |
| `VITE_SUPABASE_URL` | Supabase project URL | Only if using auth |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Only if using auth |

For public GitHub repositories, never commit real API keys. Use your hosting platform's environment variable injection instead.

---

*Ready to share Real Earth Simulation Setup with the world? Pick a platform above and deploy in minutes.*
