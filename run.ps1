<#
.SYNOPSIS
  새 컴퓨터 자동 부트스트랩 — Node 버전 검사 → env 확인 → 의존성 설치 → 실행.

.DESCRIPTION
  env 파일만 세팅해 두면 run.bat 더블클릭으로 바로 실행되도록 하는 스크립트.
  Node는 자동 설치하지 않고 버전 검사 + 안내만 한다(.nvmrc 기준).

.PARAMETER Mode
  dev (기본): npm run dev
  build      : npm run build 후 npm run preview

.PARAMETER ForceInstall
  node_modules 존재 여부와 무관하게 npm ci 강제 실행.

.EXAMPLE
  .\run.ps1
  .\run.ps1 -Mode build
  .\run.ps1 -ForceInstall
#>
param(
  [ValidateSet('dev', 'build')]
  [string]$Mode = 'dev',
  [switch]$ForceInstall
)

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Warn2($msg){ Write-Host "    !!  $msg" -ForegroundColor Yellow }
function Write-Err2($msg) { Write-Host "    XX  $msg" -ForegroundColor Red }

# 1. 작업 디렉터리를 스크립트 위치로 고정 (더블클릭 시 경로 흔들림 방지)
Set-Location -LiteralPath $PSScriptRoot

# 2. Node 버전 검사 + 안내 (자동 설치 안 함)
#    호환 범위 = 의존성(Vite 5 / vitest) 요구와 동일: ^18.0.0 || >=20.0.0
#    (즉 Node 18.x 또는 20 이상. 19.x 는 미지원.)
#    .nvmrc 값은 "권장 핀"으로만 사용(메시지 표시용).
Write-Step 'Node 버전 검사'
$nvmrcPath = Join-Path $PSScriptRoot '.nvmrc'
$recommendedNode = if (Test-Path $nvmrcPath) { (Get-Content $nvmrcPath -Raw).Trim() } else { '20.11.1' }

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
  Write-Err2 "Node.js가 설치되어 있지 않습니다. v$recommendedNode 설치 후 다시 실행하세요."
  Write-Host  "    다운로드: https://nodejs.org/dist/v$recommendedNode/" -ForegroundColor Yellow
  exit 1
}

$installedNode = (& node -v).Trim().TrimStart('v')
$installedMajor = [int]($installedNode.Split('.')[0])
$isSupported = ($installedMajor -eq 18) -or ($installedMajor -ge 20)   # ^18.0.0 || >=20.0.0

if (-not $isSupported) {
  Write-Err2 "Node 버전 비호환 — 설치됨: v$installedNode / 필요: 18.x 또는 20 이상 (19.x 미지원)"
  Write-Host  "    권장: v$recommendedNode — https://nodejs.org/dist/v$recommendedNode/" -ForegroundColor Yellow
  Write-Host  "    (nvm-windows 사용 시: nvm install $recommendedNode; nvm use $recommendedNode)" -ForegroundColor Yellow
  exit 1
}

if ($installedNode -ne $recommendedNode) {
  Write-Warn2 "node v$installedNode — 호환 범위 내(권장 v$recommendedNode), 진행합니다."
} else {
  Write-Ok "node v$installedNode"
}

# 3. env 확인 (.env 없으면 .env.example 복사 후 안내·중단 — env 세팅은 사용자 담당)
Write-Step 'env 파일 확인'
$envPath = Join-Path $PSScriptRoot '.env'
if (-not (Test-Path $envPath)) {
  $examplePath = Join-Path $PSScriptRoot '.env.example'
  if (Test-Path $examplePath) {
    Copy-Item -LiteralPath $examplePath -Destination $envPath
    Write-Warn2 '.env 가 없어 .env.example 를 복사했습니다.'
    Write-Host  '    .env 파일의 값(특히 VITE_API_BASE_URL)을 확인·수정한 뒤 다시 실행하세요.' -ForegroundColor Yellow
  } else {
    Write-Err2 '.env 와 .env.example 모두 없습니다. .env 를 직접 만들어 주세요.'
  }
  exit 1
}
Write-Ok '.env 존재'

# 4. 의존성 설치 (lockfile 충실 npm ci, node_modules 있으면 건너뜀)
Write-Step '의존성 설치'
$nodeModules = Join-Path $PSScriptRoot 'node_modules'
if ($ForceInstall -or -not (Test-Path $nodeModules)) {
  Write-Host '    npm ci 실행 중...' -ForegroundColor Gray
  & npm ci
  if ($LASTEXITCODE -ne 0) { Write-Err2 'npm ci 실패'; exit 1 }
  Write-Ok '의존성 설치 완료'
} else {
  Write-Ok 'node_modules 존재 — 설치 건너뜀 (강제 설치: -ForceInstall)'
}

# 5. 실행
Write-Step "실행 ($Mode 모드)"
if ($Mode -eq 'build') {
  & npm run build
  if ($LASTEXITCODE -ne 0) { Write-Err2 'npm run build 실패'; exit 1 }
  Write-Ok 'build 성공 — preview 서버 기동'
  & npm run preview
} else {
  Write-Host '    dev 서버 기동: http://localhost:5173' -ForegroundColor Gray
  & npm run dev
}
