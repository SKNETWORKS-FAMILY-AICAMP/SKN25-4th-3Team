import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { ChatMessage } from '@/types';
import MessageBubble from './MessageBubble';

interface Props {
  messages: ChatMessage[];
  isSending: boolean;
  draft: string;
  setDraft: (v: string) => void;
  onSend: (text: string) => void;
  onRequestToast: (msg: string) => void;
  /** 채팅창 위에 자주쓰기/취향/액션 버튼을 끼워넣는 슬롯 */
  bottomSlot?: React.ReactNode;
}

export default function Chat({
  messages,
  isSending,
  draft,
  setDraft,
  onSend,
  onRequestToast,
  bottomSlot,
}: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);

  // 새 메시지 도착 시 스크롤을 맨 아래로
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const submit = () => {
    const v = draft.trim();
    if (!v || isSending) return;
    onSend(v);
    setDraft('');
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <>
      <div className="hdr">
        <div className="hdr-av">🍳</div>
        <div>
          <div className="hdr-title">냉털봇</div>
          <div className="hdr-sub">재료 소진 레시피 AI · 3단 Fallback</div>
        </div>
      </div>

      <div className="chat" ref={bodyRef}>
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} onRequestToast={onRequestToast} />
        ))}
      </div>

      <div className="bottom-area">{bottomSlot}</div>

      <div className="inp-area">
        <input
          type="text"
          id="msgInput"
          placeholder="재료를 입력하세요..."
          autoComplete="off"
          value={draft}
          disabled={isSending}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
        />
        <button
          type="button"
          className="send-btn"
          onClick={submit}
          disabled={isSending}
          aria-label="보내기"
        >
          <svg viewBox="0 0 24 24">
            <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </>
  );
}
