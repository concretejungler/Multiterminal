import { useState, useEffect } from 'react';

declare const window: Window & { api: any };

interface ClaudeMdTabProps {
  instanceId?: string;
}

interface MdFile {
  path: string;
  name: string;
  scope: 'project' | 'user' | 'rules';
  content: string;
}

export function ClaudeMdTab({ instanceId }: ClaudeMdTabProps) {
  const [files, setFiles] = useState<MdFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFiles();
  }, [instanceId]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const result = await window.api.getClaudeMdFiles(instanceId);
      setFiles(result || []);
      if (result?.length > 0 && !activeFile) {
        setActiveFile(result[0].path);
        setEditContent(result[0].content);
      }
    } catch {
      setFiles([]);
    }
    setLoading(false);
  };

  const selectFile = (file: MdFile) => {
    setActiveFile(file.path);
    setEditContent(file.content);
    setDirty(false);
  };

  const handleSave = async () => {
    if (!activeFile) return;
    setSaving(true);
    await window.api.saveClaudeMdFile(activeFile, editContent);
    setSaving(false);
    setDirty(false);
    loadFiles();
  };

  const handleCreateRule = async () => {
    const name = prompt('Rule file name (e.g. code-style):');
    if (!name) return;
    const path = `.claude/rules/${name.replace(/\.md$/, '')}.md`;
    await window.api.saveClaudeMdFile(path, `# ${name}\n\nAdd your rules here.\n`);
    loadFiles();
  };

  const scopeIcon = (scope: string) => {
    switch (scope) {
      case 'project': return '📁';
      case 'user': return '👤';
      case 'rules': return '📏';
      default: return '📄';
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading CLAUDE.md files...</div>;
  }

  return (
    <div className="flex h-full">
      {/* File list sidebar */}
      <div className="w-56 border-r border-gray-800 flex flex-col">
        <div className="p-3 border-b border-gray-800">
          <div className="text-xs font-medium text-gray-400 uppercase mb-2">Files</div>
          <button
            onClick={handleCreateRule}
            className="w-full text-xs px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded flex items-center gap-1"
          >
            + New Rule
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {files.map(file => (
            <button
              key={file.path}
              onClick={() => selectFile(file)}
              className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${
                activeFile === file.path ? 'bg-gray-800 text-gray-100' : 'text-gray-400 hover:bg-gray-800/50'
              }`}
            >
              <span>{scopeIcon(file.scope)}</span>
              <div className="truncate">
                <div className="truncate">{file.name}</div>
                <div className="text-[10px] text-gray-600 truncate">{file.scope}</div>
              </div>
            </button>
          ))}
          {files.length === 0 && (
            <div className="p-3 text-xs text-gray-600">
              No CLAUDE.md files found. Create one to add instructions for Claude.
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {activeFile ? (
          <>
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
              <span className="text-xs text-gray-400 truncate">{activeFile}</span>
              <div className="flex items-center gap-2">
                {dirty && <span className="text-xs text-yellow-500">Unsaved</span>}
                <button
                  onClick={handleSave}
                  disabled={!dirty || saving}
                  className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
            <textarea
              className="flex-1 bg-gray-950 text-gray-200 text-sm font-mono p-4 resize-none focus:outline-none"
              value={editContent}
              onChange={e => { setEditContent(e.target.value); setDirty(true); }}
              spellCheck={false}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-600">
            Select a file to edit
          </div>
        )}
      </div>
    </div>
  );
}
