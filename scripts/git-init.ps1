# Quick git init helper for Windows. Run from the repo root:
#   pwsh -File scripts/git-init.ps1
# or just `powershell -File scripts/git-init.ps1` on older Windows.

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

Push-Location $repoRoot
try {
  git init -b main
  git add .
  git commit -m "Initial scaffold: streaming UI server + client, admin app, NUC setup scripts, docker-compose for Immich/Jellyfin, docs"
  Write-Host ""
  Write-Host "Repo initialized. Next:"
  Write-Host "  git remote add origin <your-remote-url>"
  Write-Host "  git push -u origin main"
} finally {
  Pop-Location
}
