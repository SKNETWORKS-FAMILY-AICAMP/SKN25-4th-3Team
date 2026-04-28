interface Props {
  onPick: (question: string) => void;
  onSaveSauce: () => void;
  onResetChat: () => void;
  disabled?: boolean;
}

export default function FAQButtons({
  onPick,
  onSaveSauce,
  onResetChat,
  disabled,
}: Props) {
  const buttons: Array<{ label: string; onClick: () => void; disabled?: boolean }> = [
    {
      label: '🌱 제철 재료 레시피',
      onClick: () => onPick('🌱 제철 재료 레시피'),
      disabled,
    },
    {
      label: '💪 다이어트 레시피',
      onClick: () => onPick('💪 다이어트 레시피'),
      disabled,
    },
    {
      label: '🧴 소스 및 양념 저장하기',
      onClick: onSaveSauce,
    },
    {
      label: '🧹 대화 비우기',
      onClick: onResetChat,
    },
  ];

  return (
    <>
      <div className="faq-lbl">✨ 자주 찾는 기능</div>
      <div className="faq-grid">
        {buttons.map((b) => (
          <button
            key={b.label}
            type="button"
            className="faq-btn"
            onClick={b.onClick}
            disabled={b.disabled}
          >
            {b.label}
          </button>
        ))}
      </div>
    </>
  );
}
