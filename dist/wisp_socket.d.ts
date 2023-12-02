import { WebsocketPool } from "./lib/websocket_pool.js";
export interface WispSocket {
    pool: WebsocketPool;
    logger: any;
    api: any;
    ghToken: string;
    consoleCallbacks: ((message: string) => void)[];
}
export declare class WispSocket {
    constructor(logger: any, api: any, ghToken: string);
    setDetails(): Promise<void>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    filesearch(query: string): Promise<void>;
    gitPull(dir: string): Promise<void>;
    gitClone(url: string, dir: string, branch: string): Promise<void>;
    setupConsoleListener(): void;
    addConsoleListener(callback: (message: string) => void): void;
    removeConsoleListener(callback: (message: string) => void): void;
    sendCommandNonce(nonce: string, command: string, timeout?: number): Promise<any>;
}
