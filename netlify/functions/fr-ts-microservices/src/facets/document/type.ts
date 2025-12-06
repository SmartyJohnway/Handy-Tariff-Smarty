// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\facets\document\type.ts

// Corresponds to federal_register/facet/document/type.rb

import { DocumentFacet } from "../../facet";

export class Type extends DocumentFacet {
  public static getUrl(): string {
    return '/documents/facets/type';
  }
}
