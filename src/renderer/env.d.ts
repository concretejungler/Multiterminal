declare interface Window {
  api: {
    createPty: (config: { id: string; workingDirectory: string; skipPermissions: boolean }) => Promise<any>;
    sendInput: (id: string, data: string) => void;
    resizePty: (id: string, cols: number, rows: number) => void;
    killPty: (id: string) => Promise<void>;
    restartPty: (id: string) => Promise<void>;
    onPtyData: (callback: (id: string, data: string) => void) => () => void;
    onPtyStatus: (callback: (id: string, status: any) => void) => () => void;
    onPtyError: (callback: (id: string, error: any) => void) => () => void;
    onQueueSendNext: (callback: (id: string) => void) => () => void;
    onNotificationDone: (callback: (id: string, config: any) => void) => () => void;
    getSettings: () => Promise<any>;
    setSettings: (settings: any) => Promise<void>;
    gitPush: (config: any) => Promise<any>;
    logPaste: (entry: any) => void;
    getClipboardHistory: (query?: string) => Promise<any[]>;
    queueAdd: (instanceId: string, item: any) => Promise<void>;
    queueRemove: (instanceId: string, itemId: string) => Promise<void>;
    queueReorder: (instanceId: string, itemIds: string[]) => Promise<void>;
    queueGet: (instanceId: string) => Promise<any[]>;
    forceIdle: (id: string) => Promise<void>;
  };
}
