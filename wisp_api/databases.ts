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

export class DatabasesAPI {
  constructor(private core: WispAPICore) {}

  // [GET] /api/client/servers/<UUID>/databases
  async List(): Promise<GetDatabasesResponse> {
    const response = await this.core.makeRequest("GET", "databases", { include: "hosts" });
    const data: GetDatabasesResponse = await response.json();

    return data;
  }

  // TODO: verify response
  // [DELETE] /api/client/servers/<UUID>/databases/<ID>
  async Delete(id: string): Promise<Response> {
    return await this.core.makeRequest("DELETE", `databases/${id}`);
  }

  // TODO: Verify response
  // [POST] /api/client/servers/<UUID>/databases/<ID>/rotate-password
  async RotatePassword(id: string): Promise<Response> {
    return await this.core.makeRequest("POST", `databases/${id}`);
  }
}
