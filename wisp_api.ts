type RequestTypes = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface WispAPI {
  domain: string;
  uuid: string;
  token: string;
  logger: any;
}

export type UpdateStartup = {
  environment: {
    [key: string]: any
  };
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

export type PaginationData = {
  total: number;
  count: number;
  perPage: number;
  currentPage: number;
  totalPages: number;
}

export type DirectoryFile = {
  object: "file";
  attributes: {
    type: "file" | "directory";
    name: string;
    size: number;
    mime: string;
    symlink: boolean;
    created_at: string;
    modified_at: string;
  }
}

export interface DirectoryContentsResponse {
  object: "list";
  data: DirectoryFile[]
  meta: {
    pagination: PaginationData | undefined;
  }
}

export type FileReadResponse = {
  content: string;
}

export type FileWriteRequest = {
  path: string;
  content: string;
}

export type CopyFileRequest = {
  path: string;
}

export type DownloadFileResponse = {
  url: string;
}

export type RenameFileRequest = {
  path: string;
  to: string;
}

export type CompressFilesRequest = {
  paths: string[];
  to: string;
}

export type Allocation = {
  object: "allocation";
  attributes: {
    primary: boolean;
    ip: string;
    alias: string;
    port: number;
  }
}

export type GetAllocationsResponse = {
  object: "list";
  data: Allocation[];
  meta: {
    pagination: PaginationData;
  }
}

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

export type CronSchedule = {
  minute: string;
  hour: string;
  day_of_week: string;
  day_of_month: string;
}

export type Schedule = {
  object: "schedule";
  attributes: {
    id: number;
    name: string;
    cron: CronSchedule;
    is_active: boolean;
    is_processing: boolean;
    last_run_at: string | null;
    next_run_at: string | null;
    created_at: string;
    updated_at: string;
  }
}

export type GetSchedulesResponse = {
  object: "list";
  data: Schedule[];
  meta: {
    pagination: PaginationData;
  }
}

export type CreateScheduleRequest = {
  name: string;
  cron_minute: string;
  cron_hour: string;
  cron_day_of_week: string;
  cron_day_of_month: string;
  is_active: boolean;
}

export type ScheduleTask = {
  object: "schedule_task";
  attributes: {
    id: number;
    sequence_id: number;
    action: string;
    payload: string;
    time_offset: string;
    is_processing: boolean;
    created_at: string;
    updated_at: string;
  }
}

export type ScheduleTaskAction = "command" | "power" | "backup";

export type CreateScheduleTaskRequest = {
  action: ScheduleTaskAction;
  time_offset: number;
  payload: string | null;
}

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

export type User = {
  object: "user";
  attributes: {
    email: string;
    name_first: string;
    naem_last: string;
    has_2fa: boolean;
  }
}

export type Subuser = {
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

export type GetSubusersResponse = {
  object: "list";
  data: Subuser[];
  meta: {
    pagination: PaginationData;
  }
}

export type GetAllSubuserPermissionsResponse = {
  permissions: Permission[];
  assignable: Permission[];
}

export type PowerRequest = "start" | "stop" | "restart" | "kill";

export class WispAPI {
  constructor(domain: string, uuid: string, token: string, logger: any) {
    this.domain = domain;
    this.uuid = uuid;
    this.token = token;
    this.logger = logger;
  }

  setUUID(uuid: string) {
    this.uuid = uuid;
  }

  makeURL(path: string) {
    return `https://${this.domain}/api/client/servers/${this.uuid}/${path}`;
  }

  async makeRequest(method: RequestTypes, path: string, data?: any) {
    let url = this.makeURL(path);
    const headers = new Headers({
      "Content-Type": "application/json",
      "Accept": "application/vnd.wisp.v1+json",
      "Authorization": `Bearer ${this.token}`,
      "User-Agent": "WispJS (https://github.com/CFC-Servers/wispjs, 1.0.0)"
    });

    const request = async () => {
      let response: Response;

      console.log(`${method} -> ${url}`);

      switch(method) {
        case "GET":
          if (data !== null) {
            const params = new URLSearchParams(data);
            const uri = new URL(url);

            uri.search = params.toString();
            url = uri.toString();
            console.log(`Updated GET URL: ${url}`);
          }

          response = await fetch(url, { method: "GET", headers: headers });
          break;

        case "POST":
          data = JSON.stringify(data);
          response = await fetch(url, { method: "POST", headers: headers, body: data });
          break;

        case "PUT":
          data = data ? JSON.stringify(data) : "";
          response = await fetch(url, { method: "PUT", headers: headers, body: data });
          break;

        case "PATCH":
          data = JSON.stringify(data);
          response = await fetch(url, { method: "PATCH", headers: headers, body: data });
          break;

        case "DELETE":
          response = await fetch(url, { method: "DELETE", headers: headers });
          break;

        default:
          throw new Error(`Invalid method: ${method}`);
      }

      if (!response.ok) {
        const status = response.status;
        const statusText = response.statusText;
        this.logger.error(`Request failed: ${method} -> ${url}: ${status} - ${statusText}`);

        const text = await response.text();
        this.logger.error(text);

        throw new Error(`Request failed! Status: ${status} - ${statusText}`);
      }

      if (!response.ok) {
          const err = `Request failed! ${method} -> '${url}: ${response.status} - ${response.statusText}`;
          console.error(err);
          throw new Error(err);
      }

      return response;
    }

    return await request();
  }

  // -------------
  //  Servers API
  // -------------

  // [POST] /api/client/servers/<UUID>/command
  async sendCommand(command: string) {
    try {
      const response = await this.makeRequest("POST", "command", { command: command });
      return response.ok;
    }
    catch (error) {
      this.logger.error(`Failed to send command: ${error}`);
      return false
    }
  }

  // [GET] api/client/servers/<UUID>/details
  async getWebsocketDetails() {
    const response = await this.makeRequest("GET", "websocket");
    return await response.json();
  }

  // [PATCH] /api/client/servers/<UUID>/details
  async setServerName(name: string) {
    return await this.makeRequest("PATCH", "details", { name: name });
  }

  // [GET] /api/client/servers/<UUID>
  async getServerDetails() {
    return await this.makeRequest("GET", "");
  }

  // [GET] /api/client/servers/<UUID>/resources
  async getResources() {
    return await this.makeRequest("GET", "resources");
  }

  // [POST] /api/client/servers/<UUID>/power
  async powerRequest(action: PowerRequest) {
    return await this.makeRequest("POST", "power", { signal: action });
  }

  // -------------
  //  Startup API
  // -------------

  // [GET] /api/client/servers/<UUID>/startup
  async getStartup() {
    const response = await this.makeRequest("GET", "startup");
    const startupDetails: StartupDetails = await response.json();

    return startupDetails;
  }

  // [PUT] /api/client/servers/<UUID>/startup
  // "Pass the variables with their new value to update them. Response will contain the new updated startup."
  async updateStartup(startup: UpdateStartup) {
    return await this.makeRequest("PUT", "startup", startup);
  }

  // ----------------
  //  Filesystem API
  // ----------------

  // [GET] /api/client/servers/<UUID>/files/directory
  // TODO: Handle pagination
  async getDirectoryContents(path: string): Promise<DirectoryContentsResponse> {
    const response = await this.makeRequest("GET", "files/directory", { path: path });
    return await response.json();
  }

  // [POST] /api/client/servers/<UUID>/files/directory
  async createDirectory(path: string): Promise<Response> {
    return await this.makeRequest("POST", "files/directory", { path: path });
  }

  // [GET] /api/client/servers/<UUID>/files/read
  async readFile(path: string): Promise<FileReadResponse> {
    const response = await this.makeRequest("GET", "files/read", { path: path });
    const responseData = await response.json();

    return responseData.content;
  }

  // [POST] /api/client/servers/<UUID>/files/write
  // "Overwrites the file if it already exists."
  async writeFile(path: string, content: string): Promise<Response> {
    const data: FileWriteRequest = { path: path, content: content };
    return await this.makeRequest("POST", "files/write", data);
  }

  // [POST] /api/client/servers/<UUID>/files/copy
  // "New copy will be written to the same directory, with a name such as `test.txt` -> `test.txt copy-1643810941850`"
  async copyFile(path: string): Promise<Response> {
    const data: CopyFileRequest = { path: path };
    return await this.makeRequest("POST", "files/copy", data);
  }

  // (Wrapper) [DELETE] /api/client/servers/<UUID>/files/delete
  async deleteFiles(paths: string[]): Promise<Response> {
    return await this.makeRequest("POST", "files/delete", { paths: paths });
  }

  // [GET] /api/client/servers/<UUID>/files/download
  // "Retrieves a download URL to a file"
  async downloadFile(path: string): Promise<DownloadFileResponse> {
    const response = await this.makeRequest("GET", "files/download", { path: path });
    const data: DownloadFileResponse = await response.json();

    return data;
  }

  // [GET] /api/client/servers/<UUID>/files/rename
  async renameFile(path: string, to: string): Promise<Response> {
    const data: RenameFileRequest = { path: path, to: to };
    return await this.makeRequest("PUT", "files/rename", data);
  }

  // [POST] /api/client/servers/<UUID>/files/compress
  async compressFiles(paths: string[], to: string): Promise<Response> {
    const data: CompressFilesRequest = { paths: paths, to: to };
    return await this.makeRequest("POST", "files/compress", data);
  }

  // [POST] /api/client/servers/<UUID>/files/decompress
  async decompressFile(path: string): Promise<Response> {
    return await this.makeRequest("POST", "files/decompress", { path: path });
  }


  // -------------
  //  FastDL API
  // -------------

  // [POST] /api/client/servers/<UUID>/fastdl
  async syncFastDL(): Promise<Response> {
    return await this.makeRequest("POST", "fastdl");
  }


  // -----------------
  //  Allocations API
  // -----------------

  // [GET] /api/client/servers/<UUID>/allocations
  async getAllocations(): Promise<GetAllocationsResponse> {
    const response = await this.makeRequest("GET", "allocations");
    const data: GetAllocationsResponse = await response.json()

    return data;
  }

  // [PUT] /api/client/servers/<UUID>/allocations/<ID>
  async updateAllocation(id: string): Promise<Response> {
    return await this.makeRequest("PUT", `allocations/${id}`);
  }


  // -----------------
  //  Audit Log API
  // -----------------

  // [GET] /api/client/servers/<UUID>/audit-logs
  async getAuditLogs(): Promise<GetAuditLogsResponse> {
    const response = await this.makeRequest("GET", "audit-logs");
    const data: GetAuditLogsResponse = await response.json();

    return data;
  }


  // [GET] /api/client/servers/<UUID>/backups
  async getBackups(): Promise<GetBackupsResponse> {
    const response = await this.makeRequest("GET", "backups");
    const data: GetBackupsResponse = await response.json();

    return data;
  }

  // TODO: Does this have a response?
  // [POST] /api/client/servers/<UUID>/backups
  async createBackup(name: string): Promise<Response> {
    return await this.makeRequest("POST", "backups", { name: name });
  }

  // [POST] /api/client/servers/<UUID>/backups/<ID>/locked
  async lockBackup(id: string): Promise<Response> {
    return await this.makeRequest("POST", `backups/${id}/locked`);
  }

  // TODO: Erm should we even offer this
  // [POST] /api/client/servers/<UUID>/backups/<ID>/deploy
  async deployBackup(id: string): Promise<Response> {
    return await this.makeRequest("POST", `backups/${id}/deploy`);
  }

  // [GET] /api/client/servers/<UUID>/backups/ID>/download
  async downloadBackup(id: string): Promise<DownloadFileResponse> {
    const response = await this.makeRequest("GET", `backups/${id}/download`);
    const data: DownloadFileResponse = await response.json();

    return data;
  }

  // [DELETE] /api/client/servers/<UUID>/backups/<ID>
  async deleteBackup(id: string): Promise<Response> {
    return await this.makeRequest("DELETE", `backups/${id}`);
  }


  // -----------------
  //  Database API
  // -----------------

  // [GET] /api/client/servers/<UUID>/databases
  async getDatabases(): Promise<GetDatabasesResponse> {
    const response = await this.makeRequest("GET", "databases", { include: "hosts" });
    const data: GetDatabasesResponse = await response.json();

    return data;
  }

  // TODO: verify response
  // [DELETE] /api/client/servers/<UUID>/databases/<ID>
  async deleteDatabase(id: string): Promise<Response> {
    return await this.makeRequest("DELETE", `databases/${id}`);
  }

  // TODO: Verify response
  // [POST] /api/client/servers/<UUID>/databases/<ID>/rotate-password
  async rotateDatabasePassword(id: string): Promise<Response> {
    return await this.makeRequest("POST", `databases/${id}`);
  }


  // ----------
  //  Mods API
  // ----------

  // [GET] /api/client/servers/<UUID>/mods
  async getMods(search: string | null = null): Promise<GetModsResponse> {
    const searchStruct = search ? { search: search } : null;
    const response = await this.makeRequest("GET", "mods", searchStruct);
    const data: GetModsResponse = await response.json();

    return data;
  }

  // [POST] /api/client/servers/<UUID>/mods/<ID>
  async installMod(id: string): Promise<Response> {
    return await this.makeRequest("POST", `mods/${id}`);
  }


  // ---------------
  //  Schedules API
  // ---------------

  // [GET] /api/client/servers/<UUID>/schedules
  async getSchedules(): Promise<GetSchedulesResponse> {
    const response = await this.makeRequest("GET", "schedules", { include: "tasks" });
    const data: GetSchedulesResponse = await response.json();

    return data
  }

  // [GET] /api/client/servers/<UUID>/schedules/<ID>
  async getScheduleDetails(id: string): Promise<Schedule> {
    const response = await this.makeRequest("GET", `schedules/${id}`, { include: "tasks" });
    const data: Schedule = await response.json();

    return data;
  }

  // [POST] /api/client/servers/<UUID>/schedules
  async createSchedule(name: string, minute: string, hour: string, dow: string, dom: string, active: boolean): Promise<Schedule> {
    const data: CreateScheduleRequest = {
      name: name,
      cron_minute: minute,
      cron_hour: hour,
      cron_day_of_week: dow,
      cron_day_of_month: dom,
      is_active: active
    }

    const response = await this.makeRequest("POST", "schedules", data);
    const responseData: Schedule = await response.json();

    return responseData;
  }

  // [PATCH] /api/client/servers/<UUID>/schedules/<ID>
  async updateSchedule(id: string, name: string, minute: string, hour: string, dow: string, dom: string, active: boolean): Promise<Schedule> {
    const data: CreateScheduleRequest = {
      name: name,
      cron_minute: minute,
      cron_hour: hour,
      cron_day_of_week: dow,
      cron_day_of_month: dom,
      is_active: active
    }

    const response = await this.makeRequest("PATCH", `schedules/${id}`, data);
    const responseData: Schedule = await response.json();

    return responseData;
  }

  // [POST] /api/client/servers/<UUID>/schedules/<ID>/trigger
  async triggerSchedule(id: string): Promise<Response> {
    return await this.makeRequest("POST", `schedules/${id}`);
  }

  // [DELETE] /api/client/servers/<UUID>/schedules/<ID>
  async deleteSchedule(id: string): Promise<Response> {
    return await this.makeRequest("DELETE", `schedules/${id}`);
  }

  // [POST] /api/client/servers/<UUID>/schedules/<SCHEDULE_ID>/tasks
  // "Payload is not required for backup action!"
  async createScheduleTask(id: string, action: ScheduleTaskAction, timeOffset: number, payload: string | null): Promise<ScheduleTask> {
    const data: CreateScheduleTaskRequest = {
      action: action,
      time_offset: timeOffset,
      payload: payload
    }

    const response = await this.makeRequest("POST", `schedules/${id}/tasks`, data);
    const responseData: ScheduleTask = await response.json();

    return responseData;
  }

  // [PATCH] /api/client/servers/<UUID>/schedules/<SCHEDULE_ID>/task/<TASK_ID>
  // "Payload is not required for backup action!"
  async updateScheduleTask(scheduleID: string, taskID: string, action: ScheduleTaskAction, timeOffset: number, payload: string | null): Promise<ScheduleTask> {
    const data: CreateScheduleTaskRequest = {
      action: action,
      time_offset: timeOffset,
      payload: payload
    }

    const response = await this.makeRequest("PATCH", `schedules/${scheduleID}/tasks/${taskID}`, data);
    const responseData: ScheduleTask = await response.json();

    return responseData;
  }

  // [DELETE] /api/client/servers/<UUID>/schedules/<SCHEDULE_ID>/task/<TASK_ID>
  async deleteScheduleTask(scheduleID: string, taskID: string): Promise<Response> {
    return await this.makeRequest("DELETE", `schedules/${scheduleID}/tasks/${taskID}`);
  }


  // ---------------
  //  Subusers API
  // ---------------
  
  // [GET] /api/client/servers/<UUID>/subusers
  async getSubusers(): Promise<GetSubusersResponse> {
    const response = await this.makeRequest("GET", "subusers", { include: "user" });
    const data: GetSubusersResponse = await response.json();

    return data;
  }

  // [GET] /api/client/servers/<UUID>/subusers/<SUB_ID>
  async getSubuserDetails(id: string): Promise<Subuser> {
    const response = await this.makeRequest("GET", `subusers/${id}`, { include: "user" });
    const data: Subuser = await response.json();

    return data;
  }

  // [GET] /api/client/servers/<UUID>/subusers/permissions
  async getAllSubuserPermissions(): Promise<GetAllSubuserPermissionsResponse> {
    const response = await this.makeRequest("GET", "subusers/permissions");
    const data: GetAllSubuserPermissionsResponse = await response.json();

    return data;
  }

  // [POST] /api/client/servers/<UUID>/subusers
  async createSubuser(email: string, permissions: Permission[]): Promise<Subuser> {
    const data = {
      email: email,
      permissions: permissions
    }

    const response = await this.makeRequest("POST", "subusers", data);
    const responseData: Subuser = await response.json();

    return responseData;
  }

  // [PATCH] /api/client/servers/<UUID>/subusers/<SUB_ID>
  async updateSubuser(id: string, email: string, permissions: Permission[]): Promise<Subuser> {
    const data = {
      email: email,
      permissions: permissions
    }

    const response = await this.makeRequest("PATCH", `subusers/${id}`, data);
    const responseData: Subuser = await response.json();

    return responseData;
  }

  // [DELETE] /api/client/servers/<UUID>/subusers/<SUB_ID>
  async deleteSubuser(id: string): Promise<Response> {
    return await this.makeRequest("DELETE", `subusers/${id}`);
  }
}

