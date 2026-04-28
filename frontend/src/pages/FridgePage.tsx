// =============================================================
// 메인 페이지 — 냉장고 + 챗봇 + 취향 + 소스 패널 + 토스트.
// 기존 fridge.js (357줄)의 동작을 React state로 1:1 이식.
// =============================================================
import { useEffect, useState } from 'react';
import Fridge from '@/components/Fridge';
import Chat from '@/components/Chat';
import FAQButtons from '@/components/FAQButtons';
import PreferencePanel from '@/components/PreferencePanel';
import SaucePanel from '@/components/SaucePanel';
import Toast from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { postChat, postPrefs, postReset } from '@/api/recipes';
import type { ChatMessage, Preferences } from '@/types';

export default function FridgePage() {
  const { initialMessages, preferences: initialPrefs, setPreferences: persistCtxPrefs } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [preferences, setLocalPrefs] = useState<Preferences>(initialPrefs);
  const [isSending, setIsSending] = useState(false);
  const [fridgeOpen, setFridgeOpen] = useState(false);
  const [sauceOpen, setSauceOpen] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastToken, setToastToken] = useState(0);

  // 컨텍스트 초기 데이터가 비동기로 도착하면 동기화 (페이지 첫 진입 시)
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);
  useEffect(() => {
    setLocalPrefs(initialPrefs);
  }, [initialPrefs]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastToken((t) => t + 1);
  };

  // 취향 변경 시 즉시 컨텍스트 동기화 (DB는 소스 저장 시 한 번에 보냄)
  const handlePrefChange = (next: Preferences) => {
    setLocalPrefs(next);
    persistCtxPrefs(next);
  };

  const sendQuestion = async (question: string) => {
    if (isSending || !question) return;

    setMessages((prev) => [...prev, { role: 'user', text: question }]);

    // 로딩 메시지를 추가 후 응답 도착 시 교체
    const LOADING_TEXT = '🍳 레시피를 찾고 있어요...';
    setMessages((prev) => [...prev, { role: 'bot', text: LOADING_TEXT }]);
    setIsSending(true);

    // 서버에 보낼 chat_history는 user/bot의 마지막 8개
    const historyForApi = messages
      .filter((m) => m.text !== LOADING_TEXT)
      .slice(-8)
      .map((m) => ({ role: m.role, text: m.text }));

    try {
      const data = await postChat({
        question,
        allergies: preferences.allergies || '없음',
        difficulty: preferences.difficulty || '초보',
        cooking_time: preferences.cooking_time || '20분',
        saved_sauces: preferences.saved_sauces.length
          ? preferences.saved_sauces.join(', ')
          : '없음',
        chat_history: historyForApi,
      });

      // 마지막 로딩 메시지를 실제 응답으로 교체
      setMessages((prev) => {
        const next = prev.slice();
        // 마지막 봇 메시지(로딩) 찾아서 교체
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].role === 'bot' && next[i].text === LOADING_TEXT) {
            next[i] = {
              role: 'bot',
              text: data.answer || '레시피 서버 응답 형식이 올바르지 않습니다.',
              source: data.source,
              candidates: data.candidates,
            };
            break;
          }
        }
        return next;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => {
        const next = prev.slice();
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].role === 'bot' && next[i].text === LOADING_TEXT) {
            next[i] = { role: 'bot', text: '서버 요청에 실패했습니다.\n' + msg };
            break;
          }
        }
        return next;
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSauceSave = async (selected: string[]) => {
    const nextPrefs: Preferences = { ...preferences, saved_sauces: selected };
    setLocalPrefs(nextPrefs);
    persistCtxPrefs(nextPrefs);

    try {
      await postPrefs({ saved_sauces: selected });
    } catch (e) {
      console.warn('소스 저장 실패', e);
    }

    setSauceOpen(false);
    const note = selected.length
      ? `소스 저장 완료! 🎉 현재 사용 가능: ${selected.join(', ')}`
      : '선택된 소스가 없어요 😅 보유 중인 소스를 체크해 주세요!';
    setMessages((prev) => [...prev, { role: 'bot', text: note }]);
  };

  const handleReset = async () => {
    if (!confirm('대화 내역을 모두 비우시겠어요?')) return;
    try {
      await postReset();
    } catch (e) {
      console.warn(e);
    }
    setMessages([
      { role: 'bot', text: '안녕하세요! 🧅 냉장고 속 재료를 알려주시면 딱 맞는 레시피를 찾아드릴게요!' },
      { role: 'bot', text: '냉장고 문을 열고 재료를 직접 입력해보세요 👇' },
    ]);
  };

  return (
    <div className="page-wrap">
      <div className="scene">
        <Fridge
          open={fridgeOpen}
          onOpen={() => setFridgeOpen(true)}
          onClose={() => setFridgeOpen(false)}
          innerSlot={
            <Chat
              messages={messages}
              isSending={isSending}
              onSend={sendQuestion}
              onRequestToast={showToast}
              bottomSlot={
                <>
                  <FAQButtons onPick={sendQuestion} disabled={isSending} />
                  <PreferencePanel preferences={preferences} onChange={handlePrefChange} />
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => setSauceOpen(true)}
                  >
                    🧴 소스 및 양념 저장하기
                  </button>
                  <button
                    type="button"
                    className="action-btn ghost"
                    onClick={handleReset}
                  >
                    🧹 대화 비우기
                  </button>
                </>
              }
            />
          }
          saucePageSlot={
            <SaucePanel
              open={sauceOpen}
              initialSelected={preferences.saved_sauces}
              onClose={() => setSauceOpen(false)}
              onSave={handleSauceSave}
            />
          }
        />

        <div className="scene-foot">
          <button
            className="big-btn"
            type="button"
            onClick={() => setFridgeOpen((v) => !v)}
          >
            {fridgeOpen ? '🚪 냉장고 닫기' : '🧊 냉털 AI 시작하기'}
          </button>
        </div>
      </div>

      <Toast message={toastMsg} token={toastToken} />
    </div>
  );
}
