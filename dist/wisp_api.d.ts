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
    makeRequest(method: RequestTypes, path: string, data?: any): Promise<import("axios").AxiosResponse<any, any>>;
    sendCommand(command: string): Promise<boolean>;
    getWebsocketDetails(): Promise<any>;
    getServerDetails(): Promise<import("axios").AxiosResponse<any, any>>;
    getResources(): Promise<import("axios").AxiosResponse<any, any>>;
    powerRequest(action: PowerRequest): Promise<import("axios").AxiosResponse<any, any>>;
    getDirectoryContents(path: string): Promise<any>;
    createDirectory(path: string): Promise<import("axios").AxiosResponse<any, any>>;
    readFile(path: string): Promise<any>;
    writeFile(path: string, content: string): Promise<import("axios").AxiosResponse<any, any>>;
    deleteFiles(paths: string[]): Promise<import("axios").AxiosResponse<any, any>>;
    renameFile(path: string, newPath: string): Promise<import("axios").AxiosResponse<any, any>>;
    syncFastDL(): Promise<void>;
}
export {};
