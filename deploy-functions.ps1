# PowerShell script to deploy Firebase Functions
Write-Host "Deploying Firebase Functions..." -ForegroundColor Green

# Change to project directory
Set-Location -Path "C:\Users\zacha\Documents\Moonlighter Games Website"

# Deploy functions
& npx firebase deploy --only functions

Write-Host "Deployment complete!" -ForegroundColor Green
Read-Host "Press Enter to exit"