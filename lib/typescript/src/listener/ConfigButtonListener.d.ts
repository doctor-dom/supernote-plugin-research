interface ConfigButtonListener {
    onClick(): void;
}
interface ConfigButtonSubscription {
    id: number;
    listener: ConfigButtonListener;
    remove: () => void;
}
export type { ConfigButtonListener, ConfigButtonSubscription };
//# sourceMappingURL=ConfigButtonListener.d.ts.map