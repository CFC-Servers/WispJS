type RequestTypes = "GET" | "POST" | "PUT" | "DELETE";
export interface WispAPI {
    domain: string;
    uuid: string;
    token: string;
    logger: any;
}
export type UpdateStartup = {
    environment: {
        [key: string]: any;
    };
};
export type PowerRequest = "start" | "stop" | "restart" | "kill";
export declare class WispAPI {
    constructor(domain: string, uuid: string, token: string, logger: any);
    makeURL(path: string): string;
    makeRequest(method: RequestTypes, path: string, data?: any): Promise<Response>;
    sendCommand(command: string): Promise<boolean>;
    updateStartup(startup: UpdateStartup): Promise<boolean>;
    getWebsocketDetails(): Promise<any>;
    getServerDetails(): Promise<Response>;
    getResources(): Promise<Response>;
    powerRequest(action: PowerRequest): Promise<Response>;
    getDirectoryContents(path: string): Promise<any>;
    createDirectory(path: string): Promise<Response>;
    readFile(path: string): Promise<any>;
    writeFile(path: string, content: string): Promise<Response>;
    deleteFiles(paths: string[]): Promise<Response>;
    renameFile(path: string, newPath: string): Promise<Response>;
    syncFastDL(): Promise<void>;
}
export {};
