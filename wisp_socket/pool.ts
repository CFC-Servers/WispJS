import { io, Socket, Manager } from "socket.io-client";

interface ServerToClientEvents {
    "error": (message: string) => void;
    "auth_success": (message: string) => void;
    "filesearch-results": (data: FilesearchResults) => void;
    "git-error": (data: string) => void;
    "git-success": (message?: string) => void;
    "git-clone": (data: GitCloneData) => void;
    "git-pull": (data: GitPullData) => void;
    "console": (message: ConsoleMessage) => void;
    "initial status": (message: any) => void;
}


interface ClientToServerEvents {
    "auth": (token: string) => void;
    "filesearch-start": (query: string) => void;
    "git-clone": (data: GitCloneData) => void;
    "git-pull": (data: GitPullData) => void;
    "send command": (command: string) => void;
}


/**
 * The struct sent from the server containing console messages
 *
 * @param type The type of message. Currently unknown what varients exist
 * @param line The actual content of the console messages
 *
 * @internal
 */
export interface ConsoleMessage {
    type: string;
    line: string;
}


/**
 * Struct used to initiate a Git Clone action
 *
 * @param dir The directory to clone into
 * @param url The HTTPS URL to clone
 * @param branch The repository branch
 * @param authkey The authentication key to use when pulling
 *
 * @internal
 */
export interface GitCloneData {
    dir: string;
    url: string;
    branch: string;
    authkey?: string | undefined;
}


/**
 * Return struct after finishing a Git Clone action
 *
 * @param isPrivate Whether or not the repository is private
 *
 * @internal
 */
export interface GitCloneResult {
    isPrivate: boolean;
}


/**
 * Struct used to initiate a Git Pull action
 *
 * @param dir The directory to pull
 * @param authkey The authentication key to use when pulling
 *
 * @internal
 */
export interface GitPullData {
    dir: string;
    authkey?: string;
}


/**
 * Struct returned after a Git Pull action finishes
 *
 * @param output The actual output
 * @param isPrivate Whether or not the repository is private
 *
 * @internal
 */
export interface GitPullResult {
    output: string;
    isPrivate: boolean;
}


/**
 * An individual filesearch result
 *
 * @param results How many results are present in the file
 * @param lines A map of line numbers to their contents. These lines include nearby context of matched lines
 *
 * @internal
 */
interface FilesearchFile {
    results: number;
    lines: {[key: string]: string};
}


/**
 * The results of a file search
 *
 * @param files A map of file names to matched+context lines within each file
 * @param tooMany Whether or not there were too many results to display
 *
 * @internal
 */
export interface FilesearchResults {
    files: {[key: string]: FilesearchFile};
    tooMany: boolean;
}


export type WispWebsocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export type WispWebsocketManager = Manager<ServerToClientEvents, ClientToServerEvents>;


/**
 * A single worker in the Websocket Pool
 *
 * @internal
 */
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


/**
 * A single Worker within a {@link WebsocketPool}
 *
 * @param pool The pool this worker is a part of
 *
 * @internal
 */
class PoolWorker {
    constructor(pool: WebsocketPool) {
        this.pool = pool;
        this.ready = false;

        this.idx = pool.workers.length;
        this.token = pool.token;
        this.socket = io(pool.url, {
            forceNew: true,
            transports: ["websocket"],
            addTrailingSlash: true,
            autoConnect: false
        })

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
        const socket = this.socket
        const logger = this.logger

        socket.onAnyOutgoing(this.logger.log)

        logger.log("Connecting to websocket...")

        return new Promise<void>((resolve, reject) => {
            let connectedOnce = false

            socket.on("connect", () => {
                logger.log("Connected to WebSocket")
                logger.log("Emitting:", "auth", this.token)
                socket.emit("auth", this.token)
            })

            socket.on("error", (reason: string) => {
                logger.error(`WebSocket error: ${reason}`)
            })

            socket.on("connect_error", (error: Error) => {
                logger.error(`WebSocket Connect error: ${error.toString()}`)

                if (!connectedOnce) {
                    connectedOnce = true
                    reject(`Connection error: ${error.toString()}`)
                }
            })

            socket.on("disconnect", (reason: string) => {
                logger.log(`Disconnected from WebSocket: ${reason}`)
            })

            socket.on("auth_success", () => {
                logger.log("Auth success")

                if (!connectedOnce) {
                    connectedOnce = true
                    this.ready = true
                    resolve()
                }
            })

            setTimeout(() => {
                if (!connectedOnce) {
                    logger.error("Socket didn't connect in time")
                    reject("Connection Timeout")
                }
            }, 10000)

            socket.connect()
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

    async run(work: (worker: PoolWorker) => Promise<any>) {
        this.ready = false;

        // TODO: Verify that a finally is what we want here
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
    url: string;
    maxWorkers: number;
    queue: ((worker: PoolWorker) => Promise<any>)[];
}

/**
 * A pool of {@link PoolWorker}s
 *
 * This is used to manage a pool of WebSocket workers that can be used to run tasks in parallel
 * This alleviates the need to wait for every WebSocket instruction to fully complete before starting another
 *
 * @param url The WebSocket URL to connect to
 * @param token The token to use for WebSocket authentication
 *
 * @internal
 */
export class WebsocketPool {
    constructor(url: string, token: string) {
        this.maxWorkers = 5
        this.token = token
        this.url = url

        this.manager = new Manager(url, {
            forceNew: true,
            transports: ["websocket"],
            addTrailingSlash: true,
        });

        this.workers = []
        this.queue = []
    }

    async createWorker() {
        console.log("Creating a new Pool worker")
        const worker = new PoolWorker(this)
        this.workers.push(worker)
        await worker.connect()

        return worker
    }

    async disconnect() {
        await Promise.all(this.workers.map((worker: PoolWorker) => worker.disconnect()))
    }

    async processQueue() {
        if (this.queue.length == 0) { return }

        const work = this.queue.shift()
        if (!work) { return }

        let worker: PoolWorker | undefined
        if (this.workers.length == 0) {
            worker = await this.createWorker()
        }

        worker = worker || this.workers.find((worker) => worker.available())
        if (!worker) {
            if (this.workers.length < this.maxWorkers) {
                worker = await this.createWorker()
            } else {
                return
            }
        }

        return await worker.run(work)
    }

    async run(work: (worker: PoolWorker) => Promise<any>): Promise<any> {
        return new Promise(async (resolve, reject) => {
            this.queue.push(async (worker) => {
                try {
                    const result = await work(worker)
                    resolve(result)
                } catch (e) {
                    worker.logger.error("Failed to run a job!")
                    reject(e)
                }
            });

            return this.processQueue()
        });
    }
}
