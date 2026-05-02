// DISHA Brain on Azure App Service (Linux container).
// Alternative to Container Apps when long-lived FastAPI is preferred.

@description('Resource name prefix.')
param prefix string = 'disha'
param location string = resourceGroup().location
param ghcrOwner string
param imageTag string = 'latest'
@secure()
param ghcrToken string = ''
@secure()
param anthropicApiKey string
param foundryEndpoint string = ''
param sku string = 'B1'

var planName = '${prefix}-asp'
var appName = '${prefix}-brain-app'
var image = 'ghcr.io/${ghcrOwner}/disha-brain:${imageTag}'

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  sku: { name: sku, tier: 'Basic' }
  kind: 'linux'
  properties: { reserved: true }
}

resource app 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  kind: 'app,linux,container'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|${image}'
      alwaysOn: true
      healthCheckPath: '/api/v1/health'
      acrUseManagedIdentityCreds: false
      appSettings: [
        { name: 'WEBSITES_PORT', value: '8080' }
        { name: 'DOCKER_REGISTRY_SERVER_URL', value: 'https://ghcr.io' }
        { name: 'DOCKER_REGISTRY_SERVER_USERNAME', value: ghcrOwner }
        { name: 'DOCKER_REGISTRY_SERVER_PASSWORD', value: ghcrToken }
        { name: 'ANTHROPIC_API_KEY', value: anthropicApiKey }
        { name: 'ANTHROPIC_FOUNDRY_API_KEY', value: anthropicApiKey }
        { name: 'ANTHROPIC_FOUNDRY_ENDPOINT', value: foundryEndpoint }
        { name: 'API_HOST', value: '0.0.0.0' }
        { name: 'API_PORT', value: '8080' }
      ]
    }
  }
}

output brainUrl string = 'https://${app.properties.defaultHostName}'
