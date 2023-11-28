import { WispAPICore } from "./index";

export type Mod = {
  object: "mod";
  attributes: {
    id: number;
    name: string;
    description: string;
    version: string;
    category: string;
    install_count: number;
    server_state: number;
  }
}

export type GetModsResponse = {
  object: "list";
  data: Mod[];
}

export class ModsAPI {
  constructor(private core: WispAPICore) {}

  // [GET] /api/client/servers/<UUID>/mods
  async List(search: string | null = null): Promise<GetModsResponse> {
    const searchStruct = search ? { search: search } : null;
    const response = await this.core.makeRequest("GET", "mods", searchStruct);
    const data: GetModsResponse = await response.json();

    return data;
  }

  // [POST] /api/client/servers/<UUID>/mods/<ID>
  async Install(id: string): Promise<Response> {
    return await this.core.makeRequest("POST", `mods/${id}`);
  }
}
