import { io, Socket } from "socket.io-client";

/**
 * The struct sent from the server containing console messages
 *
 * @param type The type of message. Currently unknown what varients exist
 * @param line The actual content of the console messages
 *
 * @internal
 */
export type ConsoleMessage = {
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
export type GitCloneData = {
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
export type GitCloneResult = {
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
export type GitPullData = {
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
export type GitPullResult = {
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
export type FilesearchFile = {
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
export type FilesearchResults = {
    files: {[key: string]: FilesearchFile};
    tooMany: boolean;
}

export type ServerToClientEvents = {
    "error": (message: string) => void;
    "auth_success": (message: string) => void;
    "filesearch-results": (data: FilesearchResults) => void;
    "git-error": (data: string) => void;
    "git-success": (message?: string) => void;
    "git-clone": (data: GitCloneData) => void;
    "git-pull": (data: GitPullData) => void;
    "console": (message: ConsoleMessage) => void;
}

export type ClientToServerEvents = {
    "auth": (token: string) => void;
    "filesearch-start": (query: string) => void;
    "git-clone": (data: GitCloneData) => void;
    "git-pull": (data: GitPullData) => void;
    "send command": (command: string) => void;
}

/**
 * The Websocket information returned from the API
 *
 * @param token The token to use when authenticating with the `auth` command in the Websocket
 * @param url The actual URL of the Websocket
 *
 * @internal
 */
export type WebsocketInfo = {
    token: string;
    url: string;
}

export type WebsocketDetailsPreprocessor = (info: WebsocketInfo) => void;

export interface WispSocket {
    socket: Socket<ServerToClientEvents, ClientToServerEvents>;
    logger: any;
    api: any;
    url: string;
    token: string;
    ghToken: string;
    _websocketDetailsPreprocessor: WebsocketDetailsPreprocessor | undefined;
}


// TODO: Handle errors better
// TODO: Allow for no ghToken
// TODO: Don't require a logger
/**
 * The primary interface to the Websocket API
 *
 * @internal
 */
export class WispSocket {
    constructor(logger: any, api: any, ghToken: string) {
        this.logger = logger;
        this.api = api;
        this.ghToken = ghToken;

        this.url = "";
        this.token = "";
    }

    /**
     * Sets a callback to run on the Websocket Info before saving the details.
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
    setDetails() {
        return new Promise<void>((resolve, reject) => {
            this.api.getWebsocketDetails().then((websocketInfo: WebsocketInfo) => {
                if (this._websocketDetailsPreprocessor) {
                    this._websocketDetailsPreprocessor(websocketInfo);
                }

                this.url = websocketInfo.url;
                this.token = websocketInfo.token;

                this.logger.info(`Got Websocket Details`);
                resolve();
            }).catch((err: string) => {
                this.logger.error(`Failed to get websocket details: ${err}`);
                reject(err);
            });
        });
    }


    /**
     * Establishes the actual Websocket connection and initializes the event listeners
     *
     * @internal
     */
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
                reconnectDelay = 1;
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

    /**
     * Sets the Websocket details and initializes the Websocket connection
     *
     * @internal
     */
    async connect() {
        await this.setDetails();
        await this._connect();
    }

    /**
     * Disconnects from the websocket
     *
     * @internal
     */
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


    /**
     * Searches all file contents for the given query
     *
     * @param query The query string to search for
     *
     * @public
     */
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
                    reject("Timeout");
                }
            }, 10000);
        });
    }


    /**
     * Performs a git pull operation on the given directory
     *
     * @param dir The full directory path to perform a pull on
     *
     * @public
     */
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


    /**
     * Clones a new Repo to the given directory
     *
     * @param url The HTTPS URL of the repository
     * @param dir The full path of the directory to clone the repository to
     * @param branch The branch of the repository to clone
     *
     * @public
     */
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
    /**
     * Adds a new callback that will run any time a console message is rececived
     *
     * @param callback The callback to run, takes a single param, `message`, a string
     *
     * @public
     */
    addConsoleListener(callback: (message: string) => void) {
        this.socket.on("console", (data: ConsoleMessage) => {
            callback(data.line);
        });
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
