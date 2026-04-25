class ButtonEvent {
  pressEvent: number = 0;

  id: number = 0;

  name: string = '';

  color: number = 0;

  icon: string = '';

  bgColor: number = 0;
}

interface ButtonListener {
  onButtonPress(event: ButtonEvent): void;
}

// Subscription for button event listener
interface ButtonSubscription {
  id: number;
  listener: ButtonListener;
  remove: () => void;
}

export type { ButtonEvent, ButtonListener, ButtonSubscription };
