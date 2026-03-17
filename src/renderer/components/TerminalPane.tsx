import { useState } from 'react';
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

  if (!instance) return null;

  const handleStart = async (skipPermissions: boolean) => {
    await window.api.createPty({
      id: instanceId,
      workingDirectory: instance.workingDirectory,
      skipPermissions,
    });
    setStarted(true);
  };

  const handleSend = (text: string) => {
    window.api.sendInput(instanceId, text + '\n');
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 border border-gray-800 rounded overflow-hidden">
      <StatusBar instanceId={instanceId} />
      <TerminalView instanceId={instanceId} instanceName={instance.name} />
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
