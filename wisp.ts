const winston = require("winston");

import { WispAPI } from "./wisp_api.js";
import { WispSocket } from "./wisp_socket.js";

export { GitCloneResult, GitPullResult, FilesearchResults } from "./wisp_socket";

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

  async connect(ghPAT: string) {
    const websocketInfo = await this.api.getWebsocketDetails();
    this.logger.info(`Connecting to websocket at ${websocketInfo.url} - ${websocketInfo.token}`);

    this.socket = new WispSocket(this.logger, websocketInfo.url, websocketInfo.token, ghPAT);
    await this.socket.connect();
  }
}
