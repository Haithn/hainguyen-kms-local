import axios, { type AxiosResponse } from "axios";
import https from "https";

import logger from "utils/helpers/logger";
import timeouts from "utils/helpers/timeouts";

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  PATCH = "PATCH",
  DELETE = "DELETE",
  HEAD = "HEAD",
  OPTIONS = "OPTIONS",
}

export enum Domain {
  EVOLVE = "evolve",
  PS = "ps",
  ADMIN = "admin",
}

// ─────────────────────────────────────────────
// Disposable contract
// ─────────────────────────────────────────────

export type Disposable = {
  dispose(): void;
};

/** A zero-argument function that releases resources when called */
export type DisposableFunction = () => void;

// ─────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────

interface Response {
  status: number;
  body: any;
}

/** Auth strategies supported by both RestClient and the legacy AxiosClient */
export type ApiAuth =
  | { type: "bearer"; token: string }
  | { type: "basic"; username: string; password: string }
  | { type: "apiKey"; header: string; value: string };

// ─────────────────────────────────────────────
// RestClient
// ─────────────────────────────────────────────

export class RestClient implements Disposable {
  private baseUrl: string;
  private endpoint: string = "";
  private headers: Record<string, string> = {};
  private queries: Record<string, string> = {};
  private body?: string | Record<string, any>;
  private response?: Response;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.defaultHeaders();
  }

  // ── HTTP URI Management ────────────────────────────────────────────────────

  /**
   * Set a relative endpoint path — joined with the base URL on send().
   * @param endpoint - e.g. '/users/123'
   */
  uri(endpoint: string): this {
    this.endpoint = endpoint;
    return this;
  }

  /**
   * Override the full base URL for this request.
   * @param fullUrl - Replaces the URL set in the constructor.
   */
  url(fullUrl: string): this {
    this.baseUrl = fullUrl;
    return this;
  }

  // ── HTTP Header Management ─────────────────────────────────────────────────

  /**
   * Add or overwrite a header.
   * @param key   - Header name, e.g. 'Authorization'
   * @param value - Header value
   */
  addHeader(key: string, value: string): this {
    this.headers[key] = value;
    return this;
  }

  /**
   * Remove a header by key. No-op if the key does not exist.
   * @param key - Header name to remove
   */
  removeHeader(key: string): this {
    delete this.headers[key];
    return this;
  }

  /**
   * Reset headers to the built-in defaults:
   * Content-Type: application/json, Accept: application/json.
   */
  defaultHeaders(): this {
    this.headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    return this;
  }

  /** Remove all headers, including the defaults. */
  clearHeaders(): this {
    this.headers = {};
    return this;
  }

  // ── HTTP Query Management ──────────────────────────────────────────────────

  /**
   * Append a query string parameter.
   * @param key   - Query parameter name
   * @param value - Query parameter value
   */
  addQuery(key: string, value: string): this {
    this.queries[key] = value;
    return this;
  }

  // ── HTTP Body Management ───────────────────────────────────────────────────

  /**
   * Set the request body. Replaces any previously set body.
   * @param body - Any serialisable value
   */
  addBody(body: string | Record<string, any>): this {
    this.body = body;
    return this;
  }

  // ── HTTP Request ───────────────────────────────────────────────────────────

  /**
   * Execute an HTTP request and return the raw Axios response.
   * @param url             - Full URL to request
   * @param httpMethod      - HTTP method
   * @param headers         - Additional headers merged over instance headers
   * @param queries         - Query string parameters
   * @param body            - Request body
   * @param failOnStatusCode - When true, throws on non-2xx responses
   * @param timeout         - Request timeout in milliseconds
   */
  async request(
    url: string,
    httpMethod: HttpMethod,
    headers?: Record<string, string>,
    queries?: Record<string, string>,
    body?: string | Record<string, any>,
    failOnStatusCode = false,
    timeout = timeouts.THIRTY_SECONDS,
  ): Promise<AxiosResponse> {
    return axios.request({
      url,
      method: httpMethod,
      headers: { ...this.headers, ...headers },
      params: queries && Object.keys(queries).length > 0 ? queries : undefined,
      data: body,
      timeout,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      validateStatus: failOnStatusCode
        ? (status) => status >= 200 && status < 300
        : () => true,
    });
  }

  /**
   * Execute the configured request and return a simplified Response.
   * Never throws on non-2xx — the caller is responsible for asserting status.
   */
  async send(
    httpMethod: HttpMethod,
    isStrictMode = true,
    timeout = timeouts.THIRTY_SECONDS,
  ): Promise<Response> {
    const url = this.baseUrl + this.endpoint;
    this.endpoint = "";

    const { status, data } = await this.request(
      url,
      httpMethod,
      this.headers,
      this.queries,
      this.body,
      isStrictMode,
      timeout,
    );

    this.response = { status, body: data };
    return this.response;
  }

  /**
   * Clear all state. Implements the Disposable contract.
   */
  dispose(): void {
    try {
      this.baseUrl = "";
      this.headers = {};
      this.queries = {};
      delete this.body;
      delete this.response;
    } catch (err) {
      logger.error("Error disposing RestClient", { error: err });
    }
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
