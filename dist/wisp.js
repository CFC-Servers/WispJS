import { WispAPI } from "./wisp_api.js";
import { WispSocket } from "./wisp_socket.js";
export class WispInterface {
    constructor(domain, uuid, token) {
        this.logger = {
            info: (msg) => {
                console.log(msg);
            },
            error: (msg) => {
                console.error(msg);
            }
        };
        this.api = new WispAPI(domain, uuid, token, this.logger);
    }
    async connect(ghPAT) {
        const websocketInfo = await this.api.getWebsocketDetails();
        this.logger.info(`Connecting to websocket at ${websocketInfo.url} - ${websocketInfo.token}`);
        console.log("Beginning Websocket Test");
        const firstURL = "https://us-phs-chi23.physgun.com:8080/socket.io/?EIO=4&transport=polling";
        console.log("First URL", firstURL);
        const firstResponse = await fetch("https://us-phs-chi23.physgun.com:8080/socket.io/?EIO=4&transport=polling");
        // 0{"sid":"J4dFbA0GFKS7li09AAMi","upgrades":["websocket"],"pingInterval":25000,"pingTimeout":20000,"maxPayload":1000000}
        const firstResponseText = await firstResponse.text();
        console.log("First response", firstResponseText, firstResponse.status, firstResponse.statusText);
        const body = firstResponseText.substring(1);
        const bodyJSON = JSON.parse(body);
        const sid = bodyJSON.sid;
        const secondResponse = await fetch(`https://us-phs-chi23.physgun.com:8080/socket.io/?EIO=4&transport=polling&sid=${sid}`, {
            method: "POST",
            body: `40/v1/ws/${websocketInfo.url.split("/")[5]}`
        });
        console.log("Second response", await secondResponse.text());
        const thirdResponse = await fetch(`https://us-phs-chi23.physgun.com:8080/socket.io/?EIO=4&transport=polling&sid=${sid}`);
        console.log("Third response", await thirdResponse.text());
        this.socket = new WispSocket(this.logger, websocketInfo.url, websocketInfo.token, ghPAT);
        await this.socket.connect();
    }
}
