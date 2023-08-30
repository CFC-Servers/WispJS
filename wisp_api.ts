import axios from "axios";

type RequestTypes = "GET" | "POST" | "PUT" | "DELETE";
interface RequestData {
  headers: {[key: string]: string};
  params?: {[key: string]: any};
}

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
    return `${this.domain}/api/client/servers/${this.uuid}/${path}`;
  }

  async makeRequest(method: RequestTypes, path: string, data?: any) {
    const url = this.makeURL(path);
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/vnd.wisp.v1+json",
      "Authorization": `Bearer ${this.token}`
    };

    const request = async () => {
      let response;
      const requestData: RequestData = { headers: headers }

      const instance = axios.create({
        timeout: 3000,
        adapter: ["http"]
      });

      if (method == "GET") {
        if (data !== null) {
          requestData.params = data;
        }

        response = await instance.get(url, requestData);
      } else if (method == "POST") {
        response = await instance.post(url, data, requestData);
      } else if (method == "DELETE") {
        response = await instance.delete(url, requestData);
      } else if (method == "PUT") {
        response = await instance.put(url, data, requestData);
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
      await this.makeRequest("POST", "command", { command: command });
      return true
    }
    catch (error) {
      this.logger.error(`Failed to send command: ${error}`);
      return false
    }
  }

  async getWebsocketDetails() {
    const response = await this.makeRequest("GET", "websocket");
    return response.data;
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
    return response.data;
  }

  async createDirectory(path: string) {
    return await this.makeRequest("POST", "files/directory", { path: path });
  }

  async readFile(path: string) {
    const response = await this.makeRequest("GET", "files/read", { path: path });
    return response.data.content;
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

