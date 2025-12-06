// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\document.ts

// Corresponds to federal_register/document.rb

import { Base } from "./base";
import { ResultSet } from "./result_set";
import { Utilities } from "./utilities";
import { Client } from "./client";
import { DocumentImage } from "./document_image";
import { Agency } from "./agency";

// --- Type Definitions ---
interface IRawAgency {
  id?: number;
  name: string;
  raw_name?: string;
  slug?: string;
  url?: string;
}

export interface IFRDocAttributes {
  document_number: string;
  title: string;
  type: string;
  publication_date: string | Date;
  agencies: IRawAgency[];
  html_url: string;
  body_html_url: string | null;
  // Add other attributes as needed from document.rb
  abstract?: string;
  action?: string;
  agency_names?: string[];
  cfr_references?: any[];
  citation?: string;
  comment_url?: string;
  corrections?: any[];
  correction_of?: any;
  dates?: any[];
  disposition_notes?: string;
  docket_id?: string;
  docket_ids?: string[];
  end_page?: number;
  excerpts?: string;
  executive_order_notes?: string;
  executive_order_number?: number;
  full_text_xml_url?: string;
  images?: any[];
  json_url?: string;
  mods_url?: string;
  page_views?: { count: number; last_updated: Date | null };
  pdf_url?: string;
  president?: string;
  proclamation_number?: number;
  public_inspection_pdf_url?: string;
  regulation_id_number_info?: any;
  regulation_id_numbers?: string[];
  regulations_dot_gov_info?: any;
  regulations_dot_gov_url?: string;
  significant?: boolean;
  start_page?: number;
  subtype?: string;
  raw_text_url?: string;
  toc_subject?: string;
  toc_doc?: string;
  volume?: number;
  comments_close_on?: string | Date;
  effective_on?: string | Date;
  signing_date?: string | Date;
}

export class Document extends Base {
  // Dynamically defined attributes from Ruby's add_attribute
  public get document_number(): string { return this.getAttribute("document_number"); }
  public get title(): string { return this.getAttribute("title"); }
  public get type(): string { return this.getAttribute("type"); }
  public get publication_date(): Date { return this.getAttribute("publication_date", { type: "date" }); }

  public get html_url(): string { return this.getAttribute("html_url"); }
  public get body_html_url(): string | null { return this.getAttribute("body_html_url"); }
  public get abstract(): string | undefined { return this.getAttribute("abstract"); }
  public get action(): string | undefined { return this.getAttribute("action"); }
  public get agency_names(): string[] | undefined { return this.getAttribute("agency_names"); }
  public get cfr_references(): any[] | undefined { return this.getAttribute("cfr_references"); }
  public get citation(): string | undefined { return this.getAttribute("citation"); }
  public get comment_url(): string | undefined { return this.getAttribute("comment_url"); }
  public get corrections(): any[] | undefined { return this.getAttribute("corrections"); }
  public get correction_of(): any | undefined { return this.getAttribute("correction_of"); }
  public get dates(): any[] | undefined { return this.getAttribute("dates"); }
  public get disposition_notes(): string | undefined { return this.getAttribute("disposition_notes"); }
  public get docket_id(): string | undefined { return this.getAttribute("docket_id"); }
  public get docket_ids(): string[] | undefined { return this.getAttribute("docket_ids"); }
  public get end_page(): number | undefined { return this.getAttribute("end_page", { type: "integer" }); }
  public get excerpts(): string | undefined { return this.getAttribute("excerpts"); }
  public get executive_order_notes(): string | undefined { return this.getAttribute("executive_order_notes"); }
  public get executive_order_number(): number | undefined { return this.getAttribute("executive_order_number", { type: "integer" }); }
  public get full_text_xml_url(): string | undefined { return this.getAttribute("full_text_xml_url"); }
  public get images(): DocumentImage[] {
    const rawImages = this.getAttribute("images");
    if (Array.isArray(rawImages)) {
      return rawImages.map(attrs => new DocumentImage(attrs));
    }
    return [];
  }
  public get json_url(): string | undefined { return this.getAttribute("json_url"); }
  public get mods_url(): string | undefined { return this.getAttribute("mods_url"); }
  public get page_views(): { count: number; last_updated: Date | null } | undefined { return this.getAttribute("page_views"); }
  public get pdf_url(): string | undefined { return this.getAttribute("pdf_url"); }
  public get president(): string | undefined { return this.getAttribute("president"); }
  public get proclamation_number(): number | undefined { return this.getAttribute("proclamation_number", { type: "integer" }); }
  public get public_inspection_pdf_url(): string | undefined { return this.getAttribute("public_inspection_pdf_url"); }
  public get regulation_id_number_info(): any | undefined { return this.getAttribute("regulation_id_number_info"); }
  public get regulation_id_numbers(): string[] | undefined { return this.getAttribute("regulation_id_numbers"); }
  public get regulations_dot_gov_info(): any | undefined { return this.getAttribute("regulations_dot_gov_info"); }
  public get regulations_dot_gov_url(): string | undefined { return this.getAttribute("regulations_dot_gov_url"); }
  public get significant(): boolean | undefined { return this.getAttribute("significant"); }
  public get start_page(): number | undefined { return this.getAttribute("start_page", { type: "integer" }); }
  public get subtype(): string | undefined { return this.getAttribute("subtype"); }
  public get raw_text_url(): string | undefined { return this.getAttribute("raw_text_url"); }
  public get toc_subject(): string | undefined { return this.getAttribute("toc_subject"); }
  public get toc_doc(): string | undefined { return this.getAttribute("toc_doc"); }
  public get volume(): number | undefined { return this.getAttribute("volume", { type: "integer" }); }
  public get comments_close_on(): Date | undefined { return this.getAttribute("comments_close_on", { type: "date" }); }
  public get effective_on(): Date | undefined { return this.getAttribute("effective_on", { type: "date" }); }
  public get signing_date(): Date | undefined { return this.getAttribute("signing_date", { type: "date" }); }

