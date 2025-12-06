// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\facets\topic.ts

// Corresponds to federal_register/facet/topic.rb

import { Facet } from "../facet";

export class Topic extends Facet {
  public static getUrl(): string {
    return '/documents/facets/topic';
  }
}
