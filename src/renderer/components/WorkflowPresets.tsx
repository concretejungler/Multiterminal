export function WorkflowPresets() {
  const presets = [
    { name: 'Debugging', icon: '🐛', description: 'Systematic debugging with verbose logging' },
    { name: 'Security Audit', icon: '🔒', description: 'Security scanning and OWASP checks' },
    { name: 'E2E Testing', icon: '🧪', description: 'End-to-end test runner' },
  ];

  return (
    <div>
      <h4 className="text-xs font-medium text-gray-400 uppercase mb-2">Workflow Presets</h4>
      <div className="space-y-1">
        {presets.map(preset => (
          <button key={preset.name} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-800 rounded text-sm">
            <span>{preset.icon}</span>
            <div>
              <div className="text-gray-200">{preset.name}</div>
              <div className="text-xs text-gray-500">{preset.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
