// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\facets\public_inspection_issue\type.ts

// Corresponds to federal_register/facet/public_inspection_issue/type.rb

import { PublicInspectionIssueFacet } from "../../facet";
import { TypeFiling } from "./type_filing";

export class Type extends PublicInspectionIssueFacet {
  public static getUrl(): string {
    return '/public-inspection-issues/facets/type';
  }

  protected filingClass(): new (attributes: Record<string, any>, conditions: Record<string, any>) => TypeFiling {
    return TypeFiling;
  }
}
