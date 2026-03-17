import { useState } from 'react';
import { useInstancesStore } from '../store/instances';

interface PlanChecklistProps {
  instanceId: string;
}

export function PlanChecklist({ instanceId }: PlanChecklistProps) {
  const planItems = useInstancesStore(s => s.instances.get(instanceId)?.planItems ?? []);
  const [collapsed, setCollapsed] = useState(false);

  if (planItems.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-gray-600 flex items-center gap-2 border-t border-gray-800">
        <span>📋</span> No plan detected
      </div>
    );
  }

  const completed = planItems.filter(p => p.completed).length;

  return (
    <div className="border-t border-gray-800">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center w-full px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800/50"
      >
        <span className="mr-2">{collapsed ? '▶' : '▼'}</span>
        Plan ({completed}/{planItems.length})
      </button>
      {!collapsed && (
        <div className="px-3 pb-2 max-h-40 overflow-y-auto">
          {planItems.map((item, i) => (
            <div key={i} className="flex items-start gap-2 py-0.5 text-xs">
              <span className={item.completed ? 'text-green-400' : 'text-gray-600'}>
                {item.completed ? '✅' : '⬜'}
              </span>
              <span className={item.completed ? 'text-gray-500 line-through' : 'text-gray-300'}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
