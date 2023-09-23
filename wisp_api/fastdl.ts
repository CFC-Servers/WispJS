import { WispAPICore } from "./index";

export class FastDLAPI {
  constructor(private core: WispAPICore) {}

  // [POST] /api/client/servers/<UUID>/fastdl
  async Sync(): Promise<Response> {
    return await this.core.makeRequest("POST", "fastdl");
  }
}
