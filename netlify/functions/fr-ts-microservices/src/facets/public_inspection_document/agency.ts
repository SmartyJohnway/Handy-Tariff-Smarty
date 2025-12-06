// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\facets\public_inspection_document\agency.ts

// Corresponds to federal_register/facet/public_inspection_document/agency.rb

import { PublicInspectionDocumentFacet } from "../../facet";

export class Agency extends PublicInspectionDocumentFacet {
  public static getUrl(): string {
    return '/public-inspection-documents/facets/agency';
  }
}
