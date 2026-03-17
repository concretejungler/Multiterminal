import { useState, useEffect } from 'react';
import { StatusBar } from './StatusBar';
import { TerminalView } from './TerminalView';
import { PlanChecklist } from './PlanChecklist';
import { CommandQueue } from './CommandQueue';
import { InputBar } from './InputBar';
import { useInstancesStore } from '../store/instances';

declare const window: Window & { api: any };

interface TerminalPaneProps {
  instanceId: string;
}

export function TerminalPane({ instanceId }: TerminalPaneProps) {
  const instance = useInstancesStore(s => s.instances.get(instanceId));
  const [started, setStarted] = useState(false);
  const [hasMemory, setHasMemory] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  useEffect(() => {
    // Check if session memory exists for this instance
    (async () => {
      const memory = await window.api.getSessionMemory(instanceId);
      setHasMemory(!!memory);
    })();
  }, [instanceId]);

  if (!instance) return null;

  const handleStart = async (skipPermissions: boolean) => {
    await window.api.createPty({
      id: instanceId,
      workingDirectory: instance.workingDirectory,
      skipPermissions,
    });
    setStarted(true);

    if (hasMemory) {
      setShowResumePrompt(true);
    }
  };

  const handleResume = async () => {
    const memory = await window.api.getSessionMemory(instanceId);
    if (memory) {
      setTimeout(() => {
        window.api.sendInput(instanceId,
          `I'm resuming a previous session. Here's the session memory from last time:\n\n${memory}\n\nPlease review this context and continue where we left off.\n`
        );
      }, 2000);
    }
    setShowResumePrompt(false);
  };

  const handleSend = (text: string) => {
    window.api.sendInput(instanceId, text + '\n');
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 border border-gray-800 rounded overflow-hidden">
      <StatusBar instanceId={instanceId} />
      <TerminalView instanceId={instanceId} instanceName={instance.name} />

      {/* Resume session prompt */}
      {showResumePrompt && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-900/20 border-t border-blue-800/30">
          <span className="text-xs text-blue-400 flex-1">Previous session memory found. Resume where you left off?</span>
          <button onClick={handleResume} className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded">Resume</button>
          <button onClick={() => setShowResumePrompt(false)} className="text-xs text-gray-500 hover:text-gray-300">Dismiss</button>
        </div>
      )}

      <PlanChecklist instanceId={instanceId} />
      <CommandQueue instanceId={instanceId} />
      <InputBar
        instanceId={instanceId}
        onSend={handleSend}
        isStarted={started}
        onStart={handleStart}
      />
    </div>
  );
}
