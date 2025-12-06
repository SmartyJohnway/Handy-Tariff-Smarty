// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\facets\document\quarterly.ts

// Corresponds to federal_register/facet/document/quarterly.rb

import { Frequency } from "./frequency";

export class Quarterly extends Frequency {
  public static getUrl(): string {
    return '/documents/facets/quarterly.json';
  }
}
