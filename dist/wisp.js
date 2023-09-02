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
        const websocketInfo = await this.api.getWebsocketDetails();
        const url = websocketInfo.url.replace("us-phs-chi23.physgun.com:8080", "wispproxy.cfcservers.org");
        this.logger.info(`Connecting to websocket at ${url} - ${websocketInfo.token}`);
        this.socket = new WispSocket(this.logger, url, websocketInfo.token, ghPAT);
        await this.socket.connect();
    }
    async disconnect() {
        await this.socket.disconnect();
    }
}
