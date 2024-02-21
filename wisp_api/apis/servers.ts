import { WispAPICore } from "./index";

export type PowerRequest = "start" | "stop" | "restart" | "kill";
export interface GetDetailsResponse {
  object: "server";
  attributes: {
    id: number;
    uuid: string;
    uuid_short: string;
    name: string;
    description: string|null;
    monitor: boolean;
    support_op: boolean;
    installed: number;
    limits: {
      memory: number;
      swap: number;
      disk: number;
      io: number;
      cpu: number;
    }
    feature_limits: {
      databases: number;
      backup_megabytes: number;
    }
  }
  // TODO: Get permissions types from permission api
  // TODO: This isn't present on the SetName response
  // meta: {
  //   extra_objects: { object: "permissions", attributes: ["server:support.update"] }
  // }
}

export interface GetWebsocketDetailsResponse {
  url: string;
  upload_url: string;
  token: string;
}

export interface GetResourcesResponse {
  status: number;
  proc: {
    memory: {
      total: number;
      limit: number;
    }
    cpu: {
      total: number;
      limit: number;
    }
    disk: {
      used: number;
      limit: number;
      io_limit: number;
    }
    network: {
      [key:string]: {
        rx_bytes: number;
        rx_packets: number;
        rx_errors: number;
        rx_dropped: number;
        tx_bytes: number;
        tx_packets: number;
        tx_errors: number;
        tx_dropped: number;
      }
    }
  }
}

/**
 * Handles generic Server interaction, such as Sending Commands, managing Power State, and getting Details
 *
 * @public
 */
export class ServersAPI {
  constructor(private core: WispAPICore) {}


  /**
   * Sends a command to the Server
   *
   * @param command The full command string to send to the Server
   *
   * @public
   */
  async SendCommand(command: string): Promise<void> {
    await this.core.makeRequest("POST", "command", { command: command });
  }


  /**
   * Gets the Websocket connection (and upload) details for the Server
   *
   * @public
   */
  async GetWebsocketDetails(): Promise<GetWebsocketDetailsResponse> {
    const response = await this.core.makeRequest("GET", "websocket");
    return await response.json();
  }


  /**
   * Sets the name of the Server as it appears in the panel
   * (Same thing as setting the name in the "Server Details" menu)
   *
   * @param name The new name of the server
   *
   * @public
   */
  async SetName(name: string): Promise<GetDetailsResponse> {
    const response = await this.core.makeRequest("PATCH", "details", { name: name });
    return await response.json();
  }


  /**
   * Retrieves the basic, technical details of the Server
   *
   * @public
   */
  async GetDetails(): Promise<GetDetailsResponse> {
    const response = await this.core.makeRequest("GET", "");
    return await response.json();
  }

  /**
   * Retrieves technical details of the Server's resources
   * (CPU, Memory, Disk, Network)
   *
   * @public
   */
  async GetResources(): Promise<GetResourcesResponse> {
    const response = await this.core.makeRequest("GET", "resources");
    return await response.json();
  }


  /**
   * Instructs the Server to start up, shut down, restart, or force quit
   *
   * @example
   * Example of stopping the server
   * ```
   * await wisp.api.PowerRequest("stop");
   * ```
   *
   * @param action The power action to send. One of: ["start", "stop", "restart", "kill"]
   *
   * @public
   */
  async PowerRequest(action: PowerRequest): Promise<void> {
    await this.core.makeRequest("POST", "power", { signal: action });
  }
}
