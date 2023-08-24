const winston = require("winston");
import { WispAPI } from "./wisp_api";
import { WispSocket } from "./wisp_socket";


export interface WispInterface {
  socket: WispSocket;
  api: WispAPI;
  logger: any;
}

export class WispInterface {
  constructor(domain: string, uuid: string, token: string) {
    this.logger = winston.createLogger({
      format: winston.format.simple(),
      transports: [new winston.transports.Console()]
    });

    this.api = new WispAPI(domain, uuid, token, this.logger);
  }

  async connect() {
    const websocketInfo = await this.api.getWebsocketDetails();
    this.logger.info(`Connecting to websocket at ${websocketInfo.url} - ${websocketInfo.token}`);
    this.socket = new WispSocket(this.logger);
    await this.socket.connect(websocketInfo.url, websocketInfo.token);
  }
}
