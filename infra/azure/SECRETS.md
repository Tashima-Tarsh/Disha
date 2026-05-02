# GitHub Secrets required for azure-deploy.yml

Add these in GitHub → Settings → Secrets and variables → Actions.

| Secret | What it is |
|--------|-----------|
| `AZURE_CLIENT_ID` | App registration client ID (OIDC) |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Target subscription ID |
| `ANTHROPIC_API_KEY` | Direct Anthropic key (fallback) |
| `ANTHROPIC_FOUNDRY_ENDPOINT` | Azure Foundry endpoint (optional) |
| `GHCR_READ_TOKEN` | PAT with `read:packages` (leave empty if GHCR repo is public) |

## OIDC setup (no long-lived secrets)

```bash
# 1. Create app registration
az ad app create --display-name disha-deploy

# 2. Note the appId (= AZURE_CLIENT_ID)
APP_ID=$(az ad app list --display-name disha-deploy --query '[0].appId' -o tsv)

# 3. Create service principal
az ad sp create --id $APP_ID

# 4. Federated credential — allows GitHub Actions to auth without a password
az ad app federated-credential create --id $APP_ID --parameters '{
  "name": "disha-github-deploy",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:tashima-tarsh/disha:environment:production",
  "audiences": ["api://AzureADTokenExchange"]
}'

# 5. Grant Contributor on the resource group
az role assignment create \
  --assignee $APP_ID \
  --role Contributor \
  --scope /subscriptions/<SUB_ID>/resourceGroups/disha-rg
```

Then set `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` in GitHub secrets.
