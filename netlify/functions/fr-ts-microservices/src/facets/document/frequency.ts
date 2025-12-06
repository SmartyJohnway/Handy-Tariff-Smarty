// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\facets\document\frequency.ts

// Corresponds to federal_register/facet/document/frequency.rb

import { DocumentFacet } from "../../facet";
import { Client } from "../../client";
import { buildParams } from "../../utilities";

export class Frequency extends DocumentFacet {
  public static getUrl(): string {
    return '/documents/facets/frequency';
  }

  public static chartUrl(args: Record<string, any> = {}): string {
    const uriParts: string[] = [Client.BASE_URI, this.getUrl(), ".png"];

    if (Object.keys(args).length > 0) {
      const params = new URLSearchParams();
      Object.entries(args).forEach(([key, value]) => {
        buildParams(params, key, value);
      });
      uriParts.push("?");
      uriParts.push(params.toString());
    }

    return uriParts.join("");
  }
}
