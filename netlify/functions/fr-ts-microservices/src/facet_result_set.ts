// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\facet_result_set.ts

// Corresponds to federal_register/facet_result_set.rb

import { Client } from "./client";
import { Facet } from "./facet";

export class FacetResultSet<T extends Facet> extends Client implements Iterable<T> {
  public conditions: Record<string, any>;
  public results: T[];

  private resultClass: new (attributes: Record<string, any>, options?: { result_set?: FacetResultSet<T> }) => T;

  constructor(attributes: Record<string, any>, resultClass: new (attributes: Record<string, any>, options?: { result_set?: FacetResultSet<T> }) => T, options: { query?: Record<string, any> } = {}) {
    super();
    this.resultClass = resultClass;
    this.conditions = options.query || {};

    this.results = Object.entries(attributes || {}).map(([slug, attr]: [string, any]) => {
      attr.slug = slug;
      return new this.resultClass(attr, { result_set: this });
    });
  }

  public static async fetch<T extends Facet>(urlPath: string, options: { query?: Record<string, any>, resultClass: new (attributes: Record<string, any>, options?: { result_set?: FacetResultSet<T> }) => T }): Promise<FacetResultSet<T>> {
    const { query, resultClass } = options;
    const response = await Client.get(urlPath, query);
    return new FacetResultSet<T>(response, resultClass, { query: query });
  }

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
