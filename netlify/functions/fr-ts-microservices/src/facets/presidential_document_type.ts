// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\facets\presidential_document_type.ts

// Corresponds to federal_register/facet/presidential_document_type.rb

import { Facet } from "../facet";

export class PresidentialDocumentType extends Facet {
  public static getUrl(): string {
    return '/documents/facets/subtype';
  }
}
