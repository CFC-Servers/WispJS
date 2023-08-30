const winston = require("winston");
import { WispAPI } from "./wisp_api";
import { WispSocket } from "./wisp_socket";
export class WispInterface {
    constructor(domain, uuid, token) {
        this.logger = winston.createLogger({
            format: winston.format.simple(),
            transports: [new winston.transports.Console()]
        });
        this.api = new WispAPI(domain, uuid, token, this.logger);
    }
    async connect(ghPAT) {
        const websocketInfo = await this.api.getWebsocketDetails();
        this.logger.info(`Connecting to websocket at ${websocketInfo.url} - ${websocketInfo.token}`);
        this.socket = new WispSocket(this.logger, websocketInfo.url, websocketInfo.token, ghPAT);
        await this.socket.connect();
    }
}
