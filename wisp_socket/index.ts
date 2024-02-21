import { WebsocketPool } from "./pool.js";
import { ConsoleMessage, FilesearchResults } from "./pool";
import { GitPullData, GitPullResult } from "./pool.js";
import { GitCloneData, GitCloneResult } from "./pool.js";


/**
 * The Websocket information returned from the API
 *
 * @param token The token to use when authenticating with the `auth` command in the Websocket
 * @param url The actual URL of the Websocket
 *
 * @internal
 */
interface WebsocketInfo {
    token: string;
    url: string;
}


export type WebsocketDetailsPreprocessor = (info: WebsocketInfo) => void;


// FIXME: The `api` field shouldn't be Any
export interface WispSocket {
    pool: WebsocketPool;
    logger: any;
    api: any;
    ghToken: string;
    consoleCallbacks: ((message: string) => void)[];
    _websocketDetailsPreprocessor: WebsocketDetailsPreprocessor | undefined;
}


/**
 * The primary interface to the Websocket API
 *
 * @internal
 */
export class WispSocket {
    constructor(logger: any, api: any, ghToken: string) {
        this.logger = logger
        this.api = api
        this.ghToken = ghToken
        this.consoleCallbacks = []
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
        this._websocketDetailsPreprocessor = preprocessor;
    }


    /**
     * Requests and saves the Websocket details from the API
     *
     * @internal
     */
    async setDetails() {
        try {
            const websocketInfo: WebsocketInfo = await this.api.Servers.GetWebsocketDetails()
            if (this._websocketDetailsPreprocessor) {
                this._websocketDetailsPreprocessor(websocketInfo);
            }

            const url = websocketInfo.url
            const token = websocketInfo.token
            this.pool = new WebsocketPool(url, token)
            this.logger.info(`Got Websocket Details. Pool created.`, url, token)
        } catch(e) {
            this.logger.error(`Failed to get websocket details: ${e}`)
            throw(e)
        }
    }


    /**
     * Sets the Websocket details and initializes the Websocket connection
     *
     * @internal
     */
    async connect() {
        await this.setDetails()
    }


    /**
     * Disconnects from the websocket
     *
     * @internal
     */
    async disconnect() {
        await this.pool.disconnect()
    }


    /**
     * Searches all file contents for the given query
     *
     * @param query The query string to search for
     *
     * @public
     */
    async filesearch(query: string): Promise<FilesearchResults> {
        this.logger.info("Running filesearch with: ", query)

        return await this.pool.run((worker) => {
            const socket = worker.socket
            const logger = worker.logger
            logger.log("Running filesearch:", query)

            return new Promise<FilesearchResults>((resolve, reject) => {
                let done = false

                socket.once("filesearch-results", (data) => {
                    done = true
                    resolve(data)
                })

                socket.emit("filesearch-start", query)

                setTimeout(() => {
                    if (!done) {
                        socket.off("filesearch-results")
                        logger.error("Rejected filesearch: 'Timeout'")
                        reject()
                    }
                }, 5000)
            })
        })
    }


    /**
     * Performs a git pull operation on the given directory
     *
     * @param dir The full directory path to perform a pull on
     *
     * @public
     */
    async gitPull(dir: string, useAuth: boolean = false) {
        const pullResult = await this.pool.run((worker) => {
            const socket = worker.socket;
            const logger = worker.logger;
            logger.log("Running gitPull:", dir);

            return new Promise<GitPullResult>((resolve, reject) => {
                let isPrivate = false

                const finished = (success: boolean, output: string) => {
                    socket.removeAllListeners("git-pull")
                    socket.removeAllListeners("git-error")
                    socket.removeAllListeners("git-success")

                    const result: GitPullResult = {
                        output: output,
                        isPrivate: isPrivate
                    }

                    if (success) {
                        resolve(result)
                    } else {
                        logger.error("Rejected gitPull:", dir, output);
                        reject(output)
                    }
                }

                const sendRequest = (includeAuth: boolean = false) => {
                    const data: GitPullData = { dir: dir }

                    if (includeAuth) {
                        isPrivate = true
                        data.authkey = this.ghToken
                    }

                    socket.emit("git-pull", data)
                }

                socket.once("git-pull", (data) => {
                    logger.log(`Updating ${data}`)
                });

                socket.once("git-success", (commit) => {
                    logger.log(`Addon updated to ${commit}`)

                    if (!commit) {
                        logger.log("No commit given!")
                    }

                    finished(true, commit || "")
                });

                socket.on("git-error", (message) => {
                    if (message === "Remote authentication required but no callback set") {
                        logger.log(`Remote authentication required, trying again with authkey: ${dir}`)
                        sendRequest(true)
                    } else {
                        logger.log(`Error updating addon: ${message}`)
                        finished(false, message)
                    }
                })

                sendRequest(useAuth)
            })
        })

        return pullResult
    }


