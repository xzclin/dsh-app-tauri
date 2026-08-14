import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTheme } from '../theme'
import { chatStore } from '../store/chat'
import { connectionStore } from '../store/connection'
import { navigationStore } from '../store/navigation'
import { ChatBubble } from '../components/ChatBubble'
import { ApprovalCard } from '../components/ApprovalCard'
import { QuestionCard } from '../components/QuestionCard'
import { Composer } from '../components/Composer'
import { ConnectionBanner } from '../components/ConnectionBanner'

/** 聊天页：消息流 + 审批/提问卡片 + 底部输入栏。 */
export function ChatScreen(): React.JSX.Element {
  const theme = useTheme()
  const { activeSessionId, go } = navigationStore()
  const { status } = connectionStore()
  const { messages, running, approvals, questions, titles, sendText, cancelTurn, respondApproval, respondQuestion } = chatStore()

  const sessionId = activeSessionId
  const scrollRef = useRef<HTMLDivElement>(null)

  const items = useMemo(
    () => (sessionId !== null ? (messages[sessionId] ?? []) : []),
    [messages, sessionId],
  )
  const isRunning = sessionId !== null ? (running[sessionId] ?? false) : false
  const pendingApproval = useMemo(
    () => (sessionId !== null ? (approvals[sessionId] ?? []) : [])[0],
    [approvals, sessionId],
  )
  const pendingQuestion = useMemo(
    () => (sessionId !== null ? (questions[sessionId] ?? []) : [])[0],
    [questions, sessionId],
  )

  // 打开时同步运行状态（session.list 的 running 位）
  useEffect(() => {
    if (sessionId !== null) {
      const summary = chatStore.getState().sessions.find((s) => s.sessionId === sessionId)
      if (summary) {
        chatStore.setState((state) => ({ running: { ...state.running, [sessionId]: summary.running } }))
      }
    }
  }, [sessionId])

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
  }, [])

  const handleSend = (text: string): void => {
    if (sessionId === null) return
    void sendText(sessionId, text).then((accepted) => {
      if (!accepted) alert('发送失败：消息未被接受，请检查连接后重试')
      else requestAnimationFrame(scrollToEnd)
    })
  }

  if (sessionId === null) return <></>

  const title =
    titles[sessionId] ??
    chatStore.getState().sessions.find((s) => s.sessionId === sessionId)?.cwd?.split(/[\\/]/).pop() ??
    `会话 ${sessionId.slice(0, 8)}`

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <ConnectionBanner status={status} theme={theme} />

      {/* 顶栏 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px', borderBottom: `1px solid ${theme.border}`, background: theme.surface }}>
        <button
          className="btn btn-ghost"
          style={{ padding: '8px 14px', fontSize: 15 }}
          onClick={() => go('home')}
        >
          ‹ 返回
        </button>
        <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 1 }}>
            <span style={{ width: 7, height: 7, borderRadius: 3.5, background: isRunning ? theme.success : theme.textMuted }} />
            <span style={{ fontSize: 11, color: theme.textMuted }}>{isRunning ? 'Agent 工作中' : '空闲'}</span>
          </div>
        </div>
        <div style={{ width: 74 }} />
      </div>

      {/* 消息流 */}
      <div
        ref={scrollRef}
        className="scroll-area"
        style={{ flex: 1, overflowY: 'auto', padding: '10px 0 24px', display: 'flex', flexDirection: 'column' }}
      >
        {items.map((item, index) => (
          <ChatBubble key={`${item.seq}-${index}`} item={item} theme={theme} />
        ))}

        {pendingQuestion && (
          <QuestionCard
            pending={pendingQuestion}
            theme={theme}
            onAnswer={(itemId, optionLabel, custom) => {
              if (sessionId !== null) void respondQuestion(sessionId, pendingQuestion.rpcId, itemId, optionLabel, custom)
            }}
          />
        )}
        {pendingApproval && (
          <ApprovalCard
            approval={pendingApproval}
            theme={theme}
            onRespond={(outcome) => {
              if (sessionId !== null) void respondApproval(sessionId, pendingApproval.rpcId, outcome)
            }}
          />
        )}

        {items.length === 0 && !pendingApproval && !pendingQuestion && (
          <div style={{ textAlign: 'center', marginTop: 90, color: theme.textMuted }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>👋</div>
            <div style={{ fontSize: 13 }}>发送消息开始与 Agent 对话</div>
          </div>
        )}
      </div>

      <Composer theme={theme} running={isRunning} onSend={handleSend} onStop={() => { if (sessionId !== null) void cancelTurn(sessionId) }} />
    </div>
  )
}
