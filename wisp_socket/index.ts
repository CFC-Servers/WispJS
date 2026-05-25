import stripAnsi from 'strip-ansi';
import { WebsocketPool } from "./pool.js"
import { FsResult, FsError, FsProgress, SocketWorker } from "./pool.js"
import { GitSocket } from "./git.js"
import { FilesystemSocket } from "./filesystem.js"

import type { WispAPI } from "../wisp_api/index.js"


/**
 * The Websocket information returned from the API
 *
 * @param token The token to use when authenticating with the `auth` command in the Websocket
 * @param url The actual URL of the Websocket
 *
 * @internal
 */
export interface WebsocketInfo {
    token: string;
    url: string;
}


export type WebsocketDetailsPreprocessor = (info: WebsocketInfo) => void;


export interface WispSocket {
    pool: WebsocketPool;
    logger: any;
    api: WispAPI;
    url: string | undefined;
    token: string | undefined;
    ghToken: string | undefined;
    consoleCallbacks: ((message: string) => void)[];
    detailsPreprocessor: WebsocketDetailsPreprocessor | undefined;
    Git: GitSocket;
    Filesystem: FilesystemSocket;
}


/**
 * The primary interface to the Websocket API
 *
 * @internal
 */
export class WispSocket {
    constructor(logger: any, api: any, ghToken: string | undefined) {
        this.logger = logger
        this.api = api
        this.ghToken = ghToken
        this.consoleCallbacks = []

        this.Git = new GitSocket(this)
        this.Filesystem = new FilesystemSocket(this)
    }


    /**
     * Sets a callback to run on the Websocket Info before saving the details.
     *
     * @example
     * ```js
     * // Change the URL of the Websocket
     * wisp.socket.setWebsocketDetailsPreprocessor((info) => {
     *    info.url = "wss://newurl.com"
     * })
     * ```
     *
     * @remarks
     * ℹ️  This can be used to modify the URL or token after its retrieved from the API
     *
     * @param preprocessor The callback to run when the data is received from the API
     *
     * @public
     */
    setWebsocketDetailsPreprocessor(preprocessor: WebsocketDetailsPreprocessor) {
        this.detailsPreprocessor = preprocessor;
    }


    /**
     * Creates a new Websocket Pool
     *
     * @throws Throws an error if the URL or token are not set yet
     * @internal
     */
    createPool() {
        if (!this.url || !this.token) {
            throw new Error("Attempted to create a pool without a URL or token")
        }

        // Provider used by the pool to refresh the (short-lived) token when a
        // worker needs to reconnect.
        const refreshDetails = async () => {
            await this.setDetails()
            return { url: this.url!, token: this.token! }
        }

        // The Origin header is the panel the connection originates from, which
        // is always the API domain.
        const origin = `https://${this.api.domain}`

        this.pool = new WebsocketPool(this.url, this.token, origin, refreshDetails)
    }


    /**
     * Requests and saves the Websocket details from the API
     *
     * @internal
     */
    async setDetails() {
        try {
            const websocketInfo: WebsocketInfo = await this.api.Servers.GetWebsocketDetails()
            if (this.detailsPreprocessor) {
                this.detailsPreprocessor(websocketInfo);
            }

            this.url = websocketInfo.url
            this.token = websocketInfo.token

            this.logger.info(`Got Websocket Details. ${this.url} - ${this.token}`)
        } catch(e) {
            this.logger.error(`Failed to get websocket details: ${e}`)
            throw(e)
        }
    }


    /**
     * Disconnects from the websocket
     *
     * @internal
     */
    async disconnect() {
        if (this.pool) {
            await this.pool.disconnect()
        }
    }


    /**
     * Verifies that the pool is created and ready to use
     *
     * @internal
     */
    async verifyPool() {
        if (!this.pool) {
            await this.setDetails()
            this.createPool()
        }
    }


    /**
     * Runs a job on an available pool worker, handing it the worker's socket
     * and logger. Used for event-based flows (e.g. file search) that don't fit
     * the {@link request} request/response protocol.
     *
     * @param work The job to run; receives the worker and returns a Promise
     *
     * @internal
     */
    async runWorker<T>(work: (worker: SocketWorker) => Promise<T>): Promise<T> {
        await this.verifyPool()
        return await this.pool.run(work)
    }


    /**
     * Generates a short, unique request id for {@link request} correlation.
     *
     * @internal
     */
    private generateReqId(): string {
        return Math.random().toString(36).slice(2, 14)
    }


