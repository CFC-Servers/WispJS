import type { WispSocket } from "./index.js"
import type { GitPullResult, GitCloneResult, GitStatusResult } from "./pool.js"

/**
 * Git operations exposed over the Websocket.
 *
 * These run through the backend's correlated `fs:request` protocol (see
 * {@link WispSocket.request}).
 *
 * Authentication: SSH remotes are authenticated server-side via a deploy key
 * configured in the panel. HTTPS remotes can additionally use the GitHub token
 * (`ghToken`) passed to {@link WispInterface} — {@link pull} and {@link clone}
 * automatically retry with it when the remote reports `auth_required`.
 *
 * @public
 */
export class GitSocket {
    constructor(private socket: WispSocket) {}

    /**
     * Runs a git op, retrying once with the configured GitHub token as
     * `authkey` if the remote reports `auth_required` (an HTTPS remote with no
     * credentials). SSH auth is handled server-side, so we only retry this
     * specific case.
     *
     * @internal
     */
    private async withAuthRetry<T>(op: string, params: Record<string, any>, timeout: number): Promise<T> {
        try {
            return await this.socket.request<T>(op, params, timeout)
        } catch (e: any) {
            if (e?.code === "auth_required" && this.socket.ghToken) {
                return await this.socket.request<T>(op, { ...params, authkey: this.socket.ghToken }, timeout)
            }
            throw e
        }
    }

    /**
     * Gets the git status of a directory (branch, commit, ahead/behind, dirty).
     *
     * @param dir The full directory path of the repository
     * @param timeout In milliseconds, how long to wait before timing out
     *
     * @public
     */
    async status(dir: string, timeout: number = 10000): Promise<GitStatusResult> {
        return await this.socket.request<GitStatusResult>("git-status", { directory: dir }, timeout)
    }

    /**
     * Performs a git pull on the given repository directory.
     *
     * @param dir The full directory path to pull
     * @param timeout In milliseconds, how long to wait before timing out
     *
     * @public
     */
    async pull(dir: string, timeout: number = 10000): Promise<GitPullResult> {
        return await this.withAuthRetry<GitPullResult>("git-pull", { directory: dir }, timeout)
    }

    /**
     * Clones a repository into the given parent directory.
     *
     * @param url The repository URL to clone
     * @param directory The parent directory to clone into
     * @param branch The branch to clone (optional)
     * @param timeout In milliseconds, how long to wait before timing out
     *
     * @public
     */
    async clone(url: string, directory: string, branch?: string, timeout: number = 20000): Promise<GitCloneResult> {
        const params: Record<string, any> = { directory, url }
        if (branch) { params.branch = branch }
        return await this.withAuthRetry<GitCloneResult>("git-clone", params, timeout)
    }
}
