// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\facets\public_inspection_issue\daily_filing.ts

// Corresponds to federal_register/facet/public_inspection_issue/daily_filing.rb

import { Base } from "../../base";

export class DailyFiling extends Base {
  public get agencies(): any[] | undefined { return this.getAttribute("agencies"); }
  public get documents(): any[] | undefined { return this.getAttribute("documents"); }
  public get last_updated_at(): Date | undefined { return this.getAttribute("last_updated_at", { type: "datetime" }); }

  public conditions: Record<string, any>;

  constructor(attributes: Record<string, any>, conditions: Record<string, any>) {
    super(attributes, { query: conditions });
    this.conditions = conditions;
  }
}
