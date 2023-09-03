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
        if (!connectedFirst) {
          console.error("Socket didn't connect in time");
          reject();
        }
      }, 5000);

      console.log("Sent socket.connect()");
    });
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
      let done = false;
      let callback: (data: ConsoleMessage) => void;

      callback = (data: ConsoleMessage) => {
        const line = data.line;
        if (line.startsWith(nonce)) {
          this.socket.off("console", callback);

          const message = line.slice(nonce.length);
          resolve(message);
        }
      }

      this.socket.on("console", callback);
      this.socket.emit("send command", command);

      setTimeout(() => {
        if (!done) {
          this.socket.off("console", callback);
          reject();
        }
      }, timeout);
    });
  }
}
