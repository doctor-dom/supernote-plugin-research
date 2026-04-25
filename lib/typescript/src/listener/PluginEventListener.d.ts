interface PluginEventListener {
    onMsg(msg: any): void;
}
interface PluginEventSubscription {
    id?: number;
    event?: string;
    listener: PluginEventListener;
    remove: () => void;
}
export type { PluginEventListener, PluginEventSubscription };
//# sourceMappingURL=PluginEventListener.d.ts.map