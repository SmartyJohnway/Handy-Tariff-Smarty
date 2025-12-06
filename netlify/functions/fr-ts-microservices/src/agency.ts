// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\agency.ts

// Corresponds to federal_register/agency.rb

import { Base } from "./base";
import { Client } from "./client";

export interface IAgencyAttributes {
  agency_url?: string;
  child_ids?: number[];
  description?: string;
  json_url?: string;
  logo?: any;
  name: string;
  raw_name?: string;
  recent_articles_url?: string;
  short_name?: string;
  slug?: string;
  url?: string;
  id?: number;
  parent_id?: number;
}

export class Agency extends Base {
  public get agency_url(): string | undefined { return this.getAttribute("agency_url"); }
  public get child_ids(): number[] | undefined { return this.getAttribute("child_ids"); }
  public get description(): string | undefined { return this.getAttribute("description"); }
  public get json_url(): string | undefined { return this.getAttribute("json_url"); }
  public get logo(): any | undefined { return this.getAttribute("logo"); }
  public get name(): string { return this.getAttribute("name"); }
  public get raw_name(): string | undefined { return this.getAttribute("raw_name"); }
  public get recent_articles_url(): string | undefined { return this.getAttribute("recent_articles_url"); }
  public get short_name(): string | undefined { return this.getAttribute("short_name"); }
  public get slug(): string | undefined { return this.getAttribute("slug"); }
  public get url(): string | undefined { return this.getAttribute("url"); }
  public get id(): number | undefined { return this.getAttribute("id", { type: "integer" }); }
  public get parent_id(): number | undefined { return this.getAttribute("parent_id", { type: "integer" }); }

  // Corresponds to FederalRegister::Agency.all
  public static async all(options: { fields?: string[] } = {}): Promise<Agency[]> {
    const query: Record<string, any> = {};
    if (options.fields) {
      query.fields = options.fields;
    }
    const response = await Client.get("/agencies.json", query);
    return response.map((hsh: Record<string, any>) => new Agency(hsh, { full: true }));
  }

  // Corresponds to FederalRegister::Agency.find
  public static async find(idOrSlug: string | number, options: { fields?: string[] } = {}): Promise<Agency | Agency[]> {
    const slug = encodeURIComponent(idOrSlug.toString());
    const query: Record<string, any> = {};
    if (options.fields) {
      query.fields = options.fields;
    }

    const response = await Client.get(`/agencies/${slug}.json`, query);
    
    if (Array.isArray(response)) {
      return response.map((hsh: Record<string, any>) => new Agency(hsh, { full: true }));
    } else {
      return new Agency(response, { full: true });
    }
  }

  // Corresponds to FederalRegister::Agency.suggestions
  public static async suggestions(args: Record<string, any> = {}): Promise<Agency[]> {
    // Normalize suggestion params to maximize compatibility with FR API
    const q = args.term || args.q || '';
    const send: Record<string, any> = { ...args };
    if (q) {
      send.term = q;
      send.q = q;
      send['conditions'] = send['conditions'] || {};
      send['conditions']['term'] = q;
    }
    const response = await Client.get("/agencies/suggestions.json", send);
    return response.map((hsh: Record<string, any>) => new Agency(hsh, { full: true }));
  }

  // Corresponds to FederalRegister::Agency#logo_url
  public logoUrl(size: string): string | undefined {
    if (this.attributes.logo) {
      return this.attributes.logo[`${size}_url`];
    }
    return undefined;
  }
}
