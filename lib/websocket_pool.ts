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
    lines: {[key: string]: string};
}

export interface FilesearchResults {
    files: {[key: string]: FilesearchFile};
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
    }
}

class PoolWorker {
    constructor(pool: WebsocketPool) {
        this.pool = pool;
        this.ready = false;

        this.idx = pool.workers.length;
        this.token = pool.token;
        this.socket = pool.manager.socket("/");

        const logPrefix = `[Worker #${this.idx}]`
        this.logger = {
            log: (...args: any[]) => console.log(logPrefix, args),
            error: (...args: any[]) => console.error(logPrefix, args),
        }
    }

    available() {
        return this.ready && this.socket.connected;
    }

    connect() {
        const socket = this.socket;
        const logger = this.logger;

        return new Promise<void>((resolve, reject) => {
            let connectedOnce = false;

            socket.on("connect", () => {
                logger.log("Connected to WebSocket");
                socket.emit("auth", this.token);
            });

            socket.on("error", (reason: string) => {
                logger.error(`WebSocket error: ${reason}`);
            });

            socket.on("connect_error", (error: Error) => {
                logger.error(`WebSocket Connect error: ${error.toString()}`);

                if (!connectedOnce) {
                    connectedOnce = true;
                    reject();
                }
            });

            socket.on("disconnect", (reason: string) => {
                logger.error(`Disconnected from WebSocket: ${reason}`);
            });

            socket.on("auth_success", () => {
                logger.log("Auth success");

                if (!connectedOnce) {
                    connectedOnce = true;
                    this.ready = true;
                    resolve();
                }
            });

            setTimeout(() => {
                if (!connectedOnce) {
                    logger.error("Socket didn't connect in time");
                    reject();
                }
            }, 10000);
        });
    }

    disconnect() {
        this.ready = false;

        return new Promise<void>((resolve, reject) => {
            let done = false;

            this.socket.once("disconnect", () => {
                if (!done) {
                    done = true;
                    resolve();
                }
            });

            this.socket.disconnect();

            setTimeout(() => {
                if (!done) {
                    this.logger.error("Socket didn't disconnect in time");
                    done = true;
                    reject();
                }
            }, 5000);
        });
    }

    async run(work: (worker: PoolWorker) => Promise<any>): Promise<any> {
        this.ready = false;

        try {
            return await work(this);
        } catch (e) {
            this.logger.error(e);
            throw e;
        } finally {
            this.ready = true;
            this.pool.processQueue();
        }
    }
}

export interface WebsocketPool {
    manager: WispWebsocketManager;
    workers: PoolWorker[];
    token: string;
    maxWorkers: number;
    queue: ((worker: PoolWorker) => Promise<any>)[];
}

export class WebsocketPool {
    constructor(url: string, token: string) {
        this.maxWorkers = 5;
        this.token = token;

        this.manager = new Manager(url, {
            forceNew: true,
            reconnectionAttempts: 3,
            reconnectionDelayMax: 3000,
            reconnectionDelay: 500,
            timeout: 3000,
            transports: ["websocket"]
        });

        this.workers = [];
        this.queue = [];
    }

    async createWorker() {
        const worker = new PoolWorker(this);
        this.workers.push(worker);
        await worker.connect();

        return worker;
    }

    async disconnect() {
        await Promise.all(this.workers.map((worker: PoolWorker) => worker.disconnect()));
    }

    async processQueue() {
        if (this.queue.length > 0) { return }

        const work = this.queue.shift();
        if (!work) { return }

        if (this.workers.length == 0) {
            await this.createWorker();
        }

        let worker = this.workers.find((worker) => worker.available());
        if (!worker) {
            if (this.workers.length < this.maxWorkers) {
                worker = await this.createWorker();
            } else {
                return
            }
        }

        await worker.run(work);
    }

    async run(work: (worker: PoolWorker) => Promise<any>): Promise<any> {
        return new Promise(async (resolve, reject) => {
            this.queue.push(async (worker) => {
                try {
                    resolve(await work(worker));
                } catch (e) {
                    reject(e);
                }
            });

            this.processQueue();
        });
    }
}
