interface Props {
  onPick: (question: string) => void;
  disabled?: boolean;
}

const FAQS = [
  '🥕 재료로 레시피 찾기',
  '📅 오늘 뭐 먹지?',
  '🔥 재료 소진 플랜',
  '💪 다이어트 레시피',
];

export default function FAQButtons({ onPick, disabled }: Props) {
  return (
    <>
      <div className="faq-lbl">✨ 자주 찾는 기능</div>
      <div className="faq-grid">
        {FAQS.map((q) => (
          <button
            key={q}
            type="button"
            className="faq-btn"
            onClick={() => onPick(q)}
            disabled={disabled}
          >
            {q}
          </button>
        ))}
      </div>
    </>
  );
}
