import { WebsocketPool } from "./lib/websocket_pool.js";
import { ConsoleMessage, FilesearchResults } from "./lib/websocket_pool";
import { GitPullData, GitPullResult } from "./lib/websocket_pool.js";
import { GitCloneData, GitCloneResult } from "./lib/websocket_pool.js";

export interface WispSocket {
    pool: WebsocketPool;
    logger: any;
    api: any;
    ghToken: string;
    consoleCallbacks: ((message: string) => void)[];
}

interface WebsocketInfo {
    token: string;
    url: string;
}

// TODO: Handle errors better
// TODO: Allow for no ghToken
// TODO: Don't require a logger
export class WispSocket {
    constructor(logger: any, api: any, ghToken: string) {
        this.logger = logger
        this.api = api
        this.ghToken = ghToken
        this.consoleCallbacks = []
    }

    async setDetails() {
        try {
            const websocketInfo: WebsocketInfo = await this.api.getWebsocketDetails()
            const url = websocketInfo.url.replace("us-phs-chi23.physgun.com:8080", "wispproxy.cfcservers.org")
            const token = websocketInfo.token
            this.pool = new WebsocketPool(url, token)
            this.logger.info(`Got Websocket Details. Pool created.`)
        } catch(e) {
            this.logger.error(`Failed to get websocket details: ${e}`)
            throw(e)
        }
    }

    async connect() {
        await this.setDetails()
    }

    async disconnect() {
        await this.pool.disconnect()
    }

    async filesearch(query: string) {
        await this.pool.run((worker) => {
            const socket = worker.socket;
            const logger = worker.logger;
            logger.log("Running filesearch:", query);

            return new Promise<FilesearchResults>((resolve, reject) => {
                let done = false

                socket.once("filesearch-results", (data) => {
                    done = true
                    logger.log("Resolved filesearch:", query);
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
            });
        });
    }

    async gitPull(dir: string) {
        await this.pool.run((worker) => {
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
                        logger.log("Resolved gitPull:", dir, output);
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

                sendRequest()
            })
        })
    }

    async gitClone(url: string, dir: string, branch: string) {
        await this.pool.run((worker) => {
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

                        logger.log("Resolved gitClone:", url, dir, branch, message);
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

    setupConsoleListener() {
        this.pool.run((worker) => {
            const logger = worker.logger;
            logger.log("Running setupConsoleListener");

            return new Promise<void>((resolve) => {
                worker.socket.on("console", (data: ConsoleMessage) => {
                    const line = data.line;

                    if (this.consoleCallbacks.length == 0) {
                        logger.log("Resolved setupConsoleListener (no more callbacks)");
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

    addConsoleListener(callback: (message: string) => void) {
        if (this.consoleCallbacks.length == 0) {
            this.setupConsoleListener();
        }

        this.consoleCallbacks.push(callback);
    }

    removeConsoleListener(callback: (message: string) => void) {
        const index = this.consoleCallbacks.indexOf(callback)
        if (index == -1) { return }

        this.consoleCallbacks.splice(index, 1)
    }

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

                            logger.log("Resolved sendCommandNonce", nonce, command)
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