    /**
     * Clones a new Repo to the given directory
     *
     * @param url The HTTPS URL of the repository
     * @param dir The full path of the directory to clone the repository to
     * @param branch The branch of the repository to clone
     *
     * @public
     */
    async gitClone(url: string, dir: string, branch: string) {
        return await this.pool.run((worker) => {
            const socket = worker.socket;
            const logger = worker.logger;
            logger.log("Running gitClone:", url, dir, branch);

            return new Promise<GitCloneResult>((resolve, reject) => {
                let isPrivate = false;

                const finished = (success: boolean, message?: string) => {
                    socket.removeAllListeners("git-clone");
                    socket.removeAllListeners("git-error");
                    socket.removeAllListeners("git-success");

                    if (success) {
                        const result: GitCloneResult = {
                            isPrivate: isPrivate
                        }

                        resolve(result);
                    } else {
                        logger.error("Rejected gitClone:", url, dir, branch, message);
                        reject(message);
                    }
                }

                const sendRequest = (includeAuth: boolean = false) => {
                    const data: GitCloneData = { dir: dir, url: url, branch: branch };

                    if (includeAuth) {
                        isPrivate = true;
                        data.authkey = this.ghToken;
                    }

                    socket.emit("git-clone", data);
                }

                socket.once("git-clone", (data) => {
                    logger.log(`Cloning ${data}`);
                });

                socket.once("git-success", () => {
                    logger.log("Project successfully cloned");
                    finished(true);
                });

                socket.on("git-error", (message) => {
                    if (message === "Remote authentication required but no callback set") {
                        logger.log(`Remote authentication required, trying again with authkey: ${dir}`);
                        sendRequest(true);
                    } else {
                        logger.log("Error cloning repo:", url, dir, branch, message);
                        finished(false, message);
                    }
                });

                sendRequest();
            });
        });
    }


    /**
     * Sets up the console listener worker
     *
     * @internal
     */
    setupConsoleListener() {
        this.pool.run((worker) => {
            const logger = worker.logger;
            logger.log("Running setupConsoleListener");

            return new Promise<void>((resolve) => {
                worker.socket.on("console", (data: ConsoleMessage) => {
                    const line = data.line;

                    if (this.consoleCallbacks.length == 0) {
                        return resolve();
                    }

                    this.consoleCallbacks.forEach((callback) => {
                        try {
                            callback(line);
                        } catch(e) {
                            logger.error("Failed to run console callback", e);
                        }
                    });
                });
            });
        });
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
            this.setupConsoleListener();
        }

        this.consoleCallbacks.push(callback);
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
     * @param timeout How long to wait for output before timing out
     *
     * @public
     */
    async sendCommandNonce(nonce: string, command: string, timeout: number = 1000) {
        return await this.pool.run((worker) => {
            const socket = worker.socket
            const logger = worker.logger
            logger.log("Running sendCommandNonce: ", nonce, command)

            return new Promise<string>((resolve: Function, reject: Function) => {
                let timeoutObj: NodeJS.Timeout
                let callback: (data: ConsoleMessage) => void;

                let output = ""

                callback = (data: ConsoleMessage) => {
                    const line = data.line
                    if (line.startsWith(nonce)) {
                        const message = line.slice(nonce.length)

                        if (message === "Done.") {
                            socket.off("console", callback)
                            clearTimeout(timeoutObj)

                            resolve(output)
                        } else {
                            output += message
                            timeoutObj.refresh()
                        }
                    }
                }

                socket.on("console", callback)
                socket.emit("send command", command)

                timeoutObj = setTimeout(() => {
                    logger.error(`Command timed out current output: '${output}'`);
                    socket.off("console", callback);
                    logger.log("Rejected sendCommandNonce 'Timeout'", nonce, command)
                    reject("Timeout");
                }, timeout);
            });
        });
    }
}
