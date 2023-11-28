import { WispAPICore } from "./index";
import type { PaginationData } from "./index";

export type Device = {
  city_name: string;
  user_agent: string;
  country_name: string;
  country_iso_code: string;
}

// TODO: Fully define the audit log type
export type AuditLog = {
  object: "audit_log";
  attributes: {
    action: string;
    subaction: string;
    device: Device | null;
    metadata: any;
    created_at: string;
  }
}

export type GetAuditLogsResponse = {
  object: "list";
  data: AuditLog[];
  meta: {
    pagination: PaginationData;
  }
}


export class AuditLogsAPI {
  constructor(private core: WispAPICore) {}

  // TODO: Handle pagination
  // [GET] /api/client/servers/<UUID>/audit-logs
  async List(): Promise<GetAuditLogsResponse> {
    const response = await this.core.makeRequest("GET", "audit-logs");
    const data: GetAuditLogsResponse = await response.json();

    return data;
  }
}
