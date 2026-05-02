# Static Web App + Functions

Hosts `web/` (Next.js) on SWA. Brain calls are proxied to Container Apps / App Service.

## Steps

1. Deploy brain first (Container Apps or App Service). Note the FQDN.
2. Replace `REPLACE_BRAIN_FQDN` in `staticwebapp.config.json` with that FQDN.
3. Copy `staticwebapp.config.json` into `web/public/` so SWA picks it up at build.
4. Create the SWA:

```bash
az staticwebapp create \
  -n disha-swa -g disha-rg -l eastus2 \
  --source https://github.com/<owner>/<repo> \
  --branch main \
  --app-location web \
  --output-location .next \
  --login-with-github
```

Auth uses built-in AAD via `/.auth/login/aad`. RBAC roles assigned in SWA portal.

## Why proxy through SWA

- Single origin, no CORS plumbing in `web/`.
- Auth headers forwarded automatically.
- Brain stays internal-only if you set its ingress to `internal: true` later.
