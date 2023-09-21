import { io, Socket } from "socket.io-client";

interface ConsoleMessage {
    type: string;
    line: string;
}

interface GitCloneData {
    dir: string;
    url: string;
    branch: string;
    authkey?: string | undefined;
}

export interface GitCloneResult {
    isPrivate: boolean;
}

interface GitPullData {
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


export interface WispSocket {
    socket: Socket<ServerToClientEvents, ClientToServerEvents>;
    logger: any;
    api: any;
    url: string;
    token: string;
    ghToken: string;
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
        this.logger = logger;
        this.api = api;
        this.ghToken = ghToken;

        this.url = "";
        this.token = "";
    }

    setDetails() {
        return new Promise<void>((resolve, reject) => {
            this.api.getWebsocketDetails().then((websocketInfo: WebsocketInfo) => {
                this.url = websocketInfo.url.replace("us-phs-chi23.physgun.com:8080", "wispproxy.cfcservers.org");
                this.token = websocketInfo.token;

                this.logger.info(`Got Websocket Details`);
                resolve();
            }).catch((err: string) => {
                this.logger.error(`Failed to get websocket details: ${err}`);
                reject(err);
            });
        });
    }

    _connect() {
        let reconnectDelay = 1;

        return new Promise<void>((resolve, reject) => {
            let connectedFirst = false;
            console.log("Connecting to WebSocket");

            this.socket = io(this.url, {
                forceNew: true,
                transports: ["websocket"],
                extraHeaders: {
                    "Authorization": `Bearer ${this.token}`
                },
                addTrailingSlash: true
            });

            this.socket.on("connect", () => {
                console.log("Connected to WebSocket");
                this.socket.emit("auth", this.token);
            });

            this.socket.on("error", (reason: string) => {
                console.error(`WebSocket error: ${reason}`);
            });

            this.socket.on("connect_error", (error: Error) => {
                console.error(`WebSocket Connect error: ${error.toString()}`);
                if (!connectedFirst) {
                    connectedFirst = true;
                    reject();
                }
            });

            this.socket.on("disconnect", (reason: string) => {
                console.error(`Disconnected from WebSocket: ${reason}`);

                if (reason === "io server disconnect") {
                    console.error(`Server closed connection - retrying (delay: ${reconnectDelay})`);

                    setTimeout(() => {
                        reconnectDelay = reconnectDelay * 1.2;
                        this.setDetails().then(() => {
                            this.socket.connect();
                        });
                    }, reconnectDelay * 1000);
                }
            });

            this.socket.on("auth_success", () => {
                console.log("Auth success");

                if (!connectedFirst) {
                    connectedFirst = true;
                    resolve();
                }
            });

            setTimeout(() => {
                if (!connectedFirst) {
                    console.error("Socket didn't connect in time");
                    reject();
                }
            }, 5000);

            console.log("Sent socket.connect()");
        });
    }

    async connect() {
        await this.setDetails();
        await this._connect();
    }

    disconnect() {
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
                    console.error("Socket didn't disconnect in time");
                    done = true;
                    reject();
                }
            }
      , 5000);
        });
    }

    filesearch(query: string) {
        return new Promise<FilesearchResults>((resolve, reject) => {
            let done = false;

            this.socket.once("filesearch-results", (data) => {
                done = true;
                resolve(data);
            });

            this.socket.emit("filesearch-start", query);

            setTimeout(() => {
                if (!done) {
                    reject();
                }
            }, 10000);
        });
    }

    gitPull(dir: string) {
        return new Promise<GitPullResult>((resolve, reject) => {
            let isPrivate = false;

            const finished = (success: boolean, output: string) => {
                this.socket.removeAllListeners("git-pull");
                this.socket.removeAllListeners("git-error");
                this.socket.removeAllListeners("git-success");

                const result: GitPullResult = {
                    output: output,
                    isPrivate: isPrivate
                }

                if (success) {
                    resolve(result);
                } else {
                    reject(output);
                }
            }

            const sendRequest = (includeAuth: boolean = false) => {
                const data: GitPullData = { dir: dir };

                if (includeAuth) {
                    isPrivate = true;
                    data.authkey = this.ghToken;
                }

                this.socket.emit("git-pull", data);
            }

            this.socket.once("git-pull", (data) => {
                this.logger.info(`Updating ${data}`);
            });

            this.socket.once("git-success", (commit) => {
                this.logger.info(`Addon updated to ${commit}`);

                if (!commit) {
                    this.logger.info("No commit given!");
                }

                finished(true, commit || "");
            });

            this.socket.on("git-error", (message) => {
                if (message === "Remote authentication required but no callback set") {
                    this.logger.info(`Remote authentication required, trying again with authkey: ${dir}`);
                    sendRequest(true);
                } else {
                    this.logger.error(`Error updating addon: ${message}`);
                    finished(false, message);
                }
            });

            sendRequest();
        });
    }

    gitClone(url: string, dir: string, branch: string) {
        return new Promise<GitCloneResult>((resolve, reject) => {
            let isPrivate = false;

            const finished = (success: boolean, message?: string) => {
                this.socket.removeAllListeners("git-clone");
                this.socket.removeAllListeners("git-error");
                this.socket.removeAllListeners("git-success");

                if (success) {
                    const result: GitCloneResult = {
                        isPrivate: isPrivate
                    }

                    resolve(result);
                } else {
                    reject(message);
                }
            }

            const sendRequest = (includeAuth: boolean = false) => {
                const data: GitCloneData = { dir: dir, url: url, branch: branch };

                if (includeAuth) {
                    isPrivate = true;
                    data.authkey = this.ghToken;
                }

                this.socket.emit("git-clone", data);
            }

            this.socket.once("git-clone", (data) => {
                this.logger.info(`Cloning ${data}`);
            });

            this.socket.once("git-success", () => {
                this.logger.info("Project successfully cloned");
                finished(true);
            });

            this.socket.on("git-error", (message) => {
                if (message === "Remote authentication required but no callback set") {
                    this.logger.info(`Remote authentication required, trying again with authkey: ${dir}`);
                    sendRequest(true);
                } else {
                    this.logger.info(`Error cloning repo: ${message}`);
                    finished(false, message);
                }
            });

            sendRequest();
        });
    }

    // TODO: Should we maintain or own listener chain?
    // TODO: Create a way to remove listeners
    addConsoleListener(callback: (message: string) => void) {
        this.socket.on("console", (data: ConsoleMessage) => {
            callback(data.line);
        });
    }

    sendCommandNonce(nonce: string, command: string, timeout: number = 1000) {
        return new Promise<string>((resolve: Function, reject: Function) => {
            let timeoutObj: NodeJS.Timeout;
            let callback: (data: ConsoleMessage) => void;

            let output = "";

            callback = (data: ConsoleMessage) => {
                const line = data.line;
                if (line.startsWith(nonce)) {
                    const message = line.slice(nonce.length);

                    if (message === "Done.") {
                        this.socket.off("console", callback);
                        clearTimeout(timeoutObj);
                        resolve(output);
                    } else {
                        output += message;
                        timeoutObj.refresh();
                    }
                }
            }

            this.socket.on("console", callback);
            this.socket.emit("send command", command);

            timeoutObj = setTimeout(() => {
                console.error("Command timed out current output: ", output);
                this.socket.off("console", callback);
                reject("Timeout");
            }, timeout);
        });
    }
}
