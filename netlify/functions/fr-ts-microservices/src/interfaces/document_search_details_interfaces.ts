// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\interfaces\document_search_details_interfaces.ts

export interface FilterOption {
  value: string;
  count: number;
}

export interface Filter {
  name: string;
  type: string;
  options: FilterOption[];
}

export interface Suggestion {
  text: string;
  url: string;
}

