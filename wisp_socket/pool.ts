import { WispWebSocket } from "./ws_adapter.js";

const WISP_DEBUG = process.env.WISP_DEBUG === "true";

const REAUTH_INTERVAL = (() => {
    const parsed = process.env.WISP_REAUTH_INTERVAL ? parseInt(process.env.WISP_REAUTH_INTERVAL) : NaN
    return Number.isFinite(parsed) ? parsed : 9 * 60 * 1000
})();
const REAUTH_TIMEOUT = 10000;

export type Logger = {
    log(...args: any[]): void;
    error(...args: any[]): void;
    debug(...args: any[]): void;
}

/**
 * The minimal worker surface handed to a job run via {@link WispSocket.runWorker}:
 * the connected socket and a prefixed logger.
 *
 * @internal
 */
export interface SocketWorker {
    socket: WispWebSocket;
    logger: Logger;
}

/**
 * The struct used to define the events that can be sent from the server to the client
 *
 * @internal
 */
export interface ServerToClientEvents {
    "error": (message: string) => void;
    "auth success": () => void;
    "console output": (line: string) => void;
    "status": (state: string) => void;
    "stats": (statsJson: string) => void;
    "filesearch results": (json: string) => void;
    "fs:result": (json: string) => void;
    "fs:error": (json: string) => void;
    "fs:progress": (json: string) => void;
    "initial status": (message: any) => void;
}


/**
 * The struct used to define the events that can be sent from the client to the server
 *
 * @internal
 */
export interface ClientToServerEvents {
    "auth": (token: string) => void;
    "filesearch start": (json: string) => void;
    "fs:request": (json: string) => void;
    "send command": (command: string) => void;
}


/**
 * Return struct after finishing a Git Clone action
 *
 * @param folder_name The name of the folder the repo was cloned into
 * @param commit The HEAD commit hash after the clone
 * @param branch The branch that was cloned
 *
 * @internal
 */
export interface GitCloneResult {
    folder_name: string;
    commit: string;
    branch: string;
}


/**
 * Struct returned after a Git Pull action finishes.
 *
 * @param commit The HEAD commit hash after the pull
 * @param branch The branch that was pulled
 * @param files_changed How many files changed (0 when already up to date)
 * @param up_to_date Whether the repo was already up to date
 *
 * @internal
 */
export interface GitPullResult {
    commit: string;
    branch: string;
    files_changed: number;
    up_to_date: boolean;
}


/**
 * Payload for an `fs:request`. Sent as a JSON string; `op`-specific fields go
 * alongside `req` and `op`.
 *
 * @internal
 */
export interface FsRequest {
    req: string;
    op: string;
    directory?: string;
    [key: string]: any;
}

/**
 * The `fs:result` success envelope; `data` carries the op-specific payload.
 *
 * @internal
 */
export interface FsResult<T = any> {
    req: string;
    data?: T;
}

/**
 * The `fs:error` envelope. Errors arrive as a separate event from `fs:result`,
 * correlated by `req` (e.g. `code: "auth_required"` / `"auth_invalid"`).
 *
 * @internal
 */
export interface FsError {
    req: string;
    code: string;
    message: string;
}

/**
 * The parsed `fs:progress` envelope, correlated by `req`. Comes in two shapes:
 * text lines (`kind: "stdout" | "stderr"`, `line`) and structured progress
 * (`kind: "progress"` with `phase`/`current`/`total`/`percent`).
 *
 * @internal
 */
export interface FsProgress {
    req: string;
    kind: "stdout" | "stderr" | "progress" | string;
    line?: string;
    phase?: string;
    current?: number;
    total?: number;
    percent?: number;
}

/**
 * Result of a `git-status` op. Repo-specific fields are absent when
 * `is_repo` is false.
 *
 * @internal
 */
export interface GitStatusResult {
    is_repo: boolean;
    ahead: number;
    behind: number;
    dirty: boolean;
    repo_root?: string;
    branch?: string;
    commit?: string;
    remote_url?: string;
}


/**
 * A single entry in a `list` op result.
 *
 * @internal
 */
export interface FileEntry {
    name: string;
    created: string;
    modified: string;
    mode: string;
    mode_bits: string;
    size: number;
    directory: boolean;
    file: boolean;
    symlink: boolean;
    mime: string;
    child_count?: number;
}

/**
 * Options for a `list` op.
 *
 * @internal
 */
export interface ListOptions {
    search?: string;
    page?: number;
    perPage?: number;
    sort?: string;
    sortDir?: "asc" | "desc";
}

/**
 * Result of a `list` op: a paginated directory listing.
 *
 * @internal
 */
