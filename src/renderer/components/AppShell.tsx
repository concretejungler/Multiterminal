import { useState, useEffect } from 'react';
import { TabBar } from './TabBar';
import { SplitPaneContainer } from './SplitPaneContainer';
import { SettingsSidebar } from './SettingsSidebar';
import { ClipboardHistory } from './ClipboardHistory';
import { GitPushDialog } from './GitPushDialog';
import { NewInstanceDialog } from './NewInstanceDialog';
import { useInstancesStore } from '../store/instances';
import { useLayoutStore } from '../store/layout';
import { useSettingsStore } from '../store/settings';
import { useClipboardStore } from '../store/clipboard';
import { Instance } from '../../shared/types';

declare const window: Window & { api: any };

export function AppShell() {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showGitDialog, setShowGitDialog] = useState(false);
  const instances = useInstancesStore(s => s.instances);
  const activeId = useInstancesStore(s => s.activeInstanceId);
  const addInstance = useInstancesStore(s => s.addInstance);
  const root = useLayoutStore(s => s.root);
  const addPane = useLayoutStore(s => s.addPane);
  const sidebarOpen = useSettingsStore(s => s.sidebarOpen);
  const loadSettings = useSettingsStore(s => s.load);
  const loadClipboard = useClipboardStore(s => s.load);
  const toggleClipboard = useClipboardStore(s => s.togglePanel);

  useEffect(() => {
    loadSettings();
    loadClipboard();
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        toggleClipboard();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleCreateInstance = (name: string, workingDirectory: string, skipPermissions: boolean) => {
    const id = crypto.randomUUID();
    const instance: Instance = {
      id, name, workingDirectory, skipPermissions,
      status: 'stopped', taskDescription: '', progressPercent: null,
      planItems: [], queue: [], soundEnabled: true,
    };
    addInstance(instance);
    addPane(id);
    setShowNewDialog(false);
  };

  const activeInstance = activeId ? instances.get(activeId) : null;

  const handlePaste = (text: string) => {
    if (activeId) window.api.sendInput(activeId, text);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <div className="flex items-center">
        <div className="flex-1">
          <TabBar onNewInstance={() => setShowNewDialog(true)} />
        </div>
        <div className="flex items-center gap-1 px-2 bg-gray-900 border-b border-gray-800 h-10">
          <button onClick={toggleClipboard} className="w-8 h-8 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded flex items-center justify-center text-sm" title="Paste History (Ctrl+Shift+V)">
            📋
          </button>
          <button onClick={() => activeInstance && setShowGitDialog(true)} className="w-8 h-8 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded flex items-center justify-center text-sm" title="Push to GitHub">
            📤
          </button>
        </div>
      </div>
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          {root ? (
            <SplitPaneContainer node={root} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-600">
              <div className="text-center">
                <div className="text-4xl mb-4">⚡</div>
                <div className="text-lg mb-2">Welcome to Multiterminal</div>
                <button onClick={() => setShowNewDialog(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded">
                  + New Claude Instance
                </button>
              </div>
            </div>
          )}
        </div>
        {sidebarOpen && <SettingsSidebar />}
      </div>
      <ClipboardHistory onPaste={handlePaste} />
      {showNewDialog && (
        <NewInstanceDialog instanceCount={instances.size} onClose={() => setShowNewDialog(false)} onCreate={handleCreateInstance} />
      )}
      {showGitDialog && activeInstance && (
        <GitPushDialog workingDirectory={activeInstance.workingDirectory} onClose={() => setShowGitDialog(false)} />
      )}
    </div>
  );
}
