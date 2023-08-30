import { WispAPI } from "./wisp_api.js";
import { WispSocket } from "./wisp_socket.js";

export { GitCloneResult, GitPullResult, FilesearchResults } from "./wisp_socket.js";

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
    const websocketInfo = await this.api.getWebsocketDetails();
    const url = websocketInfo.url;//.replace("us-phs-chi23.physgun.com:8080", "wispproxy.cfcservers.org");
    this.logger.info(`Connecting to websocket at ${url} - ${websocketInfo.token}`);

    this.socket = new WispSocket(this.logger, url, websocketInfo.token, ghPAT);
    await this.socket.connect();
  }
}
