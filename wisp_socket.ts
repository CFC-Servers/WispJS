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
}


export interface WispSocket {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  logger: any;
  url: string;
  token: string;
  ghToken: string;
}

// TODO: Handle errors better
// TODO: Allow for no ghToken
// TODO: Don't require a logger
export class WispSocket {
  constructor(logger: any, url: string, token: string, ghToken: string) {
    this.logger = logger;
    this.url = url;
    this.token = token;
    this.ghToken = ghToken;
  }

  connect() {
    return new Promise<void>((resolve, reject) => {
      let connectedFirst = false;
      this.logger.info("Connecting to WebSocket", this.url, this.token);

      const socket = io(this.url, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 50,
        reconnectionDelay: 250,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
        autoConnect: false
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
          socket.connect();
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

      socket.onAny((event, ...args) => {
        let message = `Received event: ${event}`;
        this.logger.info(message, JSON.stringify(args));
      });

      this.socket = socket;

      setTimeout(() => {
        if (!connectedFirst) {
          this.logger.error("Socket didn't connect in time");
          reject();
        }
      }, 20000);

      socket.connect();
      this.logger.info("Sent socket.connect()");
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
          finished(false, "");
        }
      });

      sendRequest();
    });
  }

  gitClone(url: string, dir: string, branch: string) {
    return new Promise<GitCloneResult>((resolve, reject) => {
      let isPrivate = false;

      const finished = (success: boolean) => {
        this.socket.removeAllListeners("git-clone");
        this.socket.removeAllListeners("git-error");
        this.socket.removeAllListeners("git-success");

        if (success) {
          const result: GitCloneResult = {
            isPrivate: isPrivate
          }

          resolve(result);
        } else {
          reject();
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
          finished(false);
        }
      });

      sendRequest();
    });
  }

  addConsoleListener(callback: (message: string) => void) {
    this.socket.on("console", (data: ConsoleMessage) => {
      callback(data.line);
    });
  }
}
