/**
 * 主题：CSS 变量 + 跟随系统深浅色；React 侧通过 useTheme() 读取。
 */

export interface Theme {
  dark: boolean
  background: string
  surface: string
  surfaceAlt: string
  border: string
  text: string
  textMuted: string
  textInverse: string
  accent: string
  accentSoft: string
  userBubble: string
  userBubbleText: string
  assistantBubble: string
  danger: string
  warning: string
  warningSoft: string
  success: string
  codeBackground: string
}

const light: Theme = {
  dark: false,
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F2F5',
  border: '#E2E5EA',
  text: '#1B1F27',
  textMuted: '#7A828E',
  textInverse: '#FFFFFF',
  accent: '#4D6BFE',
  accentSoft: '#EEF1FF',
  userBubble: '#4D6BFE',
  userBubbleText: '#FFFFFF',
  assistantBubble: '#FFFFFF',
  danger: '#E5484D',
  warning: '#F5A524',
  warningSoft: '#FEF6E0',
  success: '#2EB872',
  codeBackground: '#F0F2F5',
}

const dark: Theme = {
  dark: true,
  background: '#0E1116',
  surface: '#171B22',
  surfaceAlt: '#1F242D',
  border: '#2A303A',
  text: '#E8EAEE',
  textMuted: '#8B93A1',
  textInverse: '#FFFFFF',
  accent: '#4D6BFE',
  accentSoft: '#232B4D',
  userBubble: '#3A55D4',
  userBubbleText: '#FFFFFF',
  assistantBubble: '#1F242D',
  danger: '#F2555A',
  warning: '#F0B429',
  warningSoft: '#3A2F12',
  success: '#3ECF8E',
  codeBackground: '#0F1218',
}

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

/** React 侧主题（跟随系统，监听变化）。 */
export function useTheme(): Theme {
  return darkQuery.matches ? dark : light
}

/** 挂载时把 CSS 变量写入 :root（供非 React 场景与过渡动画）。 */
export function applyThemeVariables(theme: Theme): void {
  const root = document.documentElement
  const vars: Record<string, string> = {
    '--bg': theme.background,
    '--surface': theme.surface,
    '--surface-alt': theme.surfaceAlt,
    '--border': theme.border,
    '--text': theme.text,
    '--text-muted': theme.textMuted,
    '--accent': theme.accent,
    '--accent-soft': theme.accentSoft,
    '--danger': theme.danger,
    '--warning': theme.warning,
    '--success': theme.success,
  }
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
}

darkQuery.addEventListener('change', () => {
  applyThemeVariables(darkQuery.matches ? dark : light)
})
