import { WispAPICore } from "./index";
import type { PaginationData } from "./index";

export type Allocation = {
  object: "allocation";
  attributes: {
    primary: boolean;
    ip: string;
    alias: string;
    port: number;
  }
}

export type GetAllocationsResponse = {
  object: "list";
  data: Allocation[];
  meta: {
    pagination: PaginationData;
  }
}

export class AllocationsAPI {
  constructor(private core: WispAPICore) {}

  // [GET] /api/client/servers/<UUID>/allocations
  async List(): Promise<GetAllocationsResponse> {
    const response = await this.core.makeRequest("GET", "allocations");
    const data: GetAllocationsResponse = await response.json()

    return data;
  }

  // [PUT] /api/client/servers/<UUID>/allocations/<ID>
  async Update(id: string): Promise<Response> {
    return await this.core.makeRequest("PUT", `allocations/${id}`);
  }
}
