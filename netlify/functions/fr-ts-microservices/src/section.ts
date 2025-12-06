// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\section.ts

// Corresponds to federal_register/section.rb

import { Base } from "./base";
import { Client } from "./client";
import { HighlightedDocument } from "./highlighted_document";

export interface ISectionAttributes {
  name: string;
  slug?: string;
  highlighted_documents?: any[]; // Will be HighlightedDocument objects
}

export class Section extends Base {
  public get name(): string { return this.getAttribute("name"); }
  public get slug(): string | undefined { return this.getAttribute("slug"); }

  // Corresponds to FederalRegister::Section.search
  public static async search(args: Record<string, any> = {}): Promise<Record<string, Section>> {
    const response = await Client.get("/sections.json", args);
    
    const sections: Record<string, Section> = {};
    for (const sectionName in response) {
      if (response.hasOwnProperty(sectionName)) {
        sections[sectionName] = new Section(response[sectionName]);
      }
    }
    return sections;
  }

  // Corresponds to FederalRegister::Section#highlighted_documents
  public getHighlightedDocuments(): HighlightedDocument[] {
    const highlightedDocsData = this.getAttribute("highlighted_documents");
    if (Array.isArray(highlightedDocsData)) {
      return highlightedDocsData.map(attrs => new HighlightedDocument(attrs));
    }
    return [];
  }
}
