// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\facets\document\monthly.n

// Corresponds to federal_register/facet/document/monthly.rb

import { Frequency } from "./frequency";

export class Monthly extends Frequency {
  public static getUrl(): string {
    return '/documents/facets/monthly';
  }
}
