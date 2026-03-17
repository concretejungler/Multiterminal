export function AppShell() {
  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <div className="flex items-center h-10 bg-gray-900 border-b border-gray-800 px-2">
        <span className="text-sm text-gray-400">Multiterminal</span>
      </div>
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Click [+] to start a new Claude instance
      </div>
    </div>
  );
}
