// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\facets\document\weekly.ts

// Corresponds to federal_register/facet/document/weekly.rb

import { Frequency } from "./frequency";

export class Weekly extends Frequency {
  public static getUrl(): string {
    return '/documents/facets/weekly.json';
  }
}
