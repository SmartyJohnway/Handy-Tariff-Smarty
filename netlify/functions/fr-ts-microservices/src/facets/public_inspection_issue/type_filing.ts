// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\facets\public_inspection_issue\type_filing.ts

// Corresponds to federal_register/facet/public_inspection_issue/type_filing.rb

import { Base } from "../../base";

class DocumentTypeFacet {
  public count: number;
  public name: string;
  public search_conditions: Record<string, any>;

  constructor(type: string, attributes: Record<string, any>, searchConditions: Record<string, any>) {
    this.count = attributes['count'];
    this.name = attributes['name'];
    // Ruby's deep_merge for conditions is complex. For now, a simple merge.
    this.search_conditions = { ...searchConditions, conditions: { type: [type] } };
  }
}

export class TypeFiling extends Base {
  public document_types: DocumentTypeFacet[];
  public search_conditions: Record<string, any>;
  public conditions: Record<string, any>;

  constructor(attributes: Record<string, any>, conditions: Record<string, any>) {
    super(attributes, { query: conditions });
    this.conditions = conditions;
    this.search_conditions = conditions;
    this.document_types = Object.entries(attributes || {}).map(([type, attrs]: [string, any]) => new DocumentTypeFacet(type, attrs, this.search_conditions));
  }
}
