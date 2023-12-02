import { Manager } from "socket.io-client";
class PoolWorker {
    constructor(pool) {
        this.pool = pool;
        this.ready = false;
        this.idx = pool.workers.length;
        this.token = pool.token;
        this.socket = pool.manager.socket("/");
        const logPrefix = `[Worker #${this.idx}]`;
        this.logger = {
            log: (...args) => console.log(logPrefix, args),
            error: (...args) => console.error(logPrefix, args),
        };
    }
    available() {
        return this.ready && this.socket.connected;
    }
    connect() {
        const socket = this.socket;
        const logger = this.logger;
        return new Promise((resolve, reject) => {
            let connectedOnce = false;
            socket.on("connect", () => {
                logger.log("Connected to WebSocket");
                socket.emit("auth", this.token);
            });
            socket.on("error", (reason) => {
                logger.error(`WebSocket error: ${reason}`);
            });
            socket.on("connect_error", (error) => {
                logger.error(`WebSocket Connect error: ${error.toString()}`);
                if (!connectedOnce) {
                    connectedOnce = true;
                    reject();
                }
            });
            socket.on("disconnect", (reason) => {
                logger.error(`Disconnected from WebSocket: ${reason}`);
            });
            socket.on("auth_success", () => {
                logger.log("Auth success");
                if (!connectedOnce) {
                    connectedOnce = true;
                    this.ready = true;
                    resolve();
                }
            });
            setTimeout(() => {
                if (!connectedOnce) {
                    logger.error("Socket didn't connect in time");
                    reject();
                }
            }, 10000);
        });
    }
    disconnect() {
        this.ready = false;
        return new Promise((resolve, reject) => {
            let done = false;
            this.socket.once("disconnect", () => {
                if (!done) {
                    done = true;
                    resolve();
                }
            });
            this.socket.disconnect();
            setTimeout(() => {
                if (!done) {
                    this.logger.error("Socket didn't disconnect in time");
                    done = true;
                    reject();
                }
            }, 5000);
        });
    }
    async run(work) {
        this.ready = false;
        try {
            return await work(this);
        }
        catch (e) {
            this.logger.error(e);
            throw e;
        }
        finally {
            this.ready = true;
            this.pool.processQueue();
        }
    }
}
export class WebsocketPool {
    constructor(url, token) {
        this.maxWorkers = 5;
        this.token = token;
        this.manager = new Manager(url, {
            forceNew: true,
            reconnectionAttempts: 3,
            reconnectionDelayMax: 3000,
            reconnectionDelay: 500,
            timeout: 3000,
            transports: ["websocket"]
        });
        this.workers = [];
        this.queue = [];
    }
    async createWorker() {
        const worker = new PoolWorker(this);
        this.workers.push(worker);
        await worker.connect();
        return worker;
    }
    async disconnect() {
        await Promise.all(this.workers.map((worker) => worker.disconnect()));
    }
    async processQueue() {
        if (this.queue.length > 0) {
            return;
        }
        const work = this.queue.shift();
        if (!work) {
            return;
        }
        if (this.workers.length == 0) {
            await this.createWorker();
        }
        let worker = this.workers.find((worker) => worker.available());
        if (!worker) {
            if (this.workers.length < this.maxWorkers) {
                worker = await this.createWorker();
            }
            else {
                return;
            }
        }
        await worker.run(work);
    }
    async run(work) {
        return new Promise(async (resolve, reject) => {
            this.queue.push(async (worker) => {
                try {
                    resolve(await work(worker));
                }
                catch (e) {
                    reject(e);
                }
            });
            this.processQueue();
        });
    }
}
