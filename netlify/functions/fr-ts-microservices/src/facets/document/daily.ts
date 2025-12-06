// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\facets\document\daily.ts

// Corresponds to federal_register/facet/document/daily.rb

import { Frequency } from "./frequency";

export class Daily extends Frequency {
  public static getUrl(): string {
    return '/documents/facets/daily';
  }
}
