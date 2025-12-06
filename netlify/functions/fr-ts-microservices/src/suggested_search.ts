// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\suggested_search.ts

// Corresponds to federal_register/suggested_search.rb

import { Base } from "./base";
import { Client } from "./client";

export interface ISuggestedSearchAttributes {
  description?: string;
  documents_in_last_year?: number;
  documents_with_open_comment_periods?: number;
  position?: number;
  search_conditions?: any;
  section?: string;
  slug: string;
  title: string;
}

export class SuggestedSearch extends Base {
  public get description(): string | undefined { return this.getAttribute("description"); }
  public get documents_in_last_year(): number | undefined { return this.getAttribute("documents_in_last_year", { type: "integer" }); }
  public get documents_with_open_comment_periods(): number | undefined { return this.getAttribute("documents_with_open_comment_periods", { type: "integer" }); }
  public get position(): number | undefined { return this.getAttribute("position", { type: "integer" }); }
  public get search_conditions(): any | undefined { return this.getAttribute("search_conditions"); }
  public get section(): string | undefined { return this.getAttribute("section"); }
  public get slug(): string { return this.getAttribute("slug"); }
  public get title(): string { return this.getAttribute("title"); }

  // Corresponds to FederalRegister::SuggestedSearch.search
  public static async search(args: Record<string, any> = {}): Promise<Record<string, SuggestedSearch[]>> {
    const response = await Client.get("/suggested_searches.json", args);

    const searches: Record<string, SuggestedSearch[]> = {};
    for (const sectionName in response) {
      if (response.hasOwnProperty(sectionName)) {
        searches[sectionName] = response[sectionName].map((attrs: Record<string, any>) => new SuggestedSearch(attrs));
      }
    }
    return searches;
  }

  // Corresponds to FederalRegister::SuggestedSearch.find
  public static async find(slug: string): Promise<SuggestedSearch> {
    const response = await Client.get(`/suggested_searches/${encodeURIComponent(slug)}.json`);
    return new SuggestedSearch(response);
  }
}
