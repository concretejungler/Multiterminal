import { useRef, useCallback, useState } from 'react';
import { useLayoutStore } from '../store/layout';
import { TerminalPane } from './TerminalPane';
import type { LayoutNode } from '../store/layout';

interface SplitPaneContainerProps {
  node: LayoutNode;
  path?: number[];
}

export function SplitPaneContainer({ node, path = [] }: SplitPaneContainerProps) {
  if (node.type === 'pane') {
    return <TerminalPane instanceId={node.instanceId} />;
  }

  const { direction, children, sizes } = node;
  const containerRef = useRef<HTMLDivElement>(null);
  const setSplitSizes = useLayoutStore(s => s.setSplitSizes);

  const handleMouseDown = useCallback((index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    const startPos = direction === 'horizontal' ? e.clientX : e.clientY;
    const container = containerRef.current;
    if (!container) return;
    const totalSize = direction === 'horizontal' ? container.offsetWidth : container.offsetHeight;
    const startSizes = [...sizes];

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = ((currentPos - startPos) / totalSize) * 100;
      const newSizes = [...startSizes];
      newSizes[index] = Math.max(10, startSizes[index] + delta);
      newSizes[index + 1] = Math.max(10, startSizes[index + 1] - delta);
      setSplitSizes(path, newSizes);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [direction, sizes, path, setSplitSizes]);

  return (
    <div
      ref={containerRef}
      className={`flex ${direction === 'horizontal' ? 'flex-row' : 'flex-col'} h-full w-full`}
    >
      {children.map((child, i) => (
        <div key={i} className="flex min-w-0 min-h-0" style={{ flexBasis: `${sizes[i]}%`, flexGrow: 0, flexShrink: 0 }}>
          {i > 0 && (
            <div
              className={`${direction === 'horizontal' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'} bg-gray-800 hover:bg-blue-500 transition-colors flex-shrink-0`}
              onMouseDown={handleMouseDown(i - 1)}
            />
          )}
          <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
            <SplitPaneContainer node={child} path={[...path, i]} />
          </div>
        </div>
      ))}
    </div>
  );
}
