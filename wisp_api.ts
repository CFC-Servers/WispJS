import { WispAPICore } from "./wisp_api/index";
import { AllocationsAPI } from "./wisp_api/allocations";
import { AuditLogsAPI } from "./wisp_api/audit_log";
import { BackupsAPI } from "./wisp_api/backups";
import { DatabasesAPI } from "./wisp_api/databases";
import { FastDLAPI } from "./wisp_api/fastdl";
import { FilesystemAPI } from "./wisp_api/filesystem";
import { ModsAPI } from "./wisp_api/mods";
import { SchedulesAPI } from "./wisp_api/schedules";
import { ServersAPI } from "./wisp_api/servers";
import { StartupAPI } from "./wisp_api/startup";
import { SubusersAPI } from "./wisp_api/subusers";

export class WispAPI {
  private core: WispAPICore;

  public Allocations: AllocationsAPI;
  public AuditLogs: AuditLogsAPI;
  public Backups: BackupsAPI;
  public Databases: DatabasesAPI;
  public FastDL: FastDLAPI;
  public Filesystem: FilesystemAPI;
  public Mods: ModsAPI;
  public Schedules: SchedulesAPI;
  public Servers: ServersAPI;
  public Startup: StartupAPI;
  public Subusers: SubusersAPI;

  constructor(domain: string, uuid: string, token: string, logger: any) {
    this.core = new WispAPICore(domain, uuid, token, logger);

    this.Allocations = new AllocationsAPI(this.core);
    this.AuditLogs = new AuditLogsAPI(this.core);
    this.Backups = new BackupsAPI(this.core);
    this.Databases = new DatabasesAPI(this.core);
    this.FastDL = new FastDLAPI(this.core);
    this.Filesystem = new FilesystemAPI(this.core);
    this.Mods = new ModsAPI(this.core);
    this.Schedules = new SchedulesAPI(this.core);
    this.Servers = new ServersAPI(this.core);
    this.Startup = new StartupAPI(this.core);
    this.Subusers = new SubusersAPI(this.core);
  }
}
