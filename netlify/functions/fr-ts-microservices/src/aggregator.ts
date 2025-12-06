// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\aggregator.ts

import { Document, ResultSet, Facet, FacetResultSet,
  DocumentAgencyFacet,
  DocumentDailyFacet,
  DocumentMonthlyFacet,
  DocumentYearlyFacet,
  DocumentSectionFacet,
  DocumentTopicFacet,
  DocumentTypeFacet,
  DocumentWeeklyFacet,
  DocumentQuarterlyFacet,
} from './index';

// Define the structure for a complex, aggregated query
export interface AggregatedQuery {
  term?: string;
  conditions?: Record<string, any>;
  facets?: string[]; // e.g., ['agency', 'daily']
  per_page?: number;
  page?: number;
  order?: string;
}

// Define the structure for the combined response
export interface AggregatedResponse {
  documents: ResultSet<Document>;
  facets: Record<string, FacetResultSet<Facet>>;
}

// A map to resolve facet names to their corresponding classes
const facetMap: Record<string, typeof Facet> = {
  agency: DocumentAgencyFacet,
  daily: DocumentDailyFacet,
  monthly: DocumentMonthlyFacet,
  yearly: DocumentYearlyFacet,
  section: DocumentSectionFacet,
  topic: DocumentTopicFacet,
  type: DocumentTypeFacet,
  weekly: DocumentWeeklyFacet,
  quarterly: DocumentQuarterlyFacet,
};

/**
 * The FederalRegister class acts as an aggregator to orchestrate calls
 * to various microservice adapters (Document, Facet, etc.).
 */
export class FederalRegister {
  /**
   * Performs a comprehensive search that can include document results and facet counts.
   * @param query The aggregated query object.
   * @returns A promise that resolves to an AggregatedResponse containing documents and facets.
   */
  public static async search(query: AggregatedQuery): Promise<AggregatedResponse> {
    const documentResults = await Document.search(query);

    const facetPromises: Promise<[string, FacetResultSet<Facet>]>[] = [];

    if (query.facets) {
      for (const facetName of query.facets) {
        const FacetClass = facetMap[facetName];
        if (FacetClass) {
          const facetPromise = FacetClass.search(query, FacetClass as any).then(
            (resultSet: FacetResultSet<Facet>): [string, FacetResultSet<Facet>] => [facetName, resultSet]
          );
          facetPromises.push(facetPromise);
        }
      }
    }

    const facetResultsArray = await Promise.all(facetPromises);
    const facets: Record<string, FacetResultSet<Facet>> = Object.fromEntries(facetResultsArray);

    return {
      documents: documentResults,
      facets: facets,
    };
  }
}
