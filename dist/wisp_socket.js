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
            this.logger.info("Connecting to WebSocket", this.url, this.token);
            const socket = io(this.url, {
                transports: ["websocket"],
                reconnection: true,
                reconnectionAttempts: 50,
                reconnectionDelay: 250,
                reconnectionDelayMax: 5000,
                randomizationFactor: 0.5
            });
            socket.on("connect", () => {
                this.logger.info("Connected to WebSocket");
                socket.emit("auth", this.token);
            });
            socket.on("error", (reason) => {
                this.logger.error(`WebSocket error: ${reason}`);
            });
            socket.on("connect_error", (error) => {
                this.logger.error(`WebSocket Connect error: ${error}`);
                if (!connectedFirst) {
                    connectedFirst = true;
                    reject();
                }
            });
            socket.on("disconnect", (reason) => {
                this.logger.error(`Disconnected from WebSocket: ${reason}`);
                if (reason === "io server disconnect") {
                    this.logger.error("Server closed connection - retrying");
                }
            });
            socket.on("reconnect", (attempts) => {
                this.logger.error(`WebSocket succesfully reconnected. Attempts: ${attempts}`);
            });
            socket.on("reconnect_error", (error) => {
                this.logger.error(`WebSocket failed to reconnect: ${error}`);
            });
            socket.on("reconnect_failed", () => {
                this.logger.error(`WebSocket failed to reconnect after max attempts`);
            });
            socket.on("auth_success", () => {
                this.logger.info("Auth success");
                if (!connectedFirst) {
                    connectedFirst = true;
                    resolve();
                }
            });
            this.socket = socket;
            setTimeout(() => {
                if (!connectedFirst) {
                    reject();
                }
            }, 5000);
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
            }, 5000);
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
