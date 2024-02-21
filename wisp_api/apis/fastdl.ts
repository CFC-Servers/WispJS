import { WispAPICore } from "./index";

/**
 * Handles the syncing of the FastDL feature
 *
 * @public
 */
export class FastDLAPI {
  constructor(private core: WispAPICore) {}

  /**
   * Begins a FastDL Sync for the server
   *
   * @remarks
   * ⚠️  If a Sync is already in progress, this function will succeed even though the process will fail.
   *
   * @public
   */
  async Sync(): Promise<void> {
    await this.core.makeRequest("POST", "fastdl");
  }
}
