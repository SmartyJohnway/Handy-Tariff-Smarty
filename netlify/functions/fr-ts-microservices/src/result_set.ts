// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\result_set.ts

// Corresponds to federal_register/result_set.rb

import { Client } from "./client";
import { Base } from "./base";

export class ResultSet<T extends Base> extends Client implements Iterable<T> {
  public count: number;
  public total_pages: number;
  public results: T[];
  public errors?: any;
  public description?: string;

  private resultClass: new (attributes: Record<string, any>, options?: { full?: boolean }) => T;
  private prev_url?: string;
  private next_url?: string;

  constructor(attributes: Record<string, any>, resultClass: new (attributes: Record<string, any>, options?: { full?: boolean }) => T) {
    super();
    this.resultClass = resultClass;
    this.count = attributes['count'];
    this.total_pages = attributes['total_pages'];
    this.results = (attributes['results'] || []).map((result: Record<string, any>) => new this.resultClass(result));
    this.description = attributes['description'];
    this.prev_url = attributes['previous_page_url'];
    this.next_url = attributes['next_page_url'];
    this.errors = attributes['errors'];
  }

  public async next(): Promise<ResultSet<T> | undefined> {
    if (this.next_url) {
      // The Ruby gem's fetch method takes a full URL, so we need to extract the path and query params
      const url = new URL(this.next_url);
      const path = url.pathname;
      const query: Record<string, any> = {};
      url.searchParams.forEach((value, key) => {
        // Handle array parameters like fields[]
        if (key.endsWith('[]')) {
          const baseKey = key.slice(0, -2);
          if (!query[baseKey]) {
            query[baseKey] = [];
          }
          query[baseKey].push(value);
        } else {
          query[key] = value;
        }
      });
      return (this.constructor as typeof ResultSet).fetch(path, { query: query, resultClass: this.resultClass });
    }
    return undefined;
  }

  public async previous(): Promise<ResultSet<T> | undefined> {
    if (this.prev_url) {
      const url = new URL(this.prev_url);
      const path = url.pathname;
      const query: Record<string, any> = {};
      url.searchParams.forEach((value, key) => {
        if (key.endsWith('[]')) {
          const baseKey = key.slice(0, -2);
          if (!query[baseKey]) {
            query[baseKey] = [];
          }
          query[baseKey].push(value);
        } else {
          query[key] = value;
        }
      });
      return (this.constructor as typeof ResultSet).fetch(path, { query: query, resultClass: this.resultClass });
    }
    return undefined;
  }

  public static async fetch<T extends Base>(urlPath: string, options: { query?: Record<string, any>, resultClass: new (attributes: Record<string, any>, options?: { full?: boolean }) => T }): Promise<ResultSet<T>> {
    const { query, resultClass } = options;
    const response = await Client.get(urlPath, query);
    return new ResultSet<T>(response, resultClass);
  }

  // Implement Iterable interface to allow for...of loops
  [Symbol.iterator](): Iterator<T> {
    let index = 0;
    return {
      next: (): IteratorResult<T> => {
        if (index < this.results.length) {
          return { value: this.results[index++], done: false };
        } else {
          return { done: true, value: undefined };
        }
      }
    };
  }
}
