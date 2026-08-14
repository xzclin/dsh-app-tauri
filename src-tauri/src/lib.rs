//! dsh-app：在本地启动 DeepSeek Harness 进程，前端 WebView 全屏加载其 Web UI。
//!
//! 运行时解析顺序：
//! 1. Android：从 App 数据目录解压的 node + dsh 运行时（assets/dsh-runtime.zip）
//! 2. 桌面开发：环境变量 DSH_DEV_COMMAND（默认为 `npx --yes @deepseek-ai/dsh web`）

use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, RunEvent};

/// 正在运行的 dsh 进程（App 退出时终止）。
struct DshHandle(Mutex<Option<Child>>);

const DSH_URL: &str = "http://127.0.0.1:3080";
const MAX_PROBE_ATTEMPTS: u32 = 60;

/// 官方 UI 的手机适配脚本（窄屏抽屉/全屏详情/触屏优化）。
const MOBILE_ADAPT_JS: &str = include_str!("../assets/mobile-adapt.js");

/// 用裸 TCP 探测本地 dsh 是否就绪（HTTP 200）。
/// 不走浏览器 fetch：WebView 跨源请求会被 CORS 拦截，TCP 探测无此限制。
fn probe_dsh_ready() -> bool {
    let Ok(mut stream) = TcpStream::connect_timeout(&"127.0.0.1:3080".parse().unwrap(), Duration::from_secs(2)) else {
        return false;
    };
    let request = "GET / HTTP/1.1\r\nHost: 127.0.0.1:3080\r\nConnection: close\r\n\r\n";
    if stream.write_all(request.as_bytes()).is_err() {
        return false;
    }
    let mut buf = [0u8; 256];
    match stream.read(&mut buf) {
        Ok(n) => String::from_utf8_lossy(&buf[..n]).starts_with("HTTP/1.1 200")
            || String::from_utf8_lossy(&buf[..n]).starts_with("HTTP/1.0 200"),
        Err(_) => false,
    }
}

/// 前端主动查询就绪状态（兜底路径：dsh-ready 事件可能早于页面加载发出而丢失）。
#[tauri::command]
fn check_dsh_ready() -> bool {
    probe_dsh_ready()
}

/// HTTP RPC 转发：dsh 信任栅栏要求 Origin 与 Host authority 一致，
/// tauri-plugin-http 会自动附加 `Origin: tauri://localhost` 导致 403，
/// 因此这里用 reqwest 直接发出干净请求（无 Origin、Host=loopback 放行）。
#[tauri::command]
async fn dsh_rpc(
    rpc_id: String,
    method: String,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let client = tauri_plugin_http::reqwest::Client::new();
    let body = serde_json::json!({
        "type": "client-request",
        "rpcId": rpc_id,
        "method": method,
        "payload": payload,
    });
    let response = client
        .post(format!("{DSH_URL}/api/{method}"))
        .header("content-type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .map_err(|error| format!("network: {error}"))?;
    if !response.status().is_success() {
        return Err(format!("http: {}", response.status()));
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("body: {error}"))?;
    serde_json::from_slice(&bytes).map_err(|error| format!("decode: {error}"))
}

/// 应答服务端推送（审批/提问）：POST /api/respond，rpcId 回显。
#[tauri::command]
async fn dsh_respond(
    rpc_id: String,
    value: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let client = tauri_plugin_http::reqwest::Client::new();
    let body = serde_json::json!({
        "type": "client-response",
        "rpcId": rpc_id,
        "result": { "ok": true, "value": value },
    });
    let response = client
        .post(format!("{DSH_URL}/api/respond"))
        .header("content-type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .map_err(|error| format!("network: {error}"))?;
    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("body: {error}"))?;
    serde_json::from_slice(&bytes).map_err(|error| format!("decode: {error}"))
}

/// 探测线程：dsh 就绪后把 WebView 导航到官方 Web UI。
/// 官方 UI 在窄屏下由注入脚本（mobile-adapt.js）做手机适配，功能完整保留。
fn wait_for_dsh_and_navigate(app: AppHandle) {
    thread::spawn(move || {
        let mut attempt = 0;
        while attempt < MAX_PROBE_ATTEMPTS {
            if probe_dsh_ready() {
                if let Some(window) = app.get_webview_window("main") {
                    if let Ok(url) = tauri::Url::parse(DSH_URL) {
                        let _ = window.navigate(url);
                    }
                }
                return;
            }
            attempt += 1;
            thread::sleep(Duration::from_secs(1));
        }
        // 超时：原生提示（启动页无 JS 依赖，无法监听事件）
        let message = format!("本地 dsh 服务在 {MAX_PROBE_ATTEMPTS} 秒内未就绪，请检查后重启应用");
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.eval(&format!("alert({message:?})"));
        }
        let _ = app.emit("dsh-error", message);
    });
}