export interface ListResult {
    data: FileEntry[];
    meta: {
        pagination: {
            count: number;
            currentPage: number;
            perPage: number;
            total: number;
            totalPages: number;
        };
    };
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
 * Result of an op that just reports success (e.g. `mkdir`).
 *
 * @internal
 */
export interface FsOkResult {
    ok: boolean;
}


/**
 * Result of a `conflicts` op — the subset of the given paths that already
 * exist / would conflict.
 *
 * @internal
 */
export interface ConflictsResult {
    conflicts: string[];
}


/**
 * The websocket type used throughout the pool.
 *
 * The backend no longer speaks Socket.IO, so this is our {@link WispWebSocket}
 * adapter rather than a Socket.IO `Socket`. The {@link ServerToClientEvents}
 * and {@link ClientToServerEvents} interfaces above document the event names
 * but are no longer enforced by the adapter's looser `(...args: any[])` API.
 *
 * @internal
 */
export type WispWebsocket = WispWebSocket;


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
    url: string;
    connected: boolean;
    busy: boolean;
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
    private intentionalDisconnect = false;
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts = 3;
    private reauthTimer?: ReturnType<typeof setTimeout>;

    constructor(pool: WebsocketPool) {
        this.pool = pool
        this.connected = false
        this.busy = false
        this.done = false

        this.idx = pool.workers.length
        this.token = pool.token
        this.url = pool.url

        const logPrefix = `[Worker #${this.idx}]`
        this.logger = {
            log: (...args: any[]) => console.log(logPrefix, args),
            error: (...args: any[]) => console.error(logPrefix, args),
            debug: (...args: any[]) => {
                if (!WISP_DEBUG) return;
                console.debug(logPrefix, args)
            }
        }

        this.start()
        this.processWork()
    }

    private createSocket() {
        this.socket = new WispWebSocket(this.url, {
            origin: this.pool.origin
        })
    }

    private start() {
        this.createSocket()
        this.connect()
            .then(() => this.logger.log("Connection established"))
            .catch((err) => {
                this.logger.error("Connection failed", err)
                this.handleDisconnect("connection failure")
            })
    }

    connect() {
        const socket = this.socket
        const logger = this.logger

        socket.onAnyOutgoing(this.logger.log)

        logger.log("Connecting to websocket...")

        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                logger.error("Socket didn't connect in time")
                reject(new Error("Connection Timeout"))
            }, 10000)

            socket.on("connect", () => {
                logger.log("Connected to WebSocket, authenticating")
                socket.emit("auth", this.token)
            })

            socket.on("error", (reason: string) => {
                logger.error(`WebSocket error: ${reason}`)
            })

            socket.on("connect_error", (error: Error) => {
                logger.error(`WebSocket Connect error: ${error.toString()}`)
                clearTimeout(timeout)
                reject(error)
            })

            socket.on("disconnect", (reason: string) => {
                logger.log(`Disconnected from WebSocket: ${reason}`)
                this.connected = false
                this.handleDisconnect(reason)
            })

            socket.on("auth success", () => {
                logger.log("Auth success")
                this.reconnectAttempts = 0
                this.connected = true
                clearTimeout(timeout)
                this.scheduleReauth()
                resolve()
            })

            socket.connect()
        });
    }

    // Resets the re-auth clock. Runs on every successful auth.
    private scheduleReauth() {
        clearTimeout(this.reauthTimer)
        this.reauthTimer = setTimeout(() => this.reauth(), REAUTH_INTERVAL)
    }

    // Re-auths the live socket with a fresh token. A failed re-auth is treated
    // as a dead connection and handed to the reconnect path.
    private async reauth() {
        if (!this.connected || this.intentionalDisconnect || this.done) { return }

        if (this.pool.refreshDetails) {
            try {
                const details = await this.pool.refreshDetails()
                this.url = details.url
                this.token = details.token
            } catch (e) {
                this.logger.error("Re-auth: failed to refresh details", e)
                return this.handleDisconnect("reauth refresh failure")
            }
        }

        const socket = this.socket
        const ok = await new Promise<boolean>((resolve) => {
            const onSuccess = () => {
                clearTimeout(timeout)
                resolve(true)
            }
            const timeout = setTimeout(() => {
                socket.off("auth success", onSuccess)
                resolve(false)
            }, REAUTH_TIMEOUT)

            socket.once("auth success", onSuccess)
            socket.emit("auth", this.token)
        })

        if (!ok) {
            this.logger.error("Re-auth: no auth success in time")
            return this.handleDisconnect("reauth failure")
        }

        this.scheduleReauth()
    }

    // Recovers from an unexpected disconnect by reconnecting with a freshly
    // fetched token (the JWT is short-lived). After maxReconnectAttempts the
    // worker is marked dead so the pool stops handing it work.
    private async handleDisconnect(reason: string) {
        this.connected = false
        clearTimeout(this.reauthTimer)

        if (this.intentionalDisconnect || this.done) { return }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.logger.error(`Giving up after ${this.reconnectAttempts} reconnect attempts (${reason})`)
            this.done = true
            this.pool.onWorkerDone()
            return
        }

        this.reconnectAttempts++
        const backoff = Math.min(1000 * this.reconnectAttempts, 5000)
        this.logger.log(`Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${backoff}ms`)
        await new Promise((resolve) => setTimeout(resolve, backoff))

        if (this.intentionalDisconnect || this.done) { return }

        if (this.pool.refreshDetails) {
            try {
                const details = await this.pool.refreshDetails()
                this.url = details.url
                this.token = details.token
            } catch (e) {
                this.logger.error("Failed to refresh websocket details for reconnect", e)
            }
        }

        this.start()
    }

    disconnect() {
        this.intentionalDisconnect = true
        this.connected = false
        clearTimeout(this.reauthTimer)

        return new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
                this.logger.error("Socket didn't disconnect in time")
                this.done = true
                resolve()
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
            if (!this.connected || this.busy) {
                await new Promise(resolve => setTimeout(resolve, 100))
                continue
            }

            const work = this.pool.getWork()
            if (work) {
                this.busy = true

                try {
                    this.logger.debug("Running my work")
                    await work(this)
                    this.logger.debug("Done with my work, ready for more")
                } catch (e) {
                    this.logger.error("Failed to run work")
                    this.logger.error(e)
                } finally {
                    this.busy = false
                }
            } else {
                await new Promise(resolve => setTimeout(resolve, 100))
            }
        }
    }
}


