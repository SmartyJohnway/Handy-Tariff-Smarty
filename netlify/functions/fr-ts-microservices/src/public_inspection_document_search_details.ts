// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\public_inspection_document_search_details.ts

// Corresponds to federal_register/public_inspection_document_search_details.rb

import { Base } from "./base";
import { Filter, Suggestion } from "./interfaces/document_search_details_interfaces";

export class PublicInspectionDocumentSearchDetails extends Base {
  /**
   * A list of filter objects provided by the API.
   */
  public get filters(): Filter[] {
    return this.getAttribute("filters");
  }

  /**
   * A list of suggestion objects provided by the API.
   */
  public get suggestions(): Suggestion[] {
    return this.getAttribute("suggestions");
  }
}
