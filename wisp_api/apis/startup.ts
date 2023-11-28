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

export class StartupAPI {
  constructor(private core: WispAPICore) {}

  // [GET] /api/client/servers/<UUID>/startup
  async Get(): Promise<StartupDetails> {
    const response = await this.core.makeRequest("GET", "startup");
    const startupDetails: StartupDetails = await response.json();

    return startupDetails;
  }

  // [PUT] /api/client/servers/<UUID>/startup
  // "Pass the variables with their new value to update them. Response will contain the new updated startup."
  async Update(startup: UpdateStartup): Promise<Response> {
    return await this.core.makeRequest("PUT", "startup", startup);
  }
}
