import { io, Manager, Socket } from "socket.io-client";

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
  output: string | undefined;
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
  manager: Manager;
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

      this.manager = new Manager(this.url, {
        addTrailingSlash: false,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 50,
        reconnectionDelay: 250,
        timeout: 5000,
        extraHeaders: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      const socket = this.manager.socket("/");
      socket.on("connect", () => {
        this.logger.info("Connected to WebSocket");
        socket.emit("auth", this.token);
      });

      socket.on("error", (reason) => {
        this.logger.error(`WebSocket error: ${reason}`);
      });

      socket.on("connect_error", (error) => {
        this.logger.error(`WebSocket Connect error: ${error}`);
        reject();
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
      }, 5000);
    });
  }

  gitPull(dir: string) {
    return new Promise<GitPullResult | undefined>((resolve, reject) => {
      let isPrivate = false;

      const finished = (success: boolean, output: string | undefined) => {
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
        finished(true, commit);
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
    return new Promise<GitCloneResult | undefined>((resolve, reject) => {
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
