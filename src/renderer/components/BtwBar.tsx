import { useState } from 'react';
import { useInstancesStore } from '../store/instances';

declare const window: Window & { api: any };

export function BtwBar() {
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const activeId = useInstancesStore(s => s.activeInstanceId);

  const handleAsk = async () => {
    if (!question.trim() || !activeId) return;
    setLoading(true);
    setAnswer(null);

    // Send /btw to the active PTY — the answer appears in the terminal
    // For a nicer UX, we also run headless to capture the response
    await window.api.sendBtw(activeId, question.trim());
    setLoading(false);
    setQuestion('');
    setExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAsk();
    }
    if (e.key === 'Escape') {
      setExpanded(false);
      setQuestion('');
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-8 h-8 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded flex items-center justify-center text-sm"
        title="/btw — Quick ask without interrupting Claude"
      >
        💬
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-2">
      <span className="text-xs text-gray-500 whitespace-nowrap">/btw</span>
      <input
        className="w-64 bg-gray-800 text-gray-100 text-xs px-2 py-1 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
        placeholder="Quick question (won't interrupt Claude)..."
        value={question}
        onChange={e => setQuestion(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      <button
        onClick={handleAsk}
        disabled={!question.trim() || !activeId || loading}
        className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded"
      >
        {loading ? '...' : 'Ask'}
      </button>
      <button onClick={() => { setExpanded(false); setQuestion(''); }} className="text-xs text-gray-600 hover:text-gray-300">
        ✕
      </button>
    </div>
  );
}
