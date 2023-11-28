import { WispAPICore } from "./index";
import type { PaginationData } from "./index";

export type Allocation = {
  object: "allocation";
  attributes: {
    id: number;
    primary: boolean;
    ip: string;
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

export type UpdateAllocationResponse = {
  object: "allocation";
  attributes: {
    id: number;
    primary: boolean;
    ip: string;
    port: number;
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
  /**
   * Sets the new Primary allocation for the server
   * @param id Allocation ID of the new primary allocation
   */
  async Update(id: string): Promise<UpdateAllocationResponse> {
    const response = await this.core.makeRequest("PUT", `allocations/${id}`);
    return await response.json()
  }
}
