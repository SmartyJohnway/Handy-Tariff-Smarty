// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\client.ts

// Corresponds to federal_register/client.rb

export class ResponseError extends Error {
  constructor(message: string, public statusCode: number, public body: any) {
    super(message);
    this.name = "ResponseError";
  }
}

export class BadRequest extends ResponseError {
  constructor(body: any) { super("Bad Request", 400, body); }
}
export class RecordNotFound extends ResponseError {
  constructor(body: any) { super("Record Not Found", 404, body); }
}
export class ServerError extends ResponseError {
  constructor(body: any) { super("Server Error", 500, body); }
}
export class ServiceUnavailable extends ResponseError {
  constructor(body: any) { super("Service Unavailable", 503, body); }
}
export class GatewayTimeout extends ResponseError {
  constructor(body: any) { super("Gateway Timeout", 504, body); }
}

import { buildParams } from "./utilities";
import { DocumentSearchDetails } from "./document_search_details";
import { PublicInspectionDocumentSearchDetails } from "./public_inspection_document_search_details";

export class Client {
  private static _BASE_URI = "https://www.federalregister.gov/api/v1";

  public static get BASE_URI(): string {
    return this._BASE_URI;
  }

  public static async get(urlPath: string, queryParams?: Record<string, any>): Promise<any> {
    const url = new URL(Client.BASE_URI + urlPath);
    if (queryParams) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        buildParams(params, key, value);
      });
      url.search = params.toString();
    }

    const res = await fetch(url.toString());
    const ctype = (res.headers.get('content-type') || '').toLowerCase();

    // Prefer JSON; fall back to text to avoid Unexpected token '<' on HTML error pages
    const readJsonSafe = async (): Promise<any> => {
      try { return await res.json(); } catch { return undefined; }
    };
    const readTextSafe = async (): Promise<string | undefined> => {
      try { return await res.text(); } catch { return undefined; }
    };

    let body: any = undefined;
    if (ctype.includes('application/json')) {
      body = await readJsonSafe();
    } else {
      // Not JSON (likely HTML error page)
      body = await readTextSafe();
    }

    switch (res.status) {
      case 200:
        if (body === undefined) throw new ResponseError('Empty response', 502, null);
        return body;
      case 400:
        throw new BadRequest(body);
      case 404:
        throw new RecordNotFound(body);
      case 500:
        throw new ServerError(body);
      case 503:
        throw new ServiceUnavailable(body);
      case 504:
        throw new GatewayTimeout(body);
      default:
        throw new ResponseError(`HTTP Error: ${res.status}`, res.status, body);
    }
  }

  public static overrideBaseUri(uri: string): void {
    Client._BASE_URI = uri;
  }

  public static async getDocumentSearchDetails(args: Record<string, any>): Promise<DocumentSearchDetails> {
    const response = await Client.get('/documents/search-details.json', args);
    return new DocumentSearchDetails(response);
  }

  public static async getPublicInspectionDocumentSearchDetails(args: Record<string, any>): Promise<PublicInspectionDocumentSearchDetails> {
    const response = await Client.get('/public-inspection-documents/search-details.json', args);
    return new PublicInspectionDocumentSearchDetails(response);
  }
}
