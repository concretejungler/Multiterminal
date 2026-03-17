import { create } from 'zustand';
import { Instance, QueueItem, PlanItem } from '../../shared/types';

interface InstancesState {
  instances: Map<string, Instance>;
  activeInstanceId: string | null;
  addInstance: (instance: Instance) => void;
  removeInstance: (id: string) => void;
  setActive: (id: string) => void;
  updateStatus: (id: string, update: {
    status: Instance['status'];
    taskDescription: string;
    progressPercent: number | null;
    planItems: PlanItem[];
  }) => void;
  updateQueue: (id: string, queue: QueueItem[]) => void;
  toggleSound: (id: string) => void;
  renameInstance: (id: string, name: string) => void;
}

export const useInstancesStore = create<InstancesState>((set) => ({
  instances: new Map(),
  activeInstanceId: null,

  addInstance: (instance) => set(state => {
    const next = new Map(state.instances);
    next.set(instance.id, instance);
    return { instances: next, activeInstanceId: instance.id };
  }),

  removeInstance: (id) => set(state => {
    const next = new Map(state.instances);
    next.delete(id);
    const activeInstanceId = state.activeInstanceId === id
      ? (next.keys().next().value ?? null)
      : state.activeInstanceId;
    return { instances: next, activeInstanceId };
  }),

  setActive: (id) => set({ activeInstanceId: id }),

  updateStatus: (id, update) => set(state => {
    const next = new Map(state.instances);
    const inst = next.get(id);
    if (inst) next.set(id, { ...inst, ...update });
    return { instances: next };
  }),

  updateQueue: (id, queue) => set(state => {
    const next = new Map(state.instances);
    const inst = next.get(id);
    if (inst) next.set(id, { ...inst, queue });
    return { instances: next };
  }),

  toggleSound: (id) => set(state => {
    const next = new Map(state.instances);
    const inst = next.get(id);
    if (inst) next.set(id, { ...inst, soundEnabled: !inst.soundEnabled });
    return { instances: next };
  }),

  renameInstance: (id, name) => set(state => {
    const next = new Map(state.instances);
    const inst = next.get(id);
    if (inst) next.set(id, { ...inst, name });
    return { instances: next };
  }),
}));
