// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\facets\document\agency.ts

// Corresponds to federal_register/facet/document/agency.rb

import { DocumentFacet } from "../../facet";

export class Agency extends DocumentFacet {
  public static getUrl(): string {
    return '/documents/facets/agency';
  }
}
