# prepare-runtime.ps1 —— 打包 Android 运行时：node + dsh npm 包 → dsh-runtime.zip
#
# 用法（先构建出 Node-Android 二进制，见 build-node-android.ps1）：
#   .\scripts\prepare-runtime.ps1
#
# 产物：
#   - src-tauri/gen/android/app/src/main/assets/dsh-runtime.zip
#     结构：{ node, VERSION, dsh/... }，App 首次启动解压到 files/dsh-runtime
#   - dist/dsh-runtime/（中间目录，可手动检查）

param(
  [string]$NodeBinary = "",   # 默认 dist/node-android/node
  [string]$DshVersion = "latest"   # npm 上 @deepseek-ai/dsh 的版本
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$dist = Join-Path $root "dist"

if (-not $NodeBinary) { $NodeBinary = Join-Path $dist "node-android\node" }
if (-not (Test-Path $NodeBinary)) {
  throw "未找到 Node-Android 二进制：$NodeBinary（先运行 scripts/build-node-android.ps1）"
}

# 1) 安装 dsh npm 包到独立目录（含完整依赖树）
$pkgDir = Join-Path $dist "dsh-pkg"
if (Test-Path $pkgDir) { Remove-Item -Recurse -Force $pkgDir }
New-Item -ItemType Directory -Force -Path $pkgDir | Out-Null
Push-Location $pkgDir
try {
  npm install "@deepseek-ai/dsh@$DshVersion" --no-audit --no-fund --omit=dev --platform=linux --arch=arm64
} finally {
  Pop-Location
}

$entry = Join-Path $pkgDir "node_modules\@deepseek-ai\dsh\lib\bin.js"
if (-not (Test-Path $entry)) { throw "dsh 入口缺失：$entry（包结构变化？）" }

# 2) 组装运行时目录：node + VERSION + dsh/<整个 node_modules 树>
$runtimeDir = Join-Path $dist "dsh-runtime"
if (Test-Path $runtimeDir) { Remove-Item -Recurse -Force $runtimeDir }
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
Copy-Item $NodeBinary (Join-Path $runtimeDir "node")
Copy-Item (Join-Path $pkgDir "node_modules") (Join-Path $runtimeDir "dsh") -Recurse

$entry = Join-Path $runtimeDir "dsh\@deepseek-ai\dsh\lib\bin.js"
if (-not (Test-Path $entry)) { throw "dsh 入口缺失：$entry（包结构变化？）" }
$dshVersionResolved = (Get-Content (Join-Path $runtimeDir "dsh\@deepseek-ai\dsh\package.json") | ConvertFrom-Json).version
"node=$([IO.Path]::GetFileName($NodeBinary)) dsh=$dshVersionResolved" | Set-Content (Join-Path $runtimeDir "VERSION")

# 3) 打 zip 并放到 Android assets
$assetsDir = Join-Path $root "src-tauri\gen\android\app\src\main\assets"
New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null
$zipPath = Join-Path $assetsDir "dsh-runtime.zip"
Push-Location $runtimeDir
try {
  tar.exe -a -c -f $zipPath .
} finally {
  Pop-Location
}
$size = (Get-Item $zipPath).Length / 1MB
Write-Host "完成：$zipPath（$([Math]::Round($size, 1)) MB）"
