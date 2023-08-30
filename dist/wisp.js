"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WispInterface = void 0;
const winston_1 = require("winston");
const wisp_api_js_1 = require("./wisp_api.js");
const wisp_socket_js_1 = require("./wisp_socket.js");
class WispInterface {
    constructor(domain, uuid, token) {
        this.logger = (0, winston_1.createLogger)({
            format: winston_1.format.simple(),
            transports: [new winston_1.transports.Console()]
        });
        this.api = new wisp_api_js_1.WispAPI(domain, uuid, token, this.logger);
    }
    async connect(ghPAT) {
        const websocketInfo = await this.api.getWebsocketDetails();
        this.logger.info(`Connecting to websocket at ${websocketInfo.url} - ${websocketInfo.token}`);
        this.socket = new wisp_socket_js_1.WispSocket(this.logger, websocketInfo.url, websocketInfo.token, ghPAT);
        await this.socket.connect();
    }
}
exports.WispInterface = WispInterface;
