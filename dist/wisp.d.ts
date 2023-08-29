import { WispAPI } from "./wisp_api";
import { WispSocket } from "./wisp_socket";
export interface WispInterface {
    socket: WispSocket;
    api: WispAPI;
    logger: any;
}
export declare class WispInterface {
    constructor(domain: string, uuid: string, token: string);
    connect(ghPAT: string): Promise<void>;
}