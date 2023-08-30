import axios from "axios";
export class WispAPI {
    constructor(domain, uuid, token, logger) {
        this.domain = domain;
        this.uuid = uuid;
        this.token = token;
        this.logger = logger;
    }
    makeURL(path) {
        return `${this.domain}/api/client/servers/${this.uuid}/${path}`;
    }
    async makeRequest(method, path, data) {
        const url = this.makeURL(path);
        const headers = {
            "Content-Type": "application/json",
            "Accept": "application/vnd.wisp.v1+json",
            "Authorization": `Bearer ${this.token}`
        };
        const request = async () => {
            let response;
            const requestData = { headers: headers };
            if (method == "GET") {
                if (data !== null) {
                    requestData.params = data;
                }
                response = await axios.get(url, requestData);
            }
            else if (method == "POST") {
                response = await axios.post(url, data, requestData);
            }
            else if (method == "DELETE") {
                response = await axios.delete(url, requestData);
            }
            else if (method == "PUT") {
                response = await axios.put(url, data, requestData);
            }
            else {
                throw new Error(`Invalid method: ${method}`);
            }
            return response;
        };
        this.logger.info(`Sending ${method} request to ${url}`);
        return await request();
    }
    // Meta
    async sendCommand(command) {
        try {
            await this.makeRequest("POST", "command", { command: command });
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to send command: ${error}`);
            return false;
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
    async powerRequest(action) {
        return await this.makeRequest("POST", "power", { signal: action });
    }
    // Filesystem
    // TODO: Handle pagination
    async getDirectoryContents(path) {
        const response = await this.makeRequest("GET", "files/directory", { path: path });
        return response.data;
    }
    async createDirectory(path) {
        return await this.makeRequest("POST", "files/directory", { path: path });
    }
    async readFile(path) {
        const response = await this.makeRequest("GET", "files/read", { path: path });
        return response.data.content;
    }
    async writeFile(path, content) {
        const data = { path: path, content: content };
        return await this.makeRequest("POST", "files/write", data);
    }
    async deleteFiles(paths) {
        return await this.makeRequest("POST", "files/delete", { paths: paths });
    }
    async renameFile(path, newPath) {
        const data = { path: path, to: newPath };
        return await this.makeRequest("PUT", "files/rename", data);
    }
    // FastDL
    async syncFastDL() {
        await this.makeRequest("POST", "fastdl");
    }
}
