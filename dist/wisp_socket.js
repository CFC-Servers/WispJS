import { io } from "socket.io-client";
// TODO: Handle errors better
// TODO: Allow for no ghToken
// TODO: Don't require a logger
export class WispSocket {
    constructor(logger, url, token, ghToken) {
        this.logger = logger;
        this.url = url;
        this.token = token;
        this.ghToken = ghToken;
    }
    connect() {
        return new Promise((resolve, reject) => {
            let connectedFirst = false;
            console.log("Connecting to WebSocket", this.url, this.token);
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
            this.socket.on("error", (reason) => {
                console.error(`WebSocket error: ${reason}`);
            });
            this.socket.on("connect_error", (error) => {
                console.error(`WebSocket Connect error: ${error.toString()}`);
                if (!connectedFirst) {
                    connectedFirst = true;
                    reject();
                }
            });
            this.socket.on("disconnect", (reason) => {
                console.error(`Disconnected from WebSocket: ${reason}`);
                if (reason === "io server disconnect") {
                    console.error("Server closed connection - retrying");
                    this.socket.connect();
                }
            });
            this.socket.on("auth_success", () => {
                console.log("Auth success");
                if (!connectedFirst) {
                    connectedFirst = true;
                    resolve();
                }
            });
            this.socket.onAny((event, ...args) => {
                let message = `Received event: ${event}`;
                console.log(message, JSON.stringify(args));
            });
            setTimeout(() => {
                console.error(`Connected: ${this.socket?.connected}`);
                console.error(`Transport: ${this.socket?.io?.engine?.transport?.name}`);
                if (!connectedFirst) {
                    console.error("Socket didn't connect in time");
                    reject();
                }
            }, 5000);
            console.log("Sent socket.connect()");
        });
    }
    filesearch(query) {
        return new Promise((resolve, reject) => {
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
    gitPull(dir) {
        return new Promise((resolve, reject) => {
            let isPrivate = false;
            const finished = (success, output) => {
                this.socket.removeAllListeners("git-pull");
                this.socket.removeAllListeners("git-error");
                this.socket.removeAllListeners("git-success");
                const result = {
                    output: output,
                    isPrivate: isPrivate
                };
                if (success) {
                    resolve(result);
                }
                else {
                    reject(output);
                }
            };
            const sendRequest = (includeAuth = false) => {
                const data = { dir: dir };
                if (includeAuth) {
                    isPrivate = true;
                    data.authkey = this.ghToken;
                }
                this.socket.emit("git-pull", data);
            };
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
                }
                else {
                    this.logger.error(`Error updating addon: ${message}`);
                    finished(false, "");
                }
            });
            sendRequest();
        });
    }
    gitClone(url, dir, branch) {
        return new Promise((resolve, reject) => {
            let isPrivate = false;
            const finished = (success) => {
                this.socket.removeAllListeners("git-clone");
                this.socket.removeAllListeners("git-error");
                this.socket.removeAllListeners("git-success");
                if (success) {
                    const result = {
                        isPrivate: isPrivate
                    };
                    resolve(result);
                }
                else {
                    reject();
                }
            };
            const sendRequest = (includeAuth = false) => {
                const data = { dir: dir, url: url, branch: branch };
                if (includeAuth) {
                    isPrivate = true;
                    data.authkey = this.ghToken;
                }
                this.socket.emit("git-clone", data);
            };
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
                }
                else {
                    this.logger.info(`Error cloning repo: ${message}`);
                    finished(false);
                }
            });
            sendRequest();
        });
    }
    addConsoleListener(callback) {
        this.socket.on("console", (data) => {
            callback(data.line);
        });
    }
}