/// 解析 dsh 启动命令（node/入口 + 参数）与运行时根目录。
fn resolve_launch(app: &AppHandle) -> (Command, Option<PathBuf>) {
    if cfg!(target_os = "android") {
        // 运行时由 prepare-runtime 脚本解压到 <App数据目录>/dsh-runtime
        let base = app
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| PathBuf::from("/data/local/tmp"));
        let node = base.join("dsh-runtime").join("node");
        let entry = base.join("dsh-runtime").join("dsh").join("@deepseek-ai/dsh/lib/bin.js");
        let mut cmd = Command::new(node);
        cmd.arg(entry).arg("web");
        (cmd, Some(base))
    } else {
        // 桌面开发：可用系统 npx 启动已发布的 dsh，或经 DSH_DEV_COMMAND 覆盖
        let raw = std::env::var("DSH_DEV_COMMAND")
            .unwrap_or_else(|_| "npx --yes @deepseek-ai/dsh web".to_string());
        let raw = format!("{raw} --port 3080");
        if cfg!(windows) {
            // Windows 下 npx 是 .cmd 脚本，须经 cmd 解释
            let mut c = Command::new("cmd");
            c.arg("/C").arg(&raw);
            (c, None)
        } else {
            let mut parts = raw.split_whitespace();
            let program = parts.next().unwrap_or("npx").to_string();
            let mut c = Command::new(program);
            c.args(parts);
            (c, None)
        }
    }
}

/// 启动 dsh 进程；设置 DSH_HOME（数据目录）等环境。
fn start_dsh(app: &AppHandle) {
    let (mut cmd, base) = resolve_launch(app);

    if let Some(base) = base {
        let home = base.join("dsh-home");
        cmd.env("DSH_HOME", &home);
    }
    // 手机上禁用依赖 Linux 内核特性的沙箱与桌面目录选择器
    cmd.env("DSH_SANDBOX_DISABLED", "1");
    cmd.env("DSH_TOOLS_MODE", "code");

    // dsh 启动信息输出到 stdout/stderr，便于排查
    let child = match cmd.stdout(Stdio::piped()).stderr(Stdio::piped()).spawn() {
        Ok(child) => child,
        Err(error) => {
            eprintln!("dsh-app: 启动 dsh 失败: {error}");
            return;
        }
    };
    *app.state::<DshHandle>().0.lock().unwrap() = Some(child);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_websocket::init())
        .invoke_handler(tauri::generate_handler![check_dsh_ready, dsh_rpc, dsh_respond])
        .manage(DshHandle(Mutex::new(None)))
        .on_page_load(|window, payload| {
            // 仅在官方 UI 页面（整页导航完成后）注入移动端适配
            if payload.event() != tauri::webview::PageLoadEvent::Finished {
                return;
            }
            if payload.url().host_str() != Some("127.0.0.1") {
                return;
            }
            let _ = window.eval(MOBILE_ADAPT_JS);
        })
        .setup(|app| {
            start_dsh(app.handle());
            // 探测由 Rust 完成（WebView fetch 跨源会被 CORS 拦截）
            wait_for_dsh_and_navigate(app.handle().clone());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let RunEvent::Exit = event {
                if let Some(mut child) = app_handle.state::<DshHandle>().0.lock().unwrap().take() {
                    let _ = child.kill();
                    let _ = child.wait();
                }
            }
        });
}
