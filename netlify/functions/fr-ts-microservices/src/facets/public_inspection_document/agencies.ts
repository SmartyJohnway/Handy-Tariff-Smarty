// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\facets\public_inspection_document\agencies.ts

// Corresponds to federal_register/facet/public_inspection_document/agencies.rb

import { PublicInspectionDocumentFacet } from "../../facet";

export class Agencies extends PublicInspectionDocumentFacet {
  public static getUrl(): string {
    return '/public-inspection-documents/facets/agencies';
  }
}
