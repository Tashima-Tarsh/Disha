// DISHA on Azure Container Apps — web + brain from GHCR.
// Idempotent. Scale-to-zero. Logs to Log Analytics.

@description('Resource name prefix.')
param prefix string = 'disha'

@description('Region.')
param location string = resourceGroup().location

@description('GHCR owner (org or user) that publishes disha-web / disha-brain.')
param ghcrOwner string

@description('Image tag to deploy.')
param imageTag string = 'latest'

@description('GHCR pull token (PAT with read:packages). Empty for public packages.')
@secure()
param ghcrToken string = ''

@description('Anthropic / Foundry key consumed by brain + web.')
@secure()
param anthropicApiKey string

@description('Optional Azure Foundry endpoint override (Claude via Azure).')
param foundryEndpoint string = ''

var logName = '${prefix}-logs'
var envName = '${prefix}-cae'
var webName = '${prefix}-web'
var brainName = '${prefix}-brain'
var ghcrServer = 'ghcr.io'

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logName
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource cae 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: envName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: listKeys(logs.id, '2023-09-01').primarySharedKey
      }
    }
  }
}

var ghcrRegistry = empty(ghcrToken) ? [] : [
  {
    server: ghcrServer
    username: ghcrOwner
    passwordSecretRef: 'ghcr-token'
  }
]

var ghcrSecret = empty(ghcrToken) ? [] : [
  { name: 'ghcr-token', value: ghcrToken }
]

resource brain 'Microsoft.App/containerApps@2024-03-01' = {
  name: brainName
  location: location
  properties: {
    managedEnvironmentId: cae.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
        allowInsecure: false
      }
      registries: ghcrRegistry
      secrets: concat(ghcrSecret, [
        { name: 'anthropic-api-key', value: anthropicApiKey }
      ])
    }
    template: {
      containers: [
        {
          name: 'brain'
          image: '${ghcrServer}/${ghcrOwner}/disha-brain:${imageTag}'
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'ANTHROPIC_API_KEY', secretRef: 'anthropic-api-key' }
            { name: 'ANTHROPIC_FOUNDRY_API_KEY', secretRef: 'anthropic-api-key' }
            { name: 'ANTHROPIC_FOUNDRY_ENDPOINT', value: foundryEndpoint }
            { name: 'API_HOST', value: '0.0.0.0' }
            { name: 'API_PORT', value: '8080' }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: '/api/v1/health', port: 8080 }
              initialDelaySeconds: 15
              periodSeconds: 30
            }
          ]
        }
      ]
      scale: { minReplicas: 0, maxReplicas: 3 }
    }
  }
}

resource web 'Microsoft.App/containerApps@2024-03-01' = {
  name: webName
  location: location
  properties: {
    managedEnvironmentId: cae.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
      }
      registries: ghcrRegistry
      secrets: concat(ghcrSecret, [
        { name: 'anthropic-api-key', value: anthropicApiKey }
      ])
    }
    template: {
      containers: [
        {
          name: 'web'
          image: '${ghcrServer}/${ghcrOwner}/disha-web:${imageTag}'
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'ANTHROPIC_API_KEY', secretRef: 'anthropic-api-key' }
            { name: 'DISHA_BRAIN_URL', value: 'https://${brain.properties.configuration.ingress.fqdn}' }
            { name: 'NEXT_TELEMETRY_DISABLED', value: '1' }
          ]
        }
      ]
      scale: { minReplicas: 0, maxReplicas: 5 }
    }
  }
}

output webUrl string = 'https://${web.properties.configuration.ingress.fqdn}'
output brainUrl string = 'https://${brain.properties.configuration.ingress.fqdn}'
