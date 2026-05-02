# Azure Deployment

Four parallel paths. Pick what fits. All additive — nothing here changes app code.

| Path | What it runs | Use when |
|------|--------------|----------|
| `containerapps/` | `disha-web` + `disha-brain` from GHCR | Default. Cheapest, autoscale to zero. |
| `aks/` | Same images on Kubernetes | You already have AKS / need full k8s. |
| `staticwebapp/` | Next.js (`web/`) on SWA, brain via proxy | Public web only, brain elsewhere. |
| `appservice/` | Brain FastAPI on App Service | Long-lived FastAPI, no containers. |

Foundry (Claude via Azure) wiring: see `foundry/README.md`. Just env vars — no code changes.

## Prereqs

```bash
az login
az account set --subscription <SUB_ID>
az group create -n disha-rg -l eastus
```

GHCR images already exist (built by `.github/workflows/release.yml`):
- `ghcr.io/<owner>/disha-web:latest`
- `ghcr.io/<owner>/disha-brain:latest`

## Quickstart — Container Apps (recommended)

```bash
cd infra/azure
cp parameters.example.json parameters.json   # edit owner, secrets
az deployment group create \
  -g disha-rg \
  -f containerapps/main.bicep \
  -p @parameters.json
```

Outputs: `webUrl`, `brainUrl`. Web auto-points at brain via `DISHA_BRAIN_URL`.

## Static Web Apps + Functions

```bash
az staticwebapp create -n disha-swa -g disha-rg -l eastus2 \
  --source https://github.com/<owner>/<repo> \
  --branch main --app-location web --output-location .next \
  --login-with-github
```

`staticwebapp/staticwebapp.config.json` proxies `/api/brain/*` to the brain URL.

## App Service (brain only)

```bash
az deployment group create -g disha-rg \
  -f appservice/brain.bicep -p @parameters.json
```

## Don't break anything

- No existing files are modified by any deploy here.
- `.env.example` keeps the additive Azure block at the bottom — local dev unchanged.
- All bicep is parameterized; no hardcoded subscription / tenant.
- Container Apps scale-to-zero keeps idle cost ~$0.
