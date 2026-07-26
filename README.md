# KampoStay Frontend

Static site for KampoStay (student housing in Kenya).

## Local run

Serve this folder with any static server (e.g. VS Code Live Server, `npx serve .`).

API base defaults to `http://localhost:5000/api/v1`. Override with:

```html
<meta name="kampostay-api-base" content="https://your-api.example.com/api/v1">
```

## Deploy

GitHub Pages workflow is in `.github/workflows/pages.yml`. Enable **Settings → Pages → Source: GitHub Actions**.

For production, point `kampostay-api-base` at your hosted backend URL.
