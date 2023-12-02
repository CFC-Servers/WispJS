import { WispAPI } from "./wisp_api.js";
import { WispSocket } from "./wisp_socket.js";
export interface WispInterface {
    socket: WispSocket;
    api: WispAPI;
    logger: any;
}
export declare class WispInterface {
    constructor(domain: string, uuid: string, token: string);
    connect(ghPAT: string): Promise<void>;
    disconnect(): Promise<void>;
}
