type RequestTypes = "GET" | "POST" | "PUT" | "DELETE";
export interface WispAPI {
    domain: string;
    uuid: string;
    token: string;
    logger: any;
}
export type PowerRequest = "start" | "stop" | "restart" | "kill";
export declare class WispAPI {
    constructor(domain: string, uuid: string, token: string, logger: any);
    makeURL(path: string): string;
    makeRequest(method: RequestTypes, path: string, data?: any): Promise<any>;
    sendCommand(command: string): Promise<any>;
    getWebsocketDetails(): Promise<any>;
    getServerDetails(): Promise<any>;
    getResources(): Promise<any>;
    powerRequest(action: PowerRequest): Promise<any>;
    getDirectoryContents(path: string): Promise<any>;
    createDirectory(path: string): Promise<any>;
    readFile(path: string): Promise<any>;
    writeFile(path: string, content: string): Promise<any>;
    deleteFiles(paths: string[]): Promise<any>;
    renameFile(path: string, newPath: string): Promise<any>;
    syncFastDL(): Promise<void>;
}
export {};
