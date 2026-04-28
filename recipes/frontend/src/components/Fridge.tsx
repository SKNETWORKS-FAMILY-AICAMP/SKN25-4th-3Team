import { useEffect, useRef, type ReactNode, type MouseEvent } from 'react';

interface Props {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  /** 내부(채팅 영역) — 문이 열린 후 보이는 콘텐츠 */
  innerSlot: ReactNode;
  /** 별도 페이지(소스 저장) — z-index로 inner 위에 떠 있음 */
  saucePageSlot: ReactNode;
}

export default function Fridge({ open, onOpen, onClose: _onClose, innerSlot, saucePageSlot }: Props) {
  void _onClose; // 외부 토글 버튼 전용
  const fridgeRef = useRef<HTMLDivElement>(null);

  // 열릴 때 1.1초 후 입력창 포커스 (도어 애니메이션 종료 직후)
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const input = fridgeRef.current?.querySelector<HTMLInputElement>('#msgInput');
      input?.focus();
    }, 1100);
    return () => window.clearTimeout(t);
  }, [open]);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (open) return;
    // 닫힌 상태에서 냉장고 아무 곳이나 누르면 열림
    e.stopPropagation();
    onOpen();
  };

  return (
    <div
      ref={fridgeRef}
      className={`fridge${open ? ' open' : ''}`}
      id="fridge"
      onClick={handleClick}
    >
      <div className="fridge-top" />

      {/* 냉장고 내부(채팅) — 클릭 이벤트 버블링 차단해서 닫는 것 방지 */}
      <div className="inner" onClick={(e) => e.stopPropagation()}>
        {innerSlot}
      </div>

      {/* 소스 페이지 */}
      {saucePageSlot}

      {/* 냉장고 문 */}
      <div className="doors">
        <div className="door door-l">
          <div className="d-handle" />
          <div className="door-logo">🧊</div>
          <div className="door-hint">탭하여 시작</div>
        </div>
        <div className="door door-r">
          <div className="d-handle" />
          <div className="door-logo">🍳</div>
          <div className="door-hint">탭하여 시작</div>
        </div>
      </div>
    </div>
  );
}
