interface PluginEventListener {
    onMsg(msg:any):void;
}

// Button event listener subscription
interface PluginEventSubscription {
    id?:number;
    event?:string;
    listener:PluginEventListener;
    remove:()=>void;
}

export type { PluginEventListener, PluginEventSubscription };
