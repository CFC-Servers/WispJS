import WebSocket from "ws";
import { EventEmitter } from "node:events";

/**
 * Options for the {@link WispWebSocket} adapter
 *
 * @param origin The value to send as the `Origin` header during the upgrade
 *
 * @internal
 */
export interface WsAdapterOptions {
    origin?: string;
}

/**
 * A thin adapter that exposes a Socket.IO-like event API over a plain `ws`
 * WebSocket.
 *
 * The new backend speaks a simple JSON envelope rather than the Socket.IO /
 * Engine.IO framing:
 *
 * ```json
 * { "event": "console output", "args": ["...line..."] }
 * ```
 *
 * `args` is omitted entirely when an event carries no payload
 * (e.g. `{ "event": "auth success" }`).
 *
 * This class translates between that envelope and the `.on/.once/.off/.emit`
 * surface the rest of the codebase already uses, so the calling code barely
 * changes.
 *
 * @remarks
 * We *compose* an EventEmitter instead of extending one on purpose: extending
 * it would mean overriding `emit()`, which EventEmitter also calls internally
 * (e.g. the `newListener` event) — so every `.on()` would try to send a frame
 * to the server. Composition keeps "emit to the wire" and "fire local
 * listeners" cleanly separate.
 *
 * @internal
 */
export class WispWebSocket {
    private url: string;
    private origin?: string;
    private ws?: WebSocket;
    private emitter = new EventEmitter();
    private outgoingListener?: (...args: any[]) => void;

    constructor(url: string, opts: WsAdapterOptions = {}) {
        this.url = url;
        this.origin = opts.origin;
        // The pool registers a handful of listeners per worker; silence the
        // default 10-listener warning.
        this.emitter.setMaxListeners(0);
    }

    /**
     * Opens the underlying WebSocket and wires up frame translation.
     */
    connect(): this {
        const ws = new WebSocket(this.url, this.origin ? { origin: this.origin } : undefined);
        this.ws = ws;

        // Map ws lifecycle onto the Socket.IO-style events the pool listens for
        ws.on("open", () => this.emitter.emit("connect"));
        ws.on("close", (code, reason) => {
            this.emitter.emit("disconnect", reason?.toString() || `code ${code}`);
        });
        ws.on("error", (err: Error) => this.emitter.emit("connect_error", err));

        ws.on("message", (data: WebSocket.RawData, isBinary: boolean) => {
            if (isBinary) return;

            let frame: { event?: string; args?: any[] };
            try {
                frame = JSON.parse(data.toString());
            } catch {
                return; // ignore anything that isn't our JSON envelope
            }

            const event = frame.event;
            if (!event) return;
            const args = frame.args ?? [];

            // EventEmitter throws if "error" is emitted with no listener; guard it.
            if (event === "error" && this.emitter.listenerCount("error") === 0) {
                console.error("[ws] server error frame:", ...args);
                return;
            }

            this.emitter.emit(event, ...args);
        });

        return this;
    }

    /**
     * Sends an event to the server as a `{ event, args }` JSON frame.
     *
     * @remarks
     * Unlike EventEmitter.emit, this does NOT fire local listeners — it writes
     * to the socket. Incoming frames fire local listeners via the internal
     * emitter.
     */
    emit(event: string, ...args: any[]): boolean {
        this.outgoingListener?.(event, ...args);

        const frame = JSON.stringify(args.length ? { event, args } : { event });
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(frame);
        } else {
            console.error(`[ws] dropped outgoing "${event}" — socket not open`);
        }
        return true;
    }

    on(event: string, listener: (...args: any[]) => void): this {
        this.emitter.on(event, listener);
        return this;
    }

    once(event: string, listener: (...args: any[]) => void): this {
        this.emitter.once(event, listener);
        return this;
    }

    /**
     * Removes a specific listener, or — matching Socket.IO's behaviour — all
     * listeners for an event when no listener is given.
     */
    off(event: string, listener?: (...args: any[]) => void): this {
        if (listener) {
            this.emitter.off(event, listener);
        } else {
            this.emitter.removeAllListeners(event);
        }
        return this;
    }

    removeAllListeners(event?: string): this {
        this.emitter.removeAllListeners(event);
        return this;
    }

    /**
     * Registers a callback invoked for every outgoing emit (parity with
     * Socket.IO's `onAnyOutgoing`, used for logging).
     */
    onAnyOutgoing(listener: (...args: any[]) => void): this {
        this.outgoingListener = listener;
        return this;
    }

    disconnect(): this {
        this.ws?.close();
        return this;
    }
}
