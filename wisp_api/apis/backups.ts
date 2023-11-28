import { WispAPICore } from "./index";
import type { PaginationData } from "./index";
import type { DownloadFileResponse } from "./filesystem";

export type Backup = {
  object: "backup";
  attributes: {
    uuid: string;
    uuid_short: string;
    name: string;
    sha256_hash: string;
    bytes: number;
    locked: boolean;
    creating: boolean;
    created_at: string;
  }
}

export type GetBackupsResponse = {
  object: "list";
  data: Backup[];
  meta: {
    pagination: PaginationData;
  }
}

export class BackupsAPI {
  constructor(private core: WispAPICore) {}

  // [GET] /api/client/servers/<UUID>/backups
  async List(): Promise<GetBackupsResponse> {
    const response = await this.core.makeRequest("GET", "backups");
    const data: GetBackupsResponse = await response.json();

    return data;
  }

  // TODO: Does this have a response?
  // [POST] /api/client/servers/<UUID>/backups
  async Create(name: string): Promise<Response> {
    return await this.core.makeRequest("POST", "backups", { name: name });
  }

  // [POST] /api/client/servers/<UUID>/backups/<ID>/locked
  async Lock(id: string): Promise<Response> {
    return await this.core.makeRequest("POST", `backups/${id}/locked`);
  }

  // TODO: Erm should we even offer this
  // [POST] /api/client/servers/<UUID>/backups/<ID>/deploy
  async Deploy(id: string): Promise<Response> {
    return await this.core.makeRequest("POST", `backups/${id}/deploy`);
  }

  // [GET] /api/client/servers/<UUID>/backups/ID>/download
  async Download(id: string): Promise<DownloadFileResponse> {
    const response = await this.core.makeRequest("GET", `backups/${id}/download`);
    const data: DownloadFileResponse = await response.json();

    return data;
  }

  // [DELETE] /api/client/servers/<UUID>/backups/<ID>
  async Delete(id: string): Promise<Response> {
    return await this.core.makeRequest("DELETE", `backups/${id}`);
  }
}
