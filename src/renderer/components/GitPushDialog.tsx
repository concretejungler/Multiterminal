import { useState, useEffect } from 'react';

declare const window: Window & { api: any };

interface GitPushDialogProps {
  workingDirectory: string;
  onClose: () => void;
}

export function GitPushDialog({ workingDirectory, onClose }: GitPushDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<any>(null);
  const [pushing, setPushing] = useState(false);

  useEffect(() => {
    (async () => {
      const result = await window.api.gitPush({ workingDirectory, statusOnly: true });
      setLoading(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setStatus(result.status);
      setBranches(result.branches);
      setBranch(result.status.branch);
      setMessage('Update from Multiterminal');
    })();
  }, [workingDirectory]);

  const handlePush = async () => {
    setPushing(true);
    const result = await window.api.gitPush({ workingDirectory, branch, message });
    setPushing(false);
    if (result.success) {
      onClose();
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-[480px]" onClick={e => e.stopPropagation()}>
        <h3 className="text-gray-100 font-medium mb-4">Push to GitHub</h3>
        {loading && <div className="text-gray-400 text-sm">Loading git status...</div>}
        {error && (
          <div className="p-3 bg-red-900/30 border border-red-700/50 rounded text-sm text-red-400 mb-4">{error}</div>
        )}
        {status && !error && (
          <>
            <div className="mb-3 text-xs text-gray-400">
              {status.staged.length} staged, {status.unstaged.length} unstaged, {status.untracked.length} untracked
            </div>
            <label className="block mb-3">
              <span className="text-xs text-gray-400">Branch</span>
              <select className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-2 rounded border border-gray-700" value={branch} onChange={e => setBranch(e.target.value)}>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label className="block mb-4">
              <span className="text-xs text-gray-400">Commit Message</span>
              <input className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-2 rounded border border-gray-700" value={message} onChange={e => setMessage(e.target.value)} />
            </label>
          </>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Cancel</button>
          <button onClick={handlePush} disabled={pushing || !!error || loading} className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm rounded">
            {pushing ? 'Pushing...' : 'Commit & Push'}
          </button>
        </div>
      </div>
    </div>
  );
}
