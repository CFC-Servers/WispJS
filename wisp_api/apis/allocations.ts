import { WispAPICore } from "./index";
import type { PaginationData } from "./index";

/**
 * An Allocation object
 *
 * @internal
 */
export type Allocation = {
  object: "allocation";

  /**
   * An Allocation's attributes
   *
   * @param id The ID of the Allocation
   * @param primary Whether or not this Allocation is the Server's primary Allocation
   * @param ip The IP of the Allocation
   * @param port the port of the Allocation
   */
  attributes: {
    id: number;
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
 */
export type GetAllocationsResponse = {
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
