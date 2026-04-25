declare class ButtonEvent {
    pressEvent: number;
    id: number;
    name: string;
    color: number;
    icon: string;
    bgColor: number;
}
interface ButtonListener {
    onButtonPress(event: ButtonEvent): void;
}
interface ButtonSubscription {
    id: number;
    listener: ButtonListener;
    remove: () => void;
}
export type { ButtonEvent, ButtonListener, ButtonSubscription };
//# sourceMappingURL=ButtonListener.d.ts.map