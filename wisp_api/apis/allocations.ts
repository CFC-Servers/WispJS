import { WispAPICore } from "./index";
import type { PaginationData } from "./index";

/**
 * An Allocation object
 *
 * @internal
 */
export interface Allocation {
  object: "allocation";
  attributes: {
    id: number;
    /** Whether or not this Allocation is the primary one for the Server */
    primary: boolean;
    ip: string;
    port: number;
  }
}

/**
 * The response object from the GetAllocations call
 *
 * @remarks
 * Used in {@link AllocationsAPI.List}
 *
 * @public
 */
export interface GetAllocationsResponse {
  object: "list";
  data: Allocation[];
  meta: {
    pagination: PaginationData;
  }
}

/**
 * Handles the listing and updating of a Server's IP/Port Allocations
 *
 * @public
 */
export class AllocationsAPI {
  constructor(private core: WispAPICore) {}


  /**
   * Lists all Allocations for the Server
   *
   * @public
   */
  async List(): Promise<GetAllocationsResponse> {
    const response = await this.core.makeRequest("GET", "allocations");
    const data: GetAllocationsResponse = await response.json()

    return data;
  }


  /**
   * Sets the new primary Allocation for the server
   *
   * @param id Allocation ID of the new primary allocation
   *
   * @public
   */
  async Update(id: string): Promise<Allocation> {
    const response = await this.core.makeRequest("PUT", `allocations/${id}`);
    const data: Allocation = await response.json()

    return data;
  }
}
