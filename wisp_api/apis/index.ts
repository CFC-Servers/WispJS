export type RequestTypes = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type PaginationData = {
  total: number;
  count: number;
  perPage: number;
  currentPage: number;
  totalPages: number;
}

export interface WispAPICore {
  domain: string;
  uuid: string;
  token: string;
  logger: any;
}

/**
 * The Core of the API, handling low-level operations such as making requests and setting the server UUID
 *
 * @public
 */
export class WispAPICore {
  constructor(domain: string, uuid: string, token: string, logger: any) {
    this.domain = domain;
    this.uuid = uuid;
    this.token = token;
    this.logger = logger;
  }

  /**
   * Sets the Server UUID
   *
   * @remarks
   * ℹ️  This can be updated at any time, making all future API calls reference the new Server UUID
   *
   * @public
   */
  setUUID(uuid: string) {
    this.uuid = uuid;
  }

  /**
   * Generates a URL for the given path
   *
   * @param path The API path
   *
   * @internal
   */
  makeURL(path: string) {
    return `https://${this.domain}/api/client/servers/${this.uuid}/${path}`;
  }

  // TODO: Handle standard field-level error messages:
  // {"errors":[{"code":"required","detail":"The path field is required","source":{"field":"path"}}]}
  /**
   * Makes a request with the headers and request data set automatically.
   *
   * @remarks
   * The data field is formatted appropriately for whichever request type is given.
   *
   * @param method A standared request method.
   * @param path The API path to send the request to.
   * @param data The data to include with the request.
   *
   * @internal
   */
  async makeRequest(method: RequestTypes, path: string, data?: any) {
    let url = this.makeURL(path);
    const headers = new Headers({
      "Content-Type": "application/json",
      "Accept": "application/vnd.wisp.v1+json",
      "Authorization": `Bearer ${this.token}`,
      "User-Agent": "WispJS (https://github.com/CFC-Servers/wispjs, 1.0.0)"
    });

    const request = async () => {
      let response: Response;

      console.log(`${method} -> ${url}`);

      switch(method) {
        case "GET":
          if (data !== null) {
            const params = new URLSearchParams(data);
            const uri = new URL(url);

            uri.search = params.toString();
            url = uri.toString();
            console.log(`Updated GET URL: ${url}`);
          }

          response = await fetch(url, { method: "GET", headers: headers });
          break;

        case "POST":
          data = JSON.stringify(data);
          response = await fetch(url, { method: "POST", headers: headers, body: data });
          break;

        case "PUT":
          data = data ? JSON.stringify(data) : "";
          response = await fetch(url, { method: "PUT", headers: headers, body: data });
          break;

        case "PATCH":
          data = JSON.stringify(data);
          response = await fetch(url, { method: "PATCH", headers: headers, body: data });
          break;

        case "DELETE":
          response = await fetch(url, { method: "DELETE", headers: headers });
          break;

        default:
          throw new Error(`Invalid method: ${method}`);
      }

      if (!response.ok) {
        const status = response.status;
        const statusText = response.statusText;
        this.logger.error(`Request failed: ${method} -> ${url}: ${status} - ${statusText}`);

        const text = await response.text();
        this.logger.error(text);

        throw new Error(`Request failed! Status: ${status} - ${statusText}`);
      }

      return response;
    }

    return await request();
  }
}
