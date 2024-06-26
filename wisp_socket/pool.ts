import { io, Socket } from "socket.io-client";

const WISP_DEBUG = process.env.WISP_DEBUG === "true";

type Logger = {
    log(...args: any[]): void;
    error(...args: any[]): void;
    debug(...args: any[]): void;
}

/**
 * The struct used to define the events that can be sent from the server to the client
 *
 * @internal
 */
export interface ServerToClientEvents {
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


/**
 * The struct used to define the events that can be sent from the client to the server
 *
 * @internal
 */
export interface ClientToServerEvents {
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
export interface FilesearchFile {
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


/**
 * The events that can be sent from the server to the client
 * @internal
 */
export type WispWebsocket = Socket<ServerToClientEvents, ClientToServerEvents>;


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
    done: boolean;
    logger: Logger;
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
        this.pool = pool
        this.ready = false
        this.done = false

        this.idx = pool.workers.length
        this.token = pool.token
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
            debug: (...args: any[]) => {
                if (!WISP_DEBUG) return;
                console.debug(logPrefix, args)
            }
        }

        this.connect().then(() => this.processWork()).catch(err => this.logger.error(err))
    }

    connect() {
        const socket = this.socket
        const logger = this.logger

        socket.onAnyOutgoing(this.logger.log)

        logger.log("Connecting to websocket...")

        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                logger.error("Socket didn't connect in time")
                reject("Connection Timeout")
            }, 10000)

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

                this.done = true
                clearTimeout(timeout)
                reject(`Connection error: ${error.toString()}`)
            })

            socket.on("disconnect", (reason: string) => {
                logger.log(`Disconnected from WebSocket: ${reason}`)
            })

            socket.on("auth_success", () => {
                logger.log("Auth success")

                this.ready = true
                clearTimeout(timeout)
                resolve()
            })

            socket.connect()
        });
    }

    disconnect() {
        this.ready = false;

        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.logger.error("Socket didn't disconnect in time")
                reject()
            }, 5000)

            this.socket.once("disconnect", () => {
                this.done = true
                clearTimeout(timeout)
                resolve()
            });

            this.socket.disconnect()
        })
    }

    private async processWork() {
        while (!this.done) {
            if (!this.ready) {
                await new Promise(resolve => setTimeout(resolve, 100))
                continue
            }

            const work = this.pool.getWork()
            if (work) {
                this.ready = false

                try {
                    this.logger.debug("Running my work")
                    await work(this)
                    this.logger.debug("Done with my work, ready for more")
                } catch (e) {
                    this.logger.error("Failed to run work")
                    this.logger.error(e)
                } finally {
                    this.ready = true
                }
            } else {
                await new Promise(resolve => setTimeout(resolve, 100))
            }
        }
    }
}


/**
 * Struct used to manage a pool of WebSocket workers
 */
export interface WebsocketPool {
    workers: PoolWorker[];
    token: string;
    url: string;
    maxWorkers: number;
    logger: Logger;
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
        const envMaxWorkers = process.env.WISP_MAX_WORKERS
        this.maxWorkers = envMaxWorkers ? parseInt(envMaxWorkers) : 5
        this.token = token
        this.url = url

        const logPrefix = "[Pool]"
        this.logger = {
            log: (...args: any[]) => console.log(logPrefix, args),
            error: (...args: any[]) => console.error(logPrefix, args),
            debug: (...args: any[]) => {
                if (!WISP_DEBUG) return;
                console.debug(logPrefix, args);
            }
        }

        this.workers = []
        this.queue = []

        this.logger.log(`Creating a new Pool with ${this.maxWorkers} workers`)
        for (let i = 0; i < this.maxWorkers; i++) {
            this.workers.push(new PoolWorker(this));
        }
    }

    public getWork(): ((worker: PoolWorker) => Promise<any>) | undefined {
        return this.queue.shift();
    }

    async disconnect() {
        this.logger.log("Disconnecting all workers...")
        await Promise.all(this.workers.map((worker: PoolWorker) => worker.disconnect()))
        this.logger.log("All workers disconnected")
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
        });
    }
}
