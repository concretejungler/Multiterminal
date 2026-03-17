import { useRef, useEffect, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useClipboardStore } from '../store/clipboard';
import { useInstancesStore } from '../store/instances';
import '@xterm/xterm/css/xterm.css';

declare const window: Window & { api: any };

interface TerminalViewProps {
  instanceId: string;
  instanceName: string;
}

export function TerminalView({ instanceId, instanceName }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const logPaste = useClipboardStore(s => s.logPaste);
  const updateStatus = useInstancesStore(s => s.updateStatus);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create terminal
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
      theme: {
        background: '#0a0a1a',
        foreground: '#e0e0e0',
        cursor: '#ffffff',
        selectionBackground: '#3a3a5c',
      },
      scrollback: 10000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());

    terminal.open(containerRef.current);
    fitAddon.fit();

    // Paste logging
    terminal.attachCustomKeyEventHandler((event) => {
      if (event.ctrlKey && event.key === 'v' && event.type === 'keydown') {
        navigator.clipboard.readText().then(text => {
          if (text) logPaste(text, instanceId, instanceName);
        });
      }
      return true;
    });

    // Wire PTY IPC — this MUST happen in the same effect as terminal creation
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

    // User input → PTY
    const onData = terminal.onData((data: string) => {
      window.api.sendInput(instanceId, data);
    });

    // Resize → PTY
    const onResize = terminal.onResize(({ cols, rows }) => {
      window.api.resizePty(instanceId, cols, rows);
    });

    // Initial resize
    const dims = fitAddon.proposeDimensions();
    if (dims) window.api.resizePty(instanceId, dims.cols, dims.rows);

    // Auto-fit on container resize
    const resizeObserver = new ResizeObserver(() => {
      try { fitAddon.fit(); } catch {}
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      offData();
      offStatus();
      offError();
      onData.dispose();
      onResize.dispose();
      terminal.dispose();
    };
  }, [instanceId]);

  return <div ref={containerRef} className="flex-1 min-h-0" />;
}
