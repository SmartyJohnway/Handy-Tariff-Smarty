// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\facets\document\topic.ts

// Corresponds to federal_register/facet/document/topic.rb

import { DocumentFacet } from "../../facet";

export class Topic extends DocumentFacet {
  public static getUrl(): string {
    return '/documents/facets/topic';
  }
}
