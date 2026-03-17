import { useTerminal } from '../hooks/useTerminal';
import { usePty } from '../hooks/usePty';
import { useClipboardStore } from '../store/clipboard';
import { useInstancesStore } from '../store/instances';
import '@xterm/xterm/css/xterm.css';

interface TerminalViewProps {
  instanceId: string;
  instanceName: string;
}

export function TerminalView({ instanceId, instanceName }: TerminalViewProps) {
  const logPaste = useClipboardStore(s => s.logPaste);
  const updateStatus = useInstancesStore(s => s.updateStatus);
  const { terminalRef, fitAddonRef, containerRef } = useTerminal(instanceId, instanceName, logPaste);

  usePty(instanceId, terminalRef.current, fitAddonRef.current, updateStatus);

  return <div ref={containerRef} className="flex-1 min-h-0" />;
}
