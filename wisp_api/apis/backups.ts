import { WispAPICore } from "./index";
import type { PaginationData } from "./index";
import type { DownloadFileResponse } from "./filesystem";

/**
 * A Backup Object
 * @example
 * ```json
 * {
 *     "object": "backup",
 *     "attributes": {
 *         "uuid": "26adeafc-74af-43fd-93a5-9afa0486b21b",
 *         "uuid_short": "26adeafc",
 *         "name": "test-1",
 *         "sha256_hash": "56d2965e9167c785647878a391dfe24460c3aa5e1111b385708094bd8837b487",
 *         "bytes": 3266448936,
 *         "locked": false,
 *         "creating": false,
 *         "created_at": "2023-11-28T08:37:39.000000Z"
 *     }
 * }
 * ```
 *
 * @internal
 */
export interface Backup {
    object: "backup";
    attributes: {
        uuid: string;
        uuid_short: string;
        name: string;
        /** The hash of the Backup. May be null if the Backup is still being created. */
        sha256_hash: string | null;
        bytes: number;
        locked: boolean;
        creating: boolean;
        created_at: string;
    }
}

/**
 * Response object used in the GetBackups call
 *
 * @remarks
 * Used in {@link BackupsAPI.List}
 *
 * @internal
 */
export interface GetBackupsResponse {
    object: "list";
    data: Backup[];
    meta: {
        pagination: PaginationData;
    }
}

export type BackupErrorCode = "server.backups.creation_would_exceed_limit";
export interface BackupError {
    code: BackupErrorCode;
    data: any;
}
export interface CreateBackupFailure {
    errors: BackupError[] | undefined
}
export type CreateBackupResponse = Backup | CreateBackupFailure;

/**
 * Handles basic server backup tasks, such as creating, restoring, and deleting backups
 */
export class BackupsAPI {
    constructor(private core: WispAPICore) {}

    /**
     * Lists all current backups for the server
     *
     * @public
     */
    async List(): Promise<GetBackupsResponse> {
        const response = await this.core.makeRequest("GET", "backups");
        const data: GetBackupsResponse = await response.json();

        return data;
    }

    /**
     * Creates a new backup for the server
     *
     * @remarks
     * ⚠️  This can fail to create a Backup even if the function completes successfully
     * For example, if the backup would exceed the size limit (and the limit is not 0), the system wouldn't know it failed until it hit the limit.
     *
     * ⚠️  "It is recomended to stop your server before starting a backup. Backups created while the server is on can contain corupted data."
     *
     * Multiple Backups can exist with the same name.
     *
     * @param name The name of the Backup
     *
     * @throws {@link BackupErrorCode} 
     * If the server returns an error code, it will be thrown verbatim here
     *
     * @public
     */
    async Create(name: string): Promise<CreateBackupResponse> {
        const response = await this.core.makeRequest("POST", "backups", { name: name });
        const data: CreateBackupResponse = await response.json()

        if ("errors" in data && data.errors) {
            throw new Error(data.errors[0].code);
        }

        return data
    }

    /**
     * Toggles the "Locked" status of the Backup
     *
     * @param id The ID of the Backup
     *
     * @public
     */
    async ToggleLock(id: string): Promise<Backup> {
        const response = await this.core.makeRequest("POST", `backups/${id}/locked`);
        const data: Backup = await response.json();

        return data;
    }

    /**
     * Deploys the Backup to the Server
     *
     * @remarks
     * **⚠️  This can be dangerous!**
     * The Backup will overwrite the entire Server, erasing any new data since the Backup's creation
     *
     * @param id The ID of the Backup
     *
     * @public
     */
    async Deploy(id: string): Promise<Response> {
        return await this.core.makeRequest("POST", `backups/${id}/deploy`);
    }

    /**
     * Retrieves a URL from which the Backup can be downloaded
     *
     * @param id The ID of the Backup
     * @returns The download URL
     *
     * @public
     */
    async GetDownloadURL(id: string): Promise<string> {
        const response = await this.core.makeRequest("GET", `backups/${id}/download`);
        const data: DownloadFileResponse = await response.json();

        return data.url;
    }

    /**
     * Deletes the Backup
     *
     * @param id The ID of the Backup
     *
     * @public
     */
    async Delete(id: string): Promise<void> {
        await this.core.makeRequest("DELETE", `backups/${id}`);
    }
}
