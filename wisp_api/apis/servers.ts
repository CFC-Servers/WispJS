import { WispAPICore } from "./index";

export type PowerRequest = "start" | "stop" | "restart" | "kill";
export type GetDetailsResponse = {
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

export type GetWebsocketDetailsResponse = {
  url: string;
  upload_url: string;
  token: string;
}

export type GetResourcesResponse = {
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

export class ServersAPI {
  constructor(private core: WispAPICore) {}

  // [POST] /api/client/servers/<UUID>/command
  async SendCommand(command: string): Promise<void> {
    await this.core.makeRequest("POST", "command", { command: command });
  }

  // [GET] api/client/servers/<UUID>/details
  async GetWebsocketDetails(): Promise<GetWebsocketDetailsResponse> {
    const response = await this.core.makeRequest("GET", "websocket");
    return await response.json();
  }

  // [PATCH] /api/client/servers/<UUID>/details
  async SetName(name: string): Promise<GetDetailsResponse> {
    const response = await this.core.makeRequest("PATCH", "details", { name: name });
    return await response.json();
  }

  // [GET] /api/client/servers/<UUID>
  async GetDetails(): Promise<GetDetailsResponse> {
    const response = await this.core.makeRequest("GET", "");
    return await response.json();
  }

  // [GET] /api/client/servers/<UUID>/resources
  async GetResources(): Promise<GetResourcesResponse> {
    const response = await this.core.makeRequest("GET", "resources");
    return await response.json();
  }

  // [POST] /api/client/servers/<UUID>/power
  async PowerRequest(action: PowerRequest): Promise<void> {
    await this.core.makeRequest("POST", "power", { signal: action });
  }
}
