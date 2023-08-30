var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    makeRequest(method, path, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = this.makeURL(path);
            const headers = {
                "Content-Type": "application/json",
                "Accept": "application/vnd.wisp.v1+json",
                "Authorization": `Bearer ${this.token}`
            };
            const request = () => __awaiter(this, void 0, void 0, function* () {
                let response;
                const requestData = { headers: headers };
                if (method == "GET") {
                    if (data !== null) {
                        requestData.params = data;
                    }
                    response = yield axios.get(url, requestData);
                }
                else if (method == "POST") {
                    response = yield axios.post(url, data, requestData);
                }
                else if (method == "DELETE") {
                    response = yield axios.delete(url, requestData);
                }
                else if (method == "PUT") {
                    response = yield axios.put(url, data, requestData);
                }
                else {
                    throw new Error(`Invalid method: ${method}`);
                }
                return response;
            });
            this.logger.info(`Sending ${method} request to ${url}`);
            return yield request();
        });
    }
    // Meta
    sendCommand(command) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.makeRequest("POST", "command", { command: command });
        });
    }
    getWebsocketDetails() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.makeRequest("GET", "websocket");
            return response.data;
        });
    }
    getServerDetails() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.makeRequest("GET", "");
        });
    }
    getResources() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.makeRequest("GET", "resources");
        });
    }
    powerRequest(action) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.makeRequest("POST", "power", { signal: action });
        });
    }
    // Filesystem
    // TODO: Handle pagination
    getDirectoryContents(path) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.makeRequest("GET", "files/directory", { path: path });
            return response.data;
        });
    }
    createDirectory(path) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.makeRequest("POST", "files/directory", { path: path });
        });
    }
    readFile(path) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.makeRequest("GET", "files/read", { path: path });
            return response.data.content;
        });
    }
    writeFile(path, content) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = { path: path, content: content };
            return yield this.makeRequest("POST", "files/write", data);
        });
    }
    deleteFiles(paths) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.makeRequest("POST", "files/delete", { paths: paths });
        });
    }
    renameFile(path, newPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = { path: path, to: newPath };
            return yield this.makeRequest("PUT", "files/rename", data);
        });
    }
    // FastDL
    syncFastDL() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.makeRequest("POST", "fastdl");
        });
    }
}
