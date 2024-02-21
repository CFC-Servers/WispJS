import { WispAPICore } from "./index";
import type { PaginationData } from "./index";

export type SupportPermissionType = "server:support.update";
export type ControlPermissionType = "server:control.console" | "server:control.command" | "server:control.start" | "server:control.stop" | "server:control.restart";
export type SubuserPermissionType = "server:subuser.read" | "server:subuser.update" | "server:subuser.create" | "server:subuser.delete";
export type AllocationPermissionType = "server:allocation.read" | "server:allocation.update";
export type StartupPermissionType = "server:startup.read" | "server:startup.update";
export type DatabasePermissionType = "server:database.read" | "server:database.update" | "server:database.create" | "server:database.update";
export type FilePermissionType = "server:file.sftp" | "server:file.list" | "server:file.read" | "server:file.write" | "server:file.delete" | "server:file.archive" | "server:file.git" | "server:file.steam_workshop";
export type SchedulePermissionType = "server:schedule.read" | "server:schedule.update" | "server:schedule.create" | "server:schedule.delete";
export type BackupPermissionType = "server:backup.read" | "server:backup.update" | "server:backup.create" | "server:backup.delete" | "server:backup.deploy" | "server:backup.download";
export type DetailsPermissionType = "server:details.read" | "server:details.update";
export type AuditPermissionType = "server:audit.read";
export type FastDLPermissionType = "server:fastdl.read" | "server:fastdl.update";
export type ModPermissionType = "server:mod.read" | "server:mod.update";
export type MonitorPermissionType = "server:monitor.read" | "server:monitor.update";
export type ReinstallPermissionType = "server:reinstall.update";
export type Permission = SupportPermissionType | ControlPermissionType | SubuserPermissionType | AllocationPermissionType | StartupPermissionType | DatabasePermissionType | FilePermissionType | SchedulePermissionType | BackupPermissionType | DetailsPermissionType | AuditPermissionType | FastDLPermissionType | ModPermissionType | MonitorPermissionType | ReinstallPermissionType;

export interface User {
  object: "user";
  attributes: {
    email: string;
    name_first: string;
    naem_last: string;
    has_2fa: boolean;
  }
}

export interface Subuser {
  object: "server_subuser";
  attributes: {
    id: number;
    permissions: Permission[];
    created_at: string;
    updated_at: string;
    relationships: {
      user: User;
    }
  }
}

export interface GetSubusersResponse {
  object: "list";
  data: Subuser[];
  meta: {
    pagination: PaginationData;
  }
}

export interface GetAllSubuserPermissionsResponse {
  permissions: Permission[];
  assignable: Permission[];
}

/**
 * Handles interfacing with the Subusers API
 *
 * @public
 */
export class SubusersAPI {
  constructor(private core: WispAPICore) {}


  /**
   * Lists all Subusers for the Server
   *
   * @public
   */
  async List(): Promise<GetSubusersResponse> {
    const response = await this.core.makeRequest("GET", "subusers", { include: "user" });
    const data: GetSubusersResponse = await response.json();

    return data;
  }


  /**
   * Retrieves the details for the Subuser
   *
   * @param id The ID of the Subuser
   *
   * @public
   */
  async GetDetails(id: string): Promise<Subuser> {
    const response = await this.core.makeRequest("GET", `subusers/${id}`, { include: "user" });
    const data: Subuser = await response.json();

    return data;
  }


  /**
   * Get all permissions available to Subusers
   *
   * @public
   */
  async GetAllPermissions(): Promise<GetAllSubuserPermissionsResponse> {
    const response = await this.core.makeRequest("GET", "subusers/permissions");
    const data: GetAllSubuserPermissionsResponse = await response.json();

    return data;
  }


  /**
   * Creates a new Subuser
   *
   * @param email The email for the Subuser
   * @param permissions The Permissions to grant to the Subuser
   *
   * @public
   */
  async Create(email: string, permissions: Permission[]): Promise<Subuser> {
    const requestData = {
      email: email,
      permissions: permissions
    }

    const response = await this.core.makeRequest("POST", "subusers", requestData);
    const data: Subuser = await response.json();

    return data;
  }


  /**
   * Updates the Subuser
   *
   * @param id The ID of the Subuser
   * @param email The new email of the Subuser
   * @param permissions The new permissions for the Subuser
   *
   * @public
   */
  async Update(id: string, email: string, permissions: Permission[]): Promise<Subuser> {
    const data = {
      email: email,
      permissions: permissions
    }

    const response = await this.core.makeRequest("PATCH", `subusers/${id}`, data);
    const responseData: Subuser = await response.json();

    return responseData;
  }

  /**
   * Deletes the Subuser
   *
   * @param id The ID of the Subuser
   *
   * @public
   */
  async Delete(id: string): Promise<void> {
    await this.core.makeRequest("DELETE", `subusers/${id}`);
  }
}
