var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    connect(ghPAT) {
        return __awaiter(this, void 0, void 0, function* () {
            const websocketInfo = yield this.api.getWebsocketDetails();
            this.logger.info(`Connecting to websocket at ${websocketInfo.url} - ${websocketInfo.token}`);
            this.socket = new WispSocket(this.logger, websocketInfo.url, websocketInfo.token, ghPAT);
            yield this.socket.connect();
        });
    }
}
