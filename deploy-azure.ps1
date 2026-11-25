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

Write-Host "3/4 Publishing .NET 10 application & creating Linux-compatible ZIP..." -ForegroundColor Cyan
if (Test-Path deploy-pkg) { Remove-Item -Recurse -Force deploy-pkg }
if (Test-Path deploy.zip) { Remove-Item -Force deploy.zip }
dotnet publish backend/Zpovednice.Api.csproj -c Release -o deploy-pkg

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$sourceFull = [IO.Path]::GetFullPath((Join-Path (Get-Location) "deploy-pkg"))
$zipFull = [IO.Path]::GetFullPath((Join-Path (Get-Location) "deploy.zip"))
$zip = [IO.Compression.ZipFile]::Open($zipFull, [IO.Compression.ZipArchiveMode]::Create)
try {
    Get-ChildItem -Path $sourceFull -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($sourceFull.Length + 1).Replace('\', '/')
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally {
    $zip.Dispose()
}

Write-Host "4/4 Deploying ZIP package to Azure App Service ($WebAppName)..." -ForegroundColor Cyan
az webapp deploy `
    --resource-group $ResourceGroup `
    --name $WebAppName `
    --src-path deploy.zip `
    --type zip `
    --clean true `
    --async false `
    --track-status false

Write-Host "Done! Live URL: https://$WebAppName.azurewebsites.net" -ForegroundColor Green
