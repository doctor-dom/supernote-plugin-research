interface ConfigButtonListener {
    onClick():void;
}

// Button event listener subscription
interface ConfigButtonSubscription {
    id:number;
    listener:ConfigButtonListener;
    remove:()=>void;
}

export type { ConfigButtonListener, ConfigButtonSubscription };
