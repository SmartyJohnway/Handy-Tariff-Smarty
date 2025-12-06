// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\public_inspection_document.ts

// Corresponds to federal_register/public_inspection_document.rb

import { Base } from "./base";
import { ResultSet } from "./result_set";
import { Client } from "./client";
import { Document } from "./document"; // Re-use DocumentUtilities.find_all logic

export interface IPublicInspectionDocumentAttributes {
  agencies?: any[];
  docket_numbers?: string[];
  document_number: string;
  editorial_note?: string;
  excerpts?: string;
  html_url?: string;
  filing_type?: string;
  pdf_url?: string;
  pdf_file_size?: number;
  num_pages?: number;
  title: string;
  toc_doc?: string;
  toc_subject?: string;
  type: string;
  publication_date?: string | Date;
  filed_at?: string | Date;
  pdf_update_at?: string | Date;
}

export class PublicInspectionDocument extends Base {
  public get agencies(): any[] | undefined { return this.getAttribute("agencies"); }
  public get docket_numbers(): string[] | undefined { return this.getAttribute("docket_numbers"); }
  public get document_number(): string { return this.getAttribute("document_number"); }
  public get editorial_note(): string | undefined { return this.getAttribute("editorial_note"); }
  public get excerpts(): string | undefined { return this.getAttribute("excerpts"); }
  public get html_url(): string | undefined { return this.getAttribute("html_url"); }
  public get filing_type(): string | undefined { return this.getAttribute("filing_type"); }
  public get pdf_url(): string | undefined { return this.getAttribute("pdf_url"); }
  public get pdf_file_size(): number | undefined { return this.getAttribute("pdf_file_size", { type: "integer" }); }
  public get num_pages(): number | undefined { return this.getAttribute("num_pages", { type: "integer" }); }
  public get title(): string { return this.getAttribute("title"); }
  public get toc_doc(): string | undefined { return this.getAttribute("toc_doc"); }
  public get toc_subject(): string | undefined { return this.getAttribute("toc_subject"); }
  public get type(): string { return this.getAttribute("type"); }
  public get publication_date(): Date | undefined { return this.getAttribute("publication_date", { type: "date" }); }
  public get filed_at(): Date | undefined { return this.getAttribute("filed_at", { type: "datetime" }); }
  public get pdf_update_at(): Date | undefined { return this.getAttribute("pdf_update_at", { type: "datetime" }); }

  // Corresponds to FederalRegister::PublicInspectionDocument.search
  public static async search(args: Record<string, any>): Promise<ResultSet<PublicInspectionDocument>> {
    return ResultSet.fetch<PublicInspectionDocument>("/public-inspection-documents.json", { query: args, resultClass: PublicInspectionDocument });
  }

  // Corresponds to FederalRegister::PublicInspectionDocument.search_metadata
  public static async searchMetadata(args: Record<string, any>): Promise<ResultSet<PublicInspectionDocument>> {
    return ResultSet.fetch<PublicInspectionDocument>("/public-inspection-documents.json", { query: args.merge({ metadata_only: '1' }), resultClass: PublicInspectionDocument });
  }

  // Corresponds to FederalRegister::PublicInspectionDocument.find
  public static async find(documentNumber: string): Promise<PublicInspectionDocument> {
    const attributes = await Client.get(`/public-inspection-documents/${encodeURIComponent(documentNumber)}.json`);
    return new PublicInspectionDocument(attributes, { full: true });
  }

  // Corresponds to FederalRegister::PublicInspectionDocument.find_all
  // Re-using the batching logic from Document.find_all
  public static async find_all(documentNumbers: string[], options: { fields?: string[] } = {}): Promise<ResultSet<PublicInspectionDocument>> {
    if (documentNumbers.length === 0) {
      throw new Error("No documents or citation numbers were provided");
    }

    const uniqueDocumentNumbers = Array.from(new Set(documentNumbers));

    const fetchOptions: Record<string, any> = {};
    if (options.fields) {
      fetchOptions.fields = options.fields;
    }

    const URL_CHARACTER_LIMIT = 2000; // From Ruby gem

    const calculateRequestBatches = (docs: string[], currentFetchOptions: Record<string, any>): number => {
      const fetchOptionUrlCharacterCount = new URLSearchParams(currentFetchOptions).toString().length;
      const charactersAvailable = URL_CHARACTER_LIMIT - fetchOptionUrlCharacterCount;
      const docNumberCharacterCount = encodeURIComponent(docs.join(',')).length;

      if (charactersAvailable > docNumberCharacterCount) {
        return 1;
      } else {
        return Math.ceil(docNumberCharacterCount / charactersAvailable);
      }
    };

    const httpRequestBatches = calculateRequestBatches(uniqueDocumentNumbers, fetchOptions);
    const sliceSize = Math.ceil(uniqueDocumentNumbers.length / httpRequestBatches);

    let allResults: any[] = [];

    for (let i = 0; i < uniqueDocumentNumbers.length; i += sliceSize) {
      const slice = uniqueDocumentNumbers.slice(i, i + sliceSize);
      const params = slice.map(num => encodeURIComponent(num)).join(',');
      const url = `/public-inspection-documents/${params}.json`;
      const response = await Client.get(url, fetchOptions);
      allResults = allResults.concat(response.results || []);
    }

    return new ResultSet<PublicInspectionDocument>({ count: allResults.length, results: allResults }, PublicInspectionDocument);
  }

  // Corresponds to FederalRegister::PublicInspectionDocument.available_on
  public static async availableOn(date: Date | string): Promise<ResultSet<PublicInspectionDocument>> {
    const dateString = date instanceof Date ? date.toISOString().split('T')[0] : date;
    return ResultSet.fetch<PublicInspectionDocument>("/public-inspection-documents.json", {
      query: { conditions: { available_on: dateString } },
      resultClass: PublicInspectionDocument
    });
  }

  // Corresponds to FederalRegister::PublicInspectionDocument.current
  public static async current(): Promise<ResultSet<PublicInspectionDocument>> {
    return ResultSet.fetch<PublicInspectionDocument>("/public-inspection-documents/current.json", { resultClass: PublicInspectionDocument });
  }
}
