# build-node-android.ps1 —— 在 WSL/Ubuntu 上交叉编译 Node.js (android-arm64)。
#
# 前置：
#   1. Windows 上安装 WSL2 并装好 Ubuntu 发行版（wsl --install -d Ubuntu）
#   2. WSL 内：sudo apt update && sudo apt install -y python3 g++ make curl xz-utils
#   3. 本脚本通过 WSL 调用已装的 Android NDK（读取 ANDROID_HOME/ndk/<版本>）
#
# 用法：
#   .\scripts\build-node-android.ps1 [-NodeVersion "v24.19.0"] [-Abi "arm64"]
# 产物：dist/node-android/node（aarch64 ELF，静态链接，可直接作为 sidecar）

param(
  [string]$NodeVersion = "v24.19.0",
  [string]$Abi = "arm64"
)

$ErrorActionPreference = "Stop"

$ndkRoot = Join-Path $env:ANDROID_HOME "ndk"
if (-not (Test-Path $ndkRoot)) { throw "未找到 NDK：$ndkRoot（请安装 Android NDK）" }
$ndk = Get-ChildItem $ndkRoot -Directory | Select-Object -First 1
if (-not $ndk) { throw "NDK 目录为空" }
Write-Host "使用 NDK: $($ndk.Name)"

# 把编译脚本写入 WSL 并执行
$script = @'
#!/usr/bin/env bash
set -euo pipefail
NODE_VERSION="$1"
ABI="$2"
NDK_PATH="$3"

apt list --installed 2>/dev/null | grep -q python3 || { echo "请先安装: sudo apt install -y python3 g++ make curl xz-utils"; exit 1; }

work=/tmp/node-android
rm -rf "$work" && mkdir -p "$work"
cd "$work"
curl -fsSL "https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION.tar.xz" | tar xJ

TOOLCHAIN="$NDK_PATH/toolchains/llvm/prebuilt/linux-x86_64"
export AR="$TOOLCHAIN/bin/llvm-ar"
export CC="$TOOLCHAIN/bin/aarch64-linux-android26-clang"
export CXX="$TOOLCHAIN/bin/aarch64-linux-android26-clang++"
export STRIP="$TOOLCHAIN/bin/llvm-strip"

cd "node-$NODE_VERSION"
./configure --dest-os=android --dest-cpu="$ABI" --cross-compiling
make -j"$(nproc)" >/dev/null
file out/Release/node
'@

$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($script))
$wslScript = "echo $encoded | base64 -d > /tmp/build-node.sh && bash /tmp/build-node.sh $NodeVersion $Abi $ndk.FullName"
wsl.exe -e bash -lc $wslScript

$out = Join-Path $PSScriptRoot "..\dist\node-android"
New-Item -ItemType Directory -Force -Path $out | Out-Null
wsl.exe -e bash -lc "cat /tmp/node-android/node-$NodeVersion/out/Release/node" | Set-Content -Encoding Byte -Path (Join-Path $out "node")
wsl.exe -e bash -lc "cat /tmp/node-android/node-$NodeVersion/out/Release/node.var" -ErrorAction SilentlyContinue | Out-Null
Write-Host "完成：$out\node（用 file 命令确认是 aarch64 ELF）"