/**
 * A queued unit of work plus a hook to reject it if it can never run (e.g. the
 * pool has no live workers, or it waited too long to be picked up).
 *
 * @internal
 */
interface QueueItem {
    task: (worker: PoolWorker) => Promise<void>;
    reject: (reason?: any) => void;
}

/**
 * Fetches fresh websocket details (url + token) for reconnects.
 *
 * @internal
 */
export type DetailsProvider = () => Promise<{ url: string; token: string }>;

/**
 * Struct used to manage a pool of WebSocket workers
 */
export interface WebsocketPool {
    workers: PoolWorker[];
    token: string;
    url: string;
    origin: string;
    maxWorkers: number;
    acquireTimeout: number;
    refreshDetails?: DetailsProvider;
    logger: Logger;
    queue: QueueItem[];
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
    constructor(url: string, token: string, origin: string, refreshDetails?: DetailsProvider) {
        const envMaxWorkers = process.env.WISP_MAX_WORKERS
        this.maxWorkers = envMaxWorkers ? parseInt(envMaxWorkers) : 5

        const envAcquire = process.env.WISP_ACQUIRE_TIMEOUT
        this.acquireTimeout = envAcquire ? parseInt(envAcquire) : 60000

        this.token = token
        this.url = url
        this.origin = origin
        this.refreshDetails = refreshDetails

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
        return this.queue.shift()?.task;
    }

    private allWorkersDone(): boolean {
        return this.workers.length > 0 && this.workers.every((worker) => worker.done)
    }

    // Called by a worker when it gives up permanently. If no workers remain,
    // queued work can never run, so reject it instead of letting it hang.
    public onWorkerDone() {
        if (!this.allWorkersDone()) { return }

        this.logger.error("All workers are dead - draining queued work")
        const error = new Error("WebsocketPool has no live workers")
        while (this.queue.length > 0) {
            this.queue.shift()?.reject(error)
        }
    }

    async disconnect() {
        this.logger.log("Disconnecting all workers...")
        await Promise.all(this.workers.map((worker: PoolWorker) => worker.disconnect()))
        this.logger.log("All workers disconnected")
    }

    async run(work: (worker: PoolWorker) => Promise<any>): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.allWorkersDone()) {
                reject(new Error("WebsocketPool has no live workers"))
                return
            }

            let settled = false

            const item: QueueItem = {
                task: async (worker) => {
                    if (settled) { return }
                    settled = true
                    clearTimeout(acquireTimer)

                    try {
                        const result = await work(worker)
                        resolve(result)
                    } catch (e) {
                        worker.logger.error("Failed to run a job!")
                        reject(e)
                    }
                },
                reject: (reason?: any) => {
                    if (settled) { return }
                    settled = true
                    clearTimeout(acquireTimer)
                    reject(reason)
                }
            }

            // Backstop so work can't sit in the queue forever if every worker
            // is wedged. Worker death is handled separately by onWorkerDone.
            const acquireTimer = setTimeout(() => {
                const idx = this.queue.indexOf(item)
                if (idx !== -1) { this.queue.splice(idx, 1) }
                item.reject(new Error(`Timed out waiting for an available worker after ${this.acquireTimeout}ms`))
            }, this.acquireTimeout)

            this.queue.push(item)
        });
    }
}
