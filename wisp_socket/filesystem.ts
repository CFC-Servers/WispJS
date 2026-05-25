import type { WispSocket } from "./index.js"
import type { ListOptions, ListResult, FilesearchResults, FsOkResult, ConflictsResult } from "./pool.js"

/**
 * Filesystem operations exposed over the Websocket.
 *
 * `list` runs through the correlated `fs:request` protocol (see
 * {@link WispSocket.request}); `search` uses the dedicated `filesearch start`/
 * `filesearch results` events.
 *
 * @remarks
 * The new backend also serves plain file read/write/delete/rename over
 * `fs:request`, but those op shapes haven't been captured yet. Until typed
 * wrappers exist here, they're reachable via {@link WispSocket.request}, and
 * the existing HTTP `Filesystem` API covers them too.
 *
 * @public
 */
export class FilesystemSocket {
    constructor(private socket: WispSocket) {}

    /**
     * Lists the contents of a directory (paginated).
     *
     * @param dir The directory to list
     * @param opts Search, pagination, and sort options
     * @param timeout In milliseconds, how long to wait before timing out
     *
     * @public
     */
    async list(dir: string, opts: ListOptions = {}, timeout: number = 10000): Promise<ListResult> {
        const params = {
            directory: dir,
            search: opts.search ?? "",
            page: opts.page ?? 1,
            per_page: opts.perPage ?? 100,
            sort: opts.sort ?? "name",
            sort_dir: opts.sortDir ?? "asc",
        }
        return await this.socket.request<ListResult>("list", params, timeout)
    }

    /**
     * Creates a directory named `name` under `root`.
     *
     * @param root The parent directory the new directory is created in
     * @param name The name of the new directory
     * @param timeout In milliseconds, how long to wait before timing out
     *
     * @public
     */
    async createDirectory(root: string, name: string, timeout: number = 10000): Promise<FsOkResult> {
        return await this.socket.request<FsOkResult>("mkdir", { root, name }, timeout)
    }

    /**
     * Checks which of the given paths already exist / would conflict.
     *
     * @param paths The paths to check
     * @param timeout In milliseconds, how long to wait before timing out
     *
     * @public
     */
    async conflicts(paths: string[], timeout: number = 10000): Promise<ConflictsResult> {
        return await this.socket.request<ConflictsResult>("conflicts", { paths }, timeout)
    }

    /**
     * Searches file contents under a root directory for the given query.
     *
     * @param query The query string to search for
     * @param root The directory to search under
     * @param timeout How long to wait (in ms) for results before timing out
     *
     * @public
     */
    async search(query: string, root: string = "/garrysmod", timeout: number = 10000): Promise<FilesearchResults> {
        return await this.socket.runWorker((worker) => {
            const socket = worker.socket
            const logger = worker.logger
            logger.log("Running filesearch:", query, root)

            return new Promise<FilesearchResults>((resolve, reject) => {
                const timeoutObj = setTimeout(() => {
                    socket.off("filesearch results")
                    logger.error("Rejected filesearch: 'Timeout'")
                    reject(new Error("Timeout"))
                }, timeout)

                socket.once("filesearch results", (raw: string) => {
                    clearTimeout(timeoutObj)
                    try {
                        resolve(JSON.parse(raw) as FilesearchResults)
                    } catch (e) {
                        logger.error("Failed to parse filesearch results", raw)
                        reject(e)
                    }
                })

                socket.emit("filesearch start", JSON.stringify({ query, root }))
            })
        })
    }
}
