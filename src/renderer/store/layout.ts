import { create } from 'zustand';

export type SplitDirection = 'horizontal' | 'vertical';

export interface PaneNode {
  type: 'pane';
  instanceId: string;
}

export interface SplitNode {
  type: 'split';
  direction: SplitDirection;
  children: LayoutNode[];
  sizes: number[];
}

export type LayoutNode = PaneNode | SplitNode;

interface LayoutState {
  root: LayoutNode | null;
  setRoot: (root: LayoutNode | null) => void;
  addPane: (instanceId: string, direction?: SplitDirection) => void;
  removePane: (instanceId: string) => void;
  setSplitSizes: (path: number[], sizes: number[]) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  root: null,

  setRoot: (root) => set({ root }),

  addPane: (instanceId, direction = 'horizontal') => set(state => {
    const newPane: PaneNode = { type: 'pane', instanceId };
    if (!state.root) return { root: newPane };
    return {
      root: {
        type: 'split',
        direction,
        children: [state.root, newPane],
        sizes: [50, 50],
      },
    };
  }),

  removePane: (instanceId) => set(state => {
    if (!state.root) return state;
    const result = removePaneFromTree(state.root, instanceId);
    return { root: result };
  }),

  setSplitSizes: (path, sizes) => set(state => {
    if (!state.root) return state;
    const newRoot = JSON.parse(JSON.stringify(state.root));
    let node: any = newRoot;
    for (let i = 0; i < path.length; i++) {
      if (node.type === 'split') node = node.children[path[i]];
    }
    if (node.type === 'split') node.sizes = sizes;
    return { root: newRoot };
  }),
}));

function removePaneFromTree(node: LayoutNode, instanceId: string): LayoutNode | null {
  if (node.type === 'pane') {
    return node.instanceId === instanceId ? null : node;
  }
  const remaining = node.children
    .map(child => removePaneFromTree(child, instanceId))
    .filter(Boolean) as LayoutNode[];
  if (remaining.length === 0) return null;
  if (remaining.length === 1) return remaining[0];
  return { ...node, children: remaining, sizes: remaining.map(() => 100 / remaining.length) };
}
