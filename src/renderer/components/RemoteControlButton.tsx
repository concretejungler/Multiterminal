import { useState } from 'react';
import { useInstancesStore } from '../store/instances';

declare const window: Window & { api: any };

export function RemoteControlButton() {
  const activeId = useInstancesStore(s => s.activeInstanceId);
  const [active, setActive] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const toggleRC = async () => {
    if (!activeId) return;
    if (!active) {
      // Send /remote-control command to the active PTY
      window.api.sendInput(activeId, '/remote-control\n');
      setActive(true);
      setShowInfo(true);
    } else {
      setShowInfo(!showInfo);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggleRC}
        className={`w-8 h-8 hover:bg-gray-800 rounded flex items-center justify-center text-sm ${active ? 'text-green-400' : 'text-gray-500 hover:text-gray-200'}`}
        title="Remote Control — access this session from claude.ai or mobile"
      >
        📡
      </button>

      {showInfo && (
        <div className="absolute right-0 top-10 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-200">Remote Control</h3>
            <button onClick={() => setShowInfo(false)} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
          </div>

          {active ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-400">Remote Control active</span>
              </div>
              <p className="text-xs text-gray-400">
                Check your terminal for the session URL and QR code. Open the URL in claude.ai/code or scan with the Claude mobile app.
              </p>
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-500 uppercase font-medium">How to connect:</p>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>1. Look for the session URL in the terminal output</p>
                  <p>2. Open it in your browser at claude.ai/code</p>
                  <p>3. Or scan the QR code with Claude iOS/Android app</p>
                </div>
              </div>
              <div className="bg-gray-800 rounded p-2">
                <p className="text-[10px] text-gray-500 uppercase font-medium mb-1">Requirements</p>
                <ul className="text-xs text-gray-400 space-y-0.5">
                  <li>• Signed in via /login (not API key)</li>
                  <li>• Pro, Max, Team, or Enterprise plan</li>
                  <li>• Claude Code v2.1.51+</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  if (activeId) window.api.sendInput(activeId, '/remote-control\n');
                }}
                className="w-full px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded"
              >
                Refresh connection
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">
                Enable Remote Control to access this Claude session from any device — your browser at claude.ai/code or the Claude mobile app.
              </p>
              <p className="text-xs text-gray-500">
                Your session stays local. Nothing moves to the cloud.
              </p>
              <button
                onClick={toggleRC}
                className="w-full px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded"
              >
                Enable Remote Control
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
