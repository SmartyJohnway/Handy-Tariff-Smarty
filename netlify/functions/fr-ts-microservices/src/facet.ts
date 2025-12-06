// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\facet.ts

// Corresponds to federal_register/facet.rb

import { Base } from "./base";
import { FacetResultSet } from "./facet_result_set";
import { Client } from "./client";

export interface IFacetAttributes {
  count: number;
  name: string;
  slug: string;
}

export class Facet extends Base {
  public get count(): number { return this.getAttribute("count", { type: "integer" }); }
  public get name(): string { return this.getAttribute("name"); }
  public get slug(): string { return this.getAttribute("slug"); }

  // This will be overridden by subclasses to provide specific URLs
  public static getUrl(): string {
    throw new Error("Facet subclasses must implement getUrl()")
  }

    public static async search<T extends Facet>(args: Record<string, any> = {}, resultClass: new (attributes: Record<string, any>, options?: { full?: boolean; result_set?: any; query?: any }) => T): Promise<FacetResultSet<T>> {

      return FacetResultSet.fetch<T>(this.getUrl(), { query: args, resultClass: resultClass });

    }

  }

  

  // Corresponds to federal_register/facet/document.rb

  export class DocumentFacet extends Facet {}

  

  // Corresponds to federal_register/facet/public_inspection_document.rb

  export class PublicInspectionDocumentFacet extends Facet {}

  

  // Corresponds to federal_register/facet/public_inspection_issue.rb

  export abstract class PublicInspectionIssueFacet extends Base {
    public get slug(): string { return this.getAttribute("slug"); }

    public get name(): string { return this.getAttribute("name"); }

    public conditions: Record<string, any>;

    private _specialFilings: any;
    private _regularFilings: any;

    constructor(attributes: Record<string, any> = {}, options: { full?: boolean; result_set?: any; query?: Record<string, any> } = {}) {
      super(attributes, options);
      this.conditions = options.query || {};
    }

    public static getUrl(): string {
      throw new Error("PublicInspectionIssueFacet subclasses must implement getUrl()");
    }

    // The filing class (e.g., DailyFiling, TypeFiling) must be defined by the subclass
    protected abstract filingClass(): new (attributes: Record<string, any>, conditions: Record<string, any>) => any;

    public static async search<T extends PublicInspectionIssueFacet>(args: Record<string, any> = {}, resultClass: new (attributes: Record<string, any>, options?: { full?: boolean; result_set?: any; query?: Record<string, any> }) => T): Promise<T[]> {
      const response = await Client.get(this.getUrl(), args);
      return Object.entries(response).map(([slug, attributes]: [string, any]) => {
        attributes.slug = slug;
        return new resultClass(attributes, { query: args });
      });
    }

    private deepMergeConditions(target: any, source: any): any {
      const output = { ...target };
      if (output.conditions && source.conditions) {
        output.conditions = { ...output.conditions, ...source.conditions };
      } else {
        output.conditions = source.conditions || output.conditions;
      }
      return output;
    }

    public specialFilings() {
      if (this._specialFilings) return this._specialFilings;

      const filingData = this.getAttribute('special_filings');
      const newConditions = this.deepMergeConditions(this.conditions, {
        conditions: { special_filing: 1 },
      });

      const FilingClass = this.filingClass();
      this._specialFilings = new FilingClass(filingData, newConditions);
      return this._specialFilings;
    }

    public regularFilings() {
      if (this._regularFilings) return this._regularFilings;

      const filingData = this.getAttribute('regular_filings');
      const newConditions = this.deepMergeConditions(this.conditions, {
        conditions: { special_filing: 0 },
      });

      const FilingClass = this.filingClass();
      this._regularFilings = new FilingClass(filingData, newConditions);
      return this._regularFilings;
    }
  }
