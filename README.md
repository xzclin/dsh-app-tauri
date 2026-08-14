# dsh-app：DeepSeek Harness 安卓客户端（Tauri 2）

在手机上**直接运行 DeepSeek Harness**：打开 App 即启动本地 dsh 进程，
WebView 全屏加载官方 Web UI（会话、模型、工具审批等全部功能），无需外部服务器。

## 架构

```
┌───────────────────────────────────────────┐
│  Tauri 2 壳 (Rust)                        │
│  ┌───────────────┐   ┌─────────────────┐  │
│  │ WebView       │   │ dsh 进程         │  │
│  │ 官方 Web UI   │◄─►│ node + dsh web   │  │
│  │ 127.0.0.1:3080│   │ 127.0.0.1:3080   │  │
│  └───────────────┘   └─────────────────┘  │
│  启动页轮询就绪后跳转    App 退出时终止     │
└───────────────────────────────────────────┘
```

- **运行时**：`assets/dsh-runtime.zip`（node-android 二进制 + dsh npm 包），
  首次启动由 [MainActivity.kt](src-tauri/gen/android/app/src/main/java/ai/deepseek/dsh/MainActivity.kt)
  解压到 `files/dsh-runtime`（幂等，`VERSION` 文件做版本标记）
- **数据**：`DSH_HOME` 指向 App 私有数据目录 `files/dsh-home`
- **工具模式**：手机上禁用 Landlock 沙箱（Android 内核不支持），工具以 Code Mode 呈现

## 开发

```sh
npm install
npm run tauri dev            # 桌面验证（自动 npx 启动 dsh，WebView 加载 UI）
```

## 构建 Android APK

前置：Rust + Android SDK/NDK（`ANDROID_HOME` 指向 SDK）+ JDK 17。

```sh
# 1. 交叉编译 Node for Android（需要 WSL/Ubuntu，见 build-node-android.ps1）
./scripts/build-node-android.ps1

# 2. 打包运行时到 Android assets
./scripts/prepare-runtime.ps1

# 3. 构建 APK
npm run android:build        # tauri android build --apk
# 产物：src-tauri/gen/android/app/build/outputs/apk/...
```

### 没有 WSL？用 GitHub Actions 云编译

`.github/workflows/build-runtime.yml` 在 Ubuntu 上完成同样的
交叉编译 + 打包，产物（`dsh-runtime.zip`）从 Actions 页面下载后放入
`src-tauri/gen/android/app/src/main/assets/` 即可。

## 已知限制

- dsh 依赖 `node:sqlite`（Node ≥ 22.13），Node-Android 必须 ≥ 该版本
- 首次启动需解压 ~100MB 运行时（一次性）
- 手机端没有真实 shell/沙箱，代码执行类工具以 Code Mode 只读呈现
