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

/**
 * Handles Listing and Installating of Mods
 *
 * @public
 */
export class ModsAPI {
  constructor(private core: WispAPICore) {}


  /**
   * Lists all Mods available to the Server
   *
   * @public
   */
  async List(): Promise<GetModsResponse> {
    const response = await this.core.makeRequest("GET", "mods");
    const data: GetModsResponse = await response.json();

    return data;
  }


  /**
   * Installs or Uninstalls the Mod with the given id
   *
   * @param id The ID of the Mod to Install/Uninstall
   *
   * @public
   */
  async ToggleInstall(id: string): Promise<void> {
    await this.core.makeRequest("POST", `mods/${id}`);
  }
}
