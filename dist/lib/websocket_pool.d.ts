import { Socket, Manager } from "socket.io-client";
interface ServerToClientEvents {
    "error": (message: string) => void;
    "auth_success": (message: string) => void;
    "filesearch-results": (data: FilesearchResults) => void;
    "git-error": (data: string) => void;
    "git-success": (message?: string) => void;
    "git-clone": (data: GitCloneData) => void;
    "git-pull": (data: GitPullData) => void;
    "console": (message: ConsoleMessage) => void;
}
interface ClientToServerEvents {
    "auth": (token: string) => void;
    "filesearch-start": (query: string) => void;
    "git-clone": (data: GitCloneData) => void;
    "git-pull": (data: GitPullData) => void;
    "send command": (command: string) => void;
}
export interface ConsoleMessage {
    type: string;
    line: string;
}
export interface GitCloneData {
    dir: string;
    url: string;
    branch: string;
    authkey?: string | undefined;
}
export interface GitCloneResult {
    isPrivate: boolean;
}
export interface GitPullData {
    dir: string;
    authkey?: string;
}
export interface GitPullResult {
    output: string;
    isPrivate: boolean;
}
interface FilesearchFile {
    results: number;
    lines: {
        [key: string]: string;
    };
}
export interface FilesearchResults {
    files: {
        [key: string]: FilesearchFile;
    };
    tooMany: boolean;
}
export type WispWebsocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export type WispWebsocketManager = Manager<ServerToClientEvents, ClientToServerEvents>;
interface PoolWorker {
    pool: WebsocketPool;
    socket: WispWebsocket;
    idx: number;
    token: string;
    ready: boolean;
    logger: {
        log(...args: any[]): void;
        error(...args: any[]): void;
    };
}
declare class PoolWorker {
    constructor(pool: WebsocketPool);
    available(): boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    run(work: (worker: PoolWorker) => Promise<any>): Promise<any>;
}
export interface WebsocketPool {
    manager: WispWebsocketManager;
    workers: PoolWorker[];
    token: string;
    maxWorkers: number;
    queue: ((worker: PoolWorker) => Promise<any>)[];
}
export declare class WebsocketPool {
    constructor(url: string, token: string);
    createWorker(): Promise<PoolWorker>;
    disconnect(): Promise<void>;
    processQueue(): Promise<void>;
    run(work: (worker: PoolWorker) => Promise<any>): Promise<any>;
}
export {};
