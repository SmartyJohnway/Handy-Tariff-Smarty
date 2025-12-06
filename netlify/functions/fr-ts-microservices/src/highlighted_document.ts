// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\highlighted_document.ts

// Corresponds to federal_register/highlighted_document.rb

import { Base } from "./base";

export class InvalidPhotoSize extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPhotoSize";
  }
}

export class PhotoCredit {
  public name?: string;
  public url?: string;

  constructor(attributes: Record<string, any>) {
    this.name = attributes['name'];
    this.url = attributes['url'];
  }
}

export class HighlightedDocument extends Base {
  public get curated_abstract(): string | undefined { return this.getAttribute("curated_abstract"); }
  public get curated_title(): string | undefined { return this.getAttribute("curated_title"); }
  public get document_number(): string | undefined { return this.getAttribute("document_number"); }
  public get html_url(): string | undefined { return this.getAttribute("html_url"); }
  public get photo(): any | undefined { return this.getAttribute("photo"); }

  private static VALID_PHOTO_SIZES = [
    'full_size',
    'homepage',
    'large',
    'medium',
    'navigation',
    'small'
  ];

  public photoUrl(size: string): string | undefined {
    if (!HighlightedDocument.VALID_PHOTO_SIZES.includes(size)) {
      throw new InvalidPhotoSize(`Valid photo sizes are ${HighlightedDocument.VALID_PHOTO_SIZES.join(', ')}`);
    }

    if (this.attributes.photo) {
      return this.attributes.photo.urls[size];
    }
    return undefined;
  }

  private _photoCredit: PhotoCredit | undefined;

  public get photoCredit(): PhotoCredit | undefined {
    if (this._photoCredit) {
      return this._photoCredit;
    }
    if (this.attributes.photo && this.attributes.photo.credit) {
      this._photoCredit = new PhotoCredit(this.attributes.photo.credit);
    }
    return this._photoCredit;
  }
}
