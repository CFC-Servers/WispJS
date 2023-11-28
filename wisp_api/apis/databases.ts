import { WispAPICore } from "./index";
import type { PaginationData } from "./index";

export type DatabaseRelationship = {
  object: "database_host";
  attributes: {
    id: number;
    name: string;
    host: string;
    port: number;
    phpmyadmin_url: string | null;
  }
}

export type Database = {
  object: "database";
  attributes: {
    id: number;
    name: string;
    remote: string;
    username: string;
    password: string;
    relationships: DatabaseRelationship[];
  }
}
export type GetDatabasesResponse = {
  object: "list";
  data: Database[];
  meta: {
    pagination: PaginationData;
  }
}

/**
 * Handles Creating, Listing, Updating, and Deleting of Databases for the Server
 *
 * @public
 */
export class DatabasesAPI {
  constructor(private core: WispAPICore) {}

  // TODO: Handle Pagination
  /**
   * Lists all Databases associated with the Server
   *
   * @public
   */
  async List(): Promise<GetDatabasesResponse> {
    const response = await this.core.makeRequest("GET", "databases", { include: "hosts" });
    const data: GetDatabasesResponse = await response.json();

    return data;
  }


  // TODO: verify response
  /**
   * Deletes the Database from the Server
   *
   * @param id The ID of the Backup
   *
   * @public
   */
  async Delete(id: string): Promise<Response> {
    return await this.core.makeRequest("DELETE", `databases/${id}`);
  }


  // TODO: Verify response
  /**
   * Rotates the password for the Backup
   *
   * @param id The ID of the Backup
   *
   * @public
   */
  async RotatePassword(id: string): Promise<Response> {
    return await this.core.makeRequest("POST", `databases/${id}`);
  }
}
