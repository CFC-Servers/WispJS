import { WispAPI } from "./wisp_api.js";
import { WispSocket } from "./wisp_socket.js";
export class WispInterface {
    constructor(domain, uuid, token) {
        this.logger = {
            info: (msg) => {
                console.log(msg);
            },
            error: (msg) => {
                console.error(msg);
            }
        };
        this.api = new WispAPI(domain, uuid, token, this.logger);
    }
    async connect(ghPAT) {
        this.socket = new WispSocket(this.logger, this.api, ghPAT);
        await this.socket.connect();
    }
    async disconnect() {
        await this.socket.disconnect();
    }
}
