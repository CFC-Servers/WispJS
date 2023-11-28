import { WispAPI } from "./wisp_api/index.js";
import { WispSocket } from "./wisp_socket/index.js";

export interface WispInterface {
  socket: WispSocket;
  api: WispAPI;
  logger: any;
}

/**
 * The primary Wisp Interface, exposing interactions with both the HTTP and Websockets API
 *
 * @param domain The Domain of the Pterodactyl/Wisp panel (e.g. `my.gamepanel.gg`)
 * @param uuid The UUID of the server to reference in all API requests
 * @param token The panel API token to use for authorization
 *
 * @public
 */
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

  /**
   * Establish a Websocket connection with the panel. Required to make Websocket API requests.
   *
   * @remarks
   * ℹ️  `this.socket` is available only after calling this function.
   *
   * @param ghPAT The Github Personal Access Token used for Cloning/Pulling of private repositories
   *
   * @public
   */
  async connect(ghPAT: string) {
    this.socket = new WispSocket(this.logger, this.api, ghPAT);
    await this.socket.connect();
  }

  /**
   * Manually disconnects from the Websocket connection.
   *
   * @public
   */
  async disconnect() {
    await this.socket.disconnect();
  }
}
