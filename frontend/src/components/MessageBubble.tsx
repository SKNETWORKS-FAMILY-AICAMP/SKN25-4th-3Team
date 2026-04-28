import type { ChatMessage, RecipeCandidate, Source } from '@/types';
import CandidateCard from './CandidateCard';

const SOURCE_LABEL: Record<Source, string> = {
  db: 'DB',
  web: 'WEB',
  llm: 'LLM 추정',
};

interface Props {
  message: ChatMessage;
  onRequestToast: (msg: string) => void;
}

export default function MessageBubble({ message, onRequestToast }: Props) {
  const isUser = message.role === 'user';
  if (isUser) {
    return (
      <div className="m u">
        <div className="bub u">
          {renderMultiline(message.text)}
        </div>
        <div className="m-icon">🙋</div>
      </div>
    );
  }

  return (
    <div className="m">
      <div className="m-icon">🤖</div>
      <div className="bub b">
        {message.source && (
          <>
            <span className={`src-badge ${message.source}`}>
              {SOURCE_LABEL[message.source]}
            </span>
            <br />
          </>
        )}
        {renderMultiline(message.text)}
        {message.candidates && message.candidates.length > 0 && message.source && (
          <CandidateList
            candidates={message.candidates}
            source={message.source}
            onRequestToast={onRequestToast}
          />
        )}
      </div>
    </div>
  );
}

function renderMultiline(text: string) {
  // 백엔드에서 \n 으로 줄바꿈 — React에선 그냥 white-space pre-wrap도 가능하지만,
  // 기존 .bub 스타일이 line-height 1.6이라 <br/> 분할이 더 자연스러움.
  const lines = text.split('\n');
  return lines.map((line, i) => (
    <span key={i}>
      {line}
      {i < lines.length - 1 && <br />}
    </span>
  ));
}

function CandidateList({
  candidates,
  source,
  onRequestToast,
}: {
  candidates: RecipeCandidate[];
  source: Source;
  onRequestToast: (msg: string) => void;
}) {
  return (
    <div className="cand-list">
      {candidates.map((c, idx) => (
        <CandidateCard
          key={c.mongo_recipe_id || `${idx}-${c.title}`}
          candidate={c}
          source={source}
          onRequestToast={onRequestToast}
        />
      ))}
    </div>
  );
}
