import { WispAPI } from "./wisp_api.js";
import { WispSocket } from "./wisp_socket.js";

export interface WispInterface {
  socket: WispSocket;
  api: WispAPI;
  logger: any;
}

export class WispInterface {
  constructor(domain: string, uuid: string, token: string) {
    this.logger = {
      info: (msg: any) => {
        console.log(msg);
      },
      error: (msg: string) => {
        console.error(msg);
      }
    };

    this.api = new WispAPI(domain, uuid, token, this.logger);
  }

  async connect(ghPAT: string) {
    this.socket = new WispSocket(this.logger, this.api, ghPAT);
    await this.socket.connect();
  }

  async disconnect() {
    await this.socket.disconnect();
  }
}
