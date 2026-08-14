/**
 * dsh-app 移动端适配注入脚本（Rust 侧 include_str 内嵌，每次页面导航执行）。
 * 在官方 Web UI 基础上做窄屏适配：侧栏变抽屉、详情面板全屏、触屏优化。
 * 宽屏（>700px）下完全不生效，保持原版布局。
 */
(() => {
  if (window.__dshMobileInjected) return
  window.__dshMobileInjected = true

  const css = `
@media (max-width: 700px) {
  /* 单列布局：主区全宽 */
  .pI_x6G_frame { grid-template-columns: 1fr !important; }
  .pI_x6G_centerCol { width: 100vw !important; }

  /* 侧边栏：抽屉式，默认滑出 */
  .pI_x6G_sidebarCol {
    position: fixed !important;
    top: 0 !important; left: 0 !important; bottom: 0 !important;
    width: min(85vw, 320px) !important;
    z-index: 100 !important;
    transform: translateX(-105%);
    transition: transform 0.25s ease;
    box-shadow: 2px 0 24px rgba(0, 0, 0, 0.2);
    background: var(--bg, #f6f7f9);
  }
  body.dsh-nav-open .pI_x6G_sidebarCol { transform: translateX(0); }
  /* 设置等模态对话框的 fixed 遮罩会被侧栏 transform 捕获（containing block 改变），
     对话框打开期间让侧栏保持原位，遮罩即可铺满视口 */
  body:has(.VOzbGW_overlay) .pI_x6G_sidebarCol { transform: none !important; }
  body.dsh-nav-open::before {
    content: '';
    position: fixed; inset: 0;
    background: rgba(0, 0, 0, 0.35);
    z-index: 99;
  }

  /* 汉堡按钮：右上角（避开标题区），手机触控尺寸 */
  .dsh-hamburger {
    position: fixed !important;
    top: calc(env(safe-area-inset-top, 0px) + 10px);
    right: 12px;
    z-index: 96;
    width: 46px; height: 46px;
    border-radius: 14px;
    border: 1px solid rgba(128, 128, 128, 0.25);
    background: rgba(255, 255, 255, 0.92);
    color: #222;
    font-size: 18px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.18);
    cursor: pointer;
  }
  @media (prefers-color-scheme: dark) {
    .dsh-hamburger { background: rgba(30, 34, 42, 0.94); color: #eee; }
  }

  /* 详情面板（工具详情）：全屏覆盖 */
  .pXSMma_root {
    position: fixed !important;
    inset: 0 !important;
    width: 100vw !important;
    height: 100dvh !important;
    z-index: 90 !important;
    overflow-y: auto !important;
    background: var(--bg, #f6f7f9) !important;
  }

  /* 主滚动区撑满视口，输入区吸底 */
  .wSkVaW_scrollBody { height: 100dvh !important; }
  .wSkVaW_composerSeat { padding-left: 10px !important; padding-right: 10px !important; }

  /* 触屏优化：会话列表行距与字号 */
  .qDHVXG_treeBody { padding-bottom: 88px !important; }

  /* composer 底部行：窄屏下控件换行，避免互相挤压重叠 */
  .uV2eYG_row { flex-wrap: wrap !important; }
  .uV2eYG_trailing {
    flex-wrap: wrap !important;
    justify-content: flex-end !important;
    row-gap: 8px !important;
  }

  /* 模型/推理等级下拉菜单：防止超出屏幕（JS 定位在窄屏会溢出） */
  ._7KE1Ra_menu {
    max-width: calc(100vw - 24px) !important;
    left: 12px !important;
    right: auto !important;
    transform: none !important;
    overflow-y: auto !important;
  }

  /* 底部状态栏（轮次/LLM 耗时/缓存等）：信息冗长易截断，隐藏并合并进上下文详情 */
  .FJxK0a_root { display: none !important; }

  /* 上下文详情对话框：防止超出屏幕，自适应居中 */
  .JObwrW_panel {
    max-width: calc(100vw - 24px) !important;
    left: 12px !important;
    right: auto !important;
    transform: none !important;
    overflow-y: auto !important;
  }

  /* 设置面板：单列布局，导航变顶部横向滚动 */
  .VOzbGW_panel {
    width: 100vw !important;
    max-width: none !important;
    height: 100dvh !important;
    display: flex !important;
    flex-direction: column !important;
    border-radius: 0 !important;
  }
  .VOzbGW_nav {
    width: 100% !important;
    height: auto !important;
    display: flex !important;
    flex-direction: row !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    border-right: none !important;
    border-bottom: 1px solid var(--border, rgba(128, 128, 128, 0.2));
    flex-shrink: 0;
  }
  .VOzbGW_nav > * { flex-shrink: 0; }
  .VOzbGW_content {
    flex: 1 !important;
    min-height: 0 !important;
    overflow-y: auto !important;
  }
}
`

  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)

  // 汉堡按钮 + 抽屉开关（点遮罩/侧栏外关闭）
  const btn = document.createElement('button')
  btn.className = 'dsh-hamburger'
  btn.type = 'button'
  btn.setAttribute('aria-label', '菜单')
  btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>'
  btn.addEventListener('click', (event) => {
    event.stopPropagation()
    // 官方窄屏把侧栏折叠成 56px 图标条（React 状态驱动，折叠态 DOM 缺入口）；
    // 打开抽屉前先点官方"打开侧边栏"让其重新渲染完整侧栏
    const isOpen = document.body.classList.contains('dsh-nav-open')
    const toggle = document.querySelector('.hHd-Xa_toggle')
    if (!isOpen && toggle && toggle.getAttribute('aria-expanded') !== 'true') toggle.click()
    document.body.classList.toggle('dsh-nav-open')
  })
  document.body.appendChild(btn)
  document.addEventListener('click', (event) => {
    if (!document.body.classList.contains('dsh-nav-open')) return
    if (event.target instanceof Element && event.target.closest('.pI_x6G_sidebarCol')) return
    document.body.classList.remove('dsh-nav-open')
  })

  // 静默取消官方 56px 一级侧栏：页面加载后立即展开为完整侧栏（二级内容），
  // 并阻止官方任何时刻重新折叠（包括用户点官方"收起侧边栏"）
  const ensureOfficialExpanded = () => {
    if (document.querySelector('.hHd-Xa_collapsed')) {
      const toggle = document.querySelector('.hHd-Xa_toggle')
      if (toggle && toggle.getAttribute('aria-expanded') !== 'true') toggle.click()
    }
  }
  setTimeout(ensureOfficialExpanded, 300)
  setTimeout(ensureOfficialExpanded, 1200)
  setTimeout(ensureOfficialExpanded, 3000)

  // 状态栏已隐藏：打开"上下文已用"详情时，把原状态信息合并进去，并修正弹窗定位
  const migrateStatusIntoContextDialog = () => {
    document.querySelectorAll('[role="dialog"]').forEach((dialog) => {
      if (!dialog.textContent.includes('上下文已用')) return
      // 官方右下锚定在窄屏会溢出屏幕，强制 fixed 贴左
      dialog.style.position = 'fixed'
      dialog.style.left = '12px'
      dialog.style.right = 'auto'
      dialog.style.top = 'auto'
      dialog.style.bottom = '150px'
      dialog.style.width = 'auto'
      dialog.style.maxWidth = 'calc(100vw - 24px)'
      if (dialog.querySelector('.dsh-status-merged')) return
      const statusEl = document.querySelector('.FJxK0a_root')
      if (!statusEl || statusEl.textContent.trim().length === 0) return
      const row = document.createElement('div')
      row.className = 'dsh-status-merged'
      row.style.cssText = 'padding:8px 12px;border-top:1px solid var(--border,rgba(128,128,128,.2));font-size:11px;color:var(--text-muted,#888);line-height:1.5;word-break:break-all;'
      row.textContent = statusEl.textContent.trim()
      dialog.appendChild(row)
    })
  }

  new MutationObserver(() => {
    ensureOfficialExpanded()
    migrateStatusIntoContextDialog()
  }).observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
    childList: true,
  })
})()
