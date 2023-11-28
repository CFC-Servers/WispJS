import { WispAPICore } from "./index";
import type { PaginationData } from "./index";

/**
 * Device information
 *
 * @example
 * ```json
 * {
 *  "city_name": "Seattle",
 *  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
 *  "country_name": "US",
 *  "country_iso_code": "US"
 * }
 * ```
 *
 * @param city_name The name of the Device's City
 * @param user_agent The latest user agent used by the Device
 * @param country_name The country name of the Device
 * @param country_iso_code The country ISO code of the Device
 *
 * @internal
 */
export type Device = {
  city_name: string;
  user_agent: string;
  country_name: string;
  country_iso_code: string;
}

// TODO: Fully define the audit log type
/**
 * An Audit Log struct
 *
 * @internal
 */
export type AuditLog = {
  object: "audit_log";
  attributes: {
    action: string;
    subaction: string;
    device: Device | undefined;
    metadata: any;
    created_at: string;
  }
}

/**
 * The respones object from the GetAuditLogs call
 *
 * @remarks
 * Used in {@link AuditLogsAPI.List}
 */
export type GetAuditLogsResponse = {
  object: "list";
  data: AuditLog[];
  meta: {
    pagination: PaginationData;
  }
}


/**
 * Interface that handles Listing of all Audit Logs
 *
 * @public
 */
export class AuditLogsAPI {
  constructor(private core: WispAPICore) {}


  // TODO: Handle pagination
  /**
   * List all Audit Log events for the server
   *
   * @public
   */
  async List(): Promise<GetAuditLogsResponse> {
    const response = await this.core.makeRequest("GET", "audit-logs");
    const data: GetAuditLogsResponse = await response.json();

    return data;
  }
}
