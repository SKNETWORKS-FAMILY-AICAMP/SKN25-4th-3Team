import { useEffect, useState } from 'react';

const SAUCE_LIST: [string, string[]][] = [
  ['기본 양념 및 소스', [
    '진간장','국간장','고추장','된장','쌈장','굴소스','식초','사과식초','발사믹식초',
    '맛술','미림','케첩','마요네즈','설탕','소금','후추','고춧가루','다진 마늘',
    '액젓 (멸치액젓)','액젓 (까나리액젓)','올리고당 / 물엿',
  ]],
  ['기름류', [
    '식용유','올리브오일','참기름','들기름','버터','고추기름','아보카도유','트러플 오일','라드',
  ]],
  ['트렌디 & 에스닉 소스', [
    '스리라차','두반장','타바스코','쯔유','피시소스','바질 페스토','홀그레인 머스터드',
    '우스터소스','XO소스','머스타드',
  ]],
  ['편의형 만능 소스', [
    '불닭 소스','참치액','연두','치킨스톡','돈가스 소스','데리야끼 소스','스테이크 소스','청주',
  ]],
  ['드레싱 및 기타', [
    '오리엔탈 드레싱','참깨 드레싱','허니 머스터드','파마산 치즈 가루','와사비 (고추냉이)',
  ]],
];

interface Props {
  open: boolean;
  initialSelected: string[];
  onClose: () => void;
  onSave: (selected: string[]) => Promise<void> | void;
}

export default function SaucePanel({ open, initialSelected, onClose, onSave }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [busy, setBusy] = useState(false);

  // 패널이 열릴 때마다 초기값 동기화
  useEffect(() => {
    if (open) setSelected(new Set(initialSelected));
  }, [open, initialSelected]);

  const toggle = (item: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      await onSave(Array.from(selected));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`sauce-page${open ? ' active' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="sauce-hdr">
        내 소스 저장하기
        <button type="button" className="sauce-close" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>
      <div className="sauce-body">
        {SAUCE_LIST.map(([cat, items]) => (
          <div key={cat}>
            <div className="cat-label">{cat}</div>
            <div className="check-grid">
              {items.map((it) => (
                <label key={it} className="check-item">
                  <input
                    type="checkbox"
                    value={it}
                    checked={selected.has(it)}
                    onChange={() => toggle(it)}
                  />
                  <span>{it}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="sauce-save-btn"
        onClick={handleSave}
        disabled={busy}
      >
        {busy ? '저장 중...' : '✅ 선택 완료 및 저장'}
      </button>
    </div>
  );
}
