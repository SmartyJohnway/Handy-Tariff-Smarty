// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\document_image.ts

// Corresponds to federal_register/document_image.rb

import { Base } from "./base";

/**
 * Represents an image associated with a document.
 * The attributes for this class are an array: [identifier, {size: url, ...}]
 */
export class DocumentImage extends Base {
  private get rawIdentifier(): string {
    return this.attributes[0];
  }

  private get rawSizes(): Record<string, string> {
    return this.attributes[1] || {};
  }

  /**
   * The identifier for the image.
   */
  public identifier(): string {
    return this.rawIdentifier;
  }

  /**
   * An array of available image sizes (e.g., 'original', 'large', 'small').
   */
  public sizes(): string[] {
    return Object.keys(this.rawSizes);
  }

  /**
   * Get the URL for a specific image size.
   * @param size The desired image size.
   * @returns The URL for the image, or undefined if the size is not available.
   */
  public urlFor(size: string): string | undefined {
    return this.rawSizes[size];
  }

  /**
   * Get the default URL for the image, preferring 'original_png' if available.
   * @returns The default image URL.
   */
  public defaultUrl(): string | undefined {
    return this.sizes().includes('original_png') ? this.urlFor('original_png') : this.urlFor('original');
  }
}
