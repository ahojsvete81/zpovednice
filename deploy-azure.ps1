param(
    [string]$ResourceGroup = "rg-zpovednice",
    [string]$WebAppName = "app-zpovednice-dev"
)

$ErrorActionPreference = 'Stop'

Write-Host "1/4 Building React + TypeScript frontend..." -ForegroundColor Cyan
Push-Location frontend
npm run build
Pop-Location

Write-Host "2/4 Copying frontend build into backend/wwwroot..." -ForegroundColor Cyan
if (Test-Path backend/wwwroot) { Remove-Item -Recurse -Force backend/wwwroot }
New-Item -ItemType Directory -Path backend/wwwroot -Force | Out-Null
Copy-Item -Recurse -Force frontend/dist/* backend/wwwroot/

Write-Host "3/4 Publishing .NET 10 application..." -ForegroundColor Cyan
if (Test-Path deploy-pkg) { Remove-Item -Recurse -Force deploy-pkg }
if (Test-Path deploy.zip) { Remove-Item -Force deploy.zip }
dotnet publish backend/Zpovednice.Api.csproj -c Release -o deploy-pkg
Compress-Archive -Path deploy-pkg/* -DestinationPath deploy.zip -Force

Write-Host "4/4 Deploying ZIP package to Azure App Service ($WebAppName)..." -ForegroundColor Cyan
az webapp deploy --resource-group $ResourceGroup --name $WebAppName --src-path deploy.zip --type zip

Write-Host "Done! Live URL: https://$WebAppName.azurewebsites.net" -ForegroundColor Green
