import { useState } from 'react';
import type { Preferences } from '@/types';

interface Props {
  preferences: Preferences;
  onChange: (next: Preferences) => void;
}

const DIFFICULTY_OPTIONS = ['초보', '보통', '고수'];
const TIME_OPTIONS = ['15분', '20분', '30분'];

export default function PreferencePanel({ preferences, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="pref-header"
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <span>{open ? '▼' : '▶'}</span> ⚙️ 취향 설정
      </div>
      <div className={`pref-body${open ? ' open' : ''}`}>
        <div className="pref-row">
          <label htmlFor="pref-allergy">알레르기</label>
          <input
            id="pref-allergy"
            type="text"
            value={preferences.allergies}
            onChange={(e) => onChange({ ...preferences, allergies: e.target.value })}
          />
        </div>
        <div className="pref-row">
          <label htmlFor="pref-difficulty">난이도</label>
          <select
            id="pref-difficulty"
            value={preferences.difficulty}
            onChange={(e) => onChange({ ...preferences, difficulty: e.target.value })}
          >
            {DIFFICULTY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="pref-row">
          <label htmlFor="pref-time">조리시간</label>
          <select
            id="pref-time"
            value={preferences.cooking_time}
            onChange={(e) => onChange({ ...preferences, cooking_time: e.target.value })}
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
