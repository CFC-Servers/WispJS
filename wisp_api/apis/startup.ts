import { WispAPICore } from "./index";

export type UpdateStartup = {
  environment: { [key: string]: any };
}

export type StartupDetail = {
  object: "server_variable";
  attributes: {
    name: string;
    description: string;
    env_variable: string;
    default_value: string;
    tickable: boolean;
    user_editable: boolean;
    rules: string;
    server_value: string;
  };
}

export type StartupDetails = {
  object: "list";
  data: StartupDetail[];
  meta: {
    startup_command: string;
  };
}

/**
 * Handles interaction with Server Startup information
 *
 * @public
 */
export class StartupAPI {
  constructor(private core: WispAPICore) {}

  /**
   * Gets all Startup details for the Server
   *
   * @public
   */
  async Get(): Promise<StartupDetails> {
    const response = await this.core.makeRequest("GET", "startup");
    const startupDetails: StartupDetails = await response.json();

    return startupDetails;
  }

  /**
   * Updates the Startup details for the Server
   *
   * @remarks 
   * ℹ️  Pass the variables with their new value to update them. Response will contain the new updated startup
   *
   * @param startup The Startup values to update
   *
   * @public
   */
  async Update(startup: UpdateStartup): Promise<StartupDetails> {
    const response = await this.core.makeRequest("PUT", "startup", startup);
    const data: StartupDetails = await response.json();

    return data;
  }
}
