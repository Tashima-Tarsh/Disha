# DISHA Migration Guide

This guide assists users and administrators in upgrading from **v5.x (Legacy Framework)** to **v6.x (The Sovereign Monorepo)**.

## 🏛️ What's Changed?
The v6 release introduced a significant restructuring of the repository into a high-scale monorepo. This improves modularity but requires updates to path references and build scripts.

### Directory Mapping
| Legacy Path (v5) | New Path (v6) |
|:--- |:--- |
| `/ai-platform` | `/disha/services/ai-platform` |
| `/cognitive-engine` | `/disha/ai/core` |
| `/decision-engine` | `/disha/ai/core/decision-engine` |
| `/web-dashboard` | `/disha/apps/web` |
| `/scripts` | `/disha/scripts` |

## 🚀 Upgrade Steps

### 1. Repository Cleanliness
Before migrating, clear your legacy build artifacts and node_modules:
```bash
# In the root directory
rm -rf node_modules
find . -name "dist" -type d -exec rm -rf {} +
```

### 2. Dependency Alignment
v6 uses **Bun 1.1+** as the primary package manager for the monorepo. 
```bash
# Standard install
bun install
```

### 3. Environment Variable Updates
Ensure your `.env` files follow the new service-specific structures.
- Move cloud-provider keys to `disha/services/ai-platform/backend/.env`.
- Move web configurations to `disha/apps/web/.env`.

### 4. Build System
The core CLI is now built via a unified workspace command:
```bash
bun run build
```

## 🛡️ Breaking Changes
- **Import Syntax**: Many internal Python imports now require the `disha.` prefix if running from the root.
- **Port Mapping**: Default microservice ports have been standardized (e.g., Forecast on 8000, Alerts on 8001).

## 🆘 Support
If you encounter module resolution errors, run the diagnostic tool:
```bash
python disha/scripts/monitor.py --check-paths
```
