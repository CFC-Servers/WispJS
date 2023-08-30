"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    connect(ghPAT) {
        return __awaiter(this, void 0, void 0, function* () {
            const websocketInfo = yield this.api.getWebsocketDetails();
            this.logger.info(`Connecting to websocket at ${websocketInfo.url} - ${websocketInfo.token}`);
            this.socket = new wisp_socket_js_1.WispSocket(this.logger, websocketInfo.url, websocketInfo.token, ghPAT);
            yield this.socket.connect();
        });
    }
}
exports.WispInterface = WispInterface;