  // Corresponds to FederalRegister::Document.search
  public static async search(args: Record<string, any>): Promise<ResultSet<Document>> {
    return ResultSet.fetch<Document>("/documents.json", { query: args, resultClass: Document });
  }

  // Corresponds to FederalRegister::Document.find
  public static async find(documentNumber: string, options: { publication_date?: string | Date, fields?: string[] } = {}): Promise<Document> {
    const query: Record<string, any> = {};
    if (options.publication_date) {
      query.publication_date = options.publication_date instanceof Date ? options.publication_date.toISOString().split('T')[0] : options.publication_date;
    }
    if (options.fields) {
      query.fields = options.fields;
    }
    const attributes = await Client.get(`/documents/${encodeURIComponent(documentNumber)}.json`, query);
    return new Document(attributes, { full: true });
  }

  // Corresponds to FederalRegister::DocumentUtilities.find_all
  public static async find_all(documentNumbers: string[], options: { fields?: string[] } = {}): Promise<ResultSet<Document>> {
    if (documentNumbers.length === 0) {
      throw new Error("No documents or citation numbers were provided");
    }

    // Ensure unique document numbers
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
      const url = `/documents/${params}.json`;
      const response = await Client.get(url, fetchOptions);
      allResults = allResults.concat(response.results || []);
    }

    return new ResultSet<Document>({ count: allResults.length, results: allResults }, Document);
  }

  // Helper to get full text XML, etc.
  public async fullTextXml(): Promise<string | null> {
    if (this.full_text_xml_url) {
      try {
        const response = await fetch(this.full_text_xml_url);
        if (response.ok) {
          return response.text();
        } else {
          return null;
        }
      } catch (e) {
        console.error("Error fetching full text XML:", e);
        return null;
      }
    }
    return null;
  }

  public get agencies(): Agency[] {
    const rawAgencies = this.getAttribute("agencies");
    if (Array.isArray(rawAgencies)) {
      return rawAgencies.map(attrs => new Agency(attrs));
    }
    return [];
  }

  // Implement page_views parsing similar to Ruby gem
  public getPageViews(): { count: number; last_updated: Date | null } | undefined {
    const pageViewsData = this.getAttribute("page_views");
    if (pageViewsData) {
      return {
        count: pageViewsData.count,
        last_updated: pageViewsData.last_updated ? new Date(pageViewsData.last_updated) : null,
      };
    }
    return undefined;
  }
}
