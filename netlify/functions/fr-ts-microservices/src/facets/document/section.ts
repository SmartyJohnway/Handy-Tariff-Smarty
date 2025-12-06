// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\facets\document\section.ts

// Corresponds to federal_register/facet/document/section.rb

import { DocumentFacet } from "../../facet";

export class Section extends DocumentFacet {
  public static getUrl(): string {
    return '/documents/facets/section';
  }
}
