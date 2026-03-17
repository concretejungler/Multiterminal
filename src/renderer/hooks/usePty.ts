import { useEffect } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

declare const window: Window & { api: any };

export function usePty(
  instanceId: string,
  terminal: Terminal | null,
  fitAddon: FitAddon | null,
  updateStatus: (id: string, update: any) => void,
) {
  useEffect(() => {
    if (!terminal) return;

    const offData = window.api.onPtyData((id: string, data: string) => {
      if (id === instanceId) terminal.write(data);
    });

    const offStatus = window.api.onPtyStatus((id: string, status: any) => {
      if (id === instanceId) updateStatus(id, status);
    });

    const offError = window.api.onPtyError((id: string, error: any) => {
      if (id === instanceId) {
        terminal.writeln(`\r\n\x1b[31m[Error] ${error.message}\x1b[0m`);
        updateStatus(id, {
          status: error.type === 'crash' ? 'error' : 'stopped',
          taskDescription: error.message,
          progressPercent: null,
          planItems: [],
        });
      }
    });

    const onData = terminal.onData((data: string) => {
      window.api.sendInput(instanceId, data);
    });

    const onResize = terminal.onResize(({ cols, rows }) => {
      window.api.resizePty(instanceId, cols, rows);
    });

    if (fitAddon) {
      fitAddon.fit();
      const dims = fitAddon.proposeDimensions();
      if (dims) window.api.resizePty(instanceId, dims.cols, dims.rows);
    }

    return () => {
      offData();
      offStatus();
      offError();
      onData.dispose();
      onResize.dispose();
    };
  }, [instanceId, terminal]);
}