    /**
     * Issues a correlated `fs:request` to the backend and awaits its outcome.
     *
     * This is the low-level entry point for the git/filesystem protocol. The
     * client emits `fs:request` with a JSON-string payload (`{ req, op, ...params }`),
     * and the backend replies with one of three events, all correlated by `req`
     * and all carrying a JSON-string `args[0]`:
     *
     *   - `fs:result`   — success; resolves with the parsed `data`
     *   - `fs:error`    — failure; rejects with an {@link FsError} (plus collected `output`)
     *   - `fs:progress` — streaming stdout/stderr/progress lines (collected for error context)
     *
     * Typed convenience wrappers live on {@link GitSocket} ({@link WispSocket.Git})
     * and {@link FilesystemSocket} ({@link WispSocket.Filesystem}); call this
     * directly for ops that don't have a typed wrapper yet.
     *
     * @example
     * ```js
     * const status = await wisp.socket.request("git-status", { directory: "/garrysmod/addons/acf-3" })
     * ```
     *
     * @param op The operation name (e.g. `git-pull`, `list`)
     * @param params Additional payload fields merged into the request (e.g. `{ directory }`)
     * @param timeout In milliseconds, how long to wait for the result
     *
     * @public
     */
    async request<T = any>(op: string, params: Record<string, any> = {}, timeout: number = 10000): Promise<T> {
        await this.verifyPool()

        return await this.pool.run((worker) => {
            const socket = worker.socket
            const logger = worker.logger
            const req = this.generateReqId()
            logger.log(`Running fsRequest: ${op}`, params)

            return new Promise<T>((resolve, reject) => {
                const progress: string[] = []

                let resultHandler: (raw: string) => void
                let errorHandler: (raw: string) => void
                let progressHandler: (raw: string) => void

                const parse = <P>(raw: string): P | undefined => {
                    try {
                        return JSON.parse(raw) as P
                    } catch {
                        logger.error(`Failed to parse fs event for ${op}`, raw)
                        return undefined
                    }
                }

                const cleanup = () => {
                    socket.off("fs:result", resultHandler)
                    socket.off("fs:error", errorHandler)
                    socket.off("fs:progress", progressHandler)
                    clearTimeout(timeoutObj)
                }

                const timeoutObj = setTimeout(() => {
                    cleanup()
                    logger.error(`fsRequest timed out: ${op} (${req})`)
                    reject(new Error(`fsRequest timed out: ${op}`))
                }, timeout)

                progressHandler = (raw: string) => {
                    const p = parse<FsProgress>(raw)
                    if (!p || p.req !== req) return
                    const line = p.line ?? ""
                    progress.push(line)
                    logger.debug(`[${op}] ${p.kind}: ${line}`)
                }

                resultHandler = (raw: string) => {
                    const p = parse<FsResult<T>>(raw)
                    if (!p || p.req !== req) return
                    cleanup()
                    resolve(p.data as T)
                }

                errorHandler = (raw: string) => {
                    const p = parse<FsError>(raw)
                    if (!p || p.req !== req) return
                    cleanup()
                    logger.error(`fsRequest error: ${op} - ${p.code}: ${p.message}`)
                    reject({ ...p, output: progress.join("\n") })
                }

                socket.on("fs:result", resultHandler)
                socket.on("fs:error", errorHandler)
                socket.on("fs:progress", progressHandler)
                socket.emit("fs:request", JSON.stringify({ req, op, ...params }))
            })
        })
    }


    /**
     * Sets up the console listener worker
     *
     * @internal
     */
    setupConsoleListener() {
        this.verifyPool().then(() => {
            this.pool.run((worker) => {
                const logger = worker.logger
                logger.log("Running setupConsoleListener")

                return new Promise<void>((resolve) => {
                    worker.socket.on("console output", (line: string) => {
                        if (this.consoleCallbacks.length == 0) {
                            return resolve()
                        }

                        this.consoleCallbacks.forEach((callback) => {
                            try {
                                callback(line)
                            } catch(e) {
                                logger.error("Failed to run console callback", e)
                            }
                        })
                    })
                })
            })
        })
    }


    /**
     * Adds a new callback that will run any time a console message is rececived
     *
     * @param callback The callback to run, takes a single param, `message`, a string
     *
     * @public
     */
    addConsoleListener(callback: (message: string) => void) {
        if (this.consoleCallbacks.length == 0) {
            this.setupConsoleListener()
        }

        this.consoleCallbacks.push(callback)
    }


    /**
     * Removes a previously added console message callback
     *
     * @param callback The callback function that was previously added
     *
     * @public
     */
    removeConsoleListener(callback: (message: string) => void) {
        const index = this.consoleCallbacks.indexOf(callback)
        if (index == -1) { return }

        this.consoleCallbacks.splice(index, 1)
    }


    /**
     * Sends a command to the server and then waits until output with the given prefix is seen in a console message
     *
     * @example
     * Runs a custom lua command that will prefix its output with our nonce, then prints the output from that command
     * ```lua
     * -- lua/autorun/server/nonce_example.lua
     * concommand.Add( "myCommand", function( ply, _, args )
     *     if IsValid( ply ) then return end
     *
     *     local nonce = args[1]
     *     print( nonce .. "Command output" )
     * end )
     * ```
     * ```js
     * const nonce = "abc123";
     * const command = `myCommand "${nonce}"`;
     * try {
     *     const output = await wisp.socket.sendCommandNonce(nonce, command);
     *     console.log("Output from command:", output);
     * catch (error) {
     *     console.error(error);
     * }
     * ```
     *
     * @remarks
     * ℹ️  This is useful if you run code on your Server that will print output with the same prefix, letting you run commands and also receive output for it
     *
     * @param nonce The short, unique string that your output will be prefixed with
     * @param command The full command string to send
     * @param timeout In milliseconds, how long to wait for output before timing out
     *
     * @public
     */
    async sendCommandNonce(nonce: string, command: string, timeout: number = 1000) {
        await this.verifyPool()

        return await this.pool.run((worker) => {
            const socket = worker.socket
            const logger = worker.logger
            logger.log("Running sendCommandNonce: ", nonce, command)

            return new Promise<string>((resolve: Function, reject: Function) => {
                let output = ""
                let callback: (line: string) => void

                const timeoutObj = setTimeout(() => {
                    logger.error(`Command timed out current output: '${output}'`)
                    socket.off("console output", callback)
                    logger.log("Rejected sendCommandNonce 'Timeout'", nonce, command)
                    reject("Timeout")
                }, timeout)

                callback = (line: string) => {
                    const clean = stripAnsi(line)

                    if (clean.startsWith(nonce)) {
                        const message = clean.slice(nonce.length)

                        if (message === "Done.") {
                            socket.off("console output", callback)
                            clearTimeout(timeoutObj)

                            resolve(output)
                        } else {
                            output += message
                            timeoutObj.refresh()
                        }
                    }
                }

                socket.on("console output", callback)
                socket.emit("send command", command)
            })
        })
    }
}
