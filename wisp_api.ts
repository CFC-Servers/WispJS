type RequestTypes = "GET" | "POST" | "PUT" | "DELETE";

export interface WispAPI {
  domain: string;
  uuid: string;
  token: string;
  logger: any;
}

export type PowerRequest = "start" | "stop" | "restart" | "kill";

export class WispAPI {
  constructor(domain: string, uuid: string, token: string, logger: any) {
    this.domain = domain;
    this.uuid = uuid;
    this.token = token;
    this.logger = logger;
  }

  makeURL(path: string) {
    return `https://${this.domain}/api/client/servers/${this.uuid}/${path}`;
  }

  async makeRequest(method: RequestTypes, path: string, data?: any) {
    let url = this.makeURL(path);
    const headers = new Headers({
      "Content-Type": "application/json",
      "Accept": "application/vnd.wisp.v1+json",
      "Authorization": `Bearer ${this.token}`
    });
    console.log("Headers", headers);

    const request = async () => {
      let response;

      if (method == "GET") {
        if (data !== null) {
          const params = new URLSearchParams(data);
          const uri = new URL(url);

          uri.search = params.toString();
          url = uri.toString();

          this.logger.info(`Sending (updated) GET request to ${url}`);
        }

        response = await fetch(url, { method: "GET", headers: headers });
        this.logger.info(`Got response from ${url} - ${response.status}`);
      } else if (method == "POST") {
        data = JSON.stringify(data);
        response = await fetch(url, { method: "POST", headers: headers, body: data });
      } else if (method == "DELETE") {
        response = await fetch(url, { method: "DELETE", headers: headers });
      } else if (method == "PUT") {
        data = JSON.stringify(data);
        response = await fetch(url, { method: "PUT", headers: headers, body: data });
      } else {
        throw new Error(`Invalid method: ${method}`);
      }

      return response;
    }

    this.logger.info(`Sending ${method} request to ${url}`);
    return await request();
  }

  // Meta
  async sendCommand(command: string) {
    try {
      const response = await this.makeRequest("POST", "command", { command: command });
      return response.ok;
    }
    catch (error) {
      this.logger.error(`Failed to send command: ${error}`);
      return false
    }
  }

  async getWebsocketDetails() {
    const response = await this.makeRequest("GET", "websocket");
    console.log("Got websocket details response", response);
    return await response.json();
  }

  async getServerDetails() {
    return await this.makeRequest("GET", "");
  }

  async getResources() {
    return await this.makeRequest("GET", "resources");
  }

  async powerRequest(action: PowerRequest) {
    return await this.makeRequest("POST", "power", { signal: action });
  }

  // Filesystem
  // TODO: Handle pagination
  async getDirectoryContents(path: string) {
    const response = await this.makeRequest("GET", "files/directory", { path: path });
    return await response.json();
  }

  async createDirectory(path: string) {
    return await this.makeRequest("POST", "files/directory", { path: path });
  }

  async readFile(path: string) {
    const response = await this.makeRequest("GET", "files/read", { path: path });
    const responseData = await response.json();

    return responseData.content;
  }

  async writeFile(path: string, content: string) {
    const data = { path: path, content: content };
    return await this.makeRequest("POST", "files/write", data);
  }

  async deleteFiles(paths: string[]) {
    return await this.makeRequest("POST", "files/delete", { paths: paths });
  }

  async renameFile(path: string, newPath: string) {
    const data = { path: path, to: newPath };
    return await this.makeRequest("PUT", "files/rename", data);
  }

  // FastDL
  async syncFastDL() {
    await this.makeRequest("POST", "fastdl");
  }
}

