// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\base.ts

// Corresponds to federal_register/base.rb

interface AttributeOptions {
  type?: "date" | "datetime" | "integer";
}

export class Base {
  protected attributes: Record<string, any>;
  private _full: boolean;

  constructor(attributes: Record<string, any> = {}, options: { full?: boolean; result_set?: any; query?: any } = {}) {
    this.attributes = attributes;
    this._full = options.full || false;
  }

  public full(): boolean {
    return this._full;
  }

  protected getAttribute(attrName: string, options?: AttributeOptions): any {
    let val = this.attributes[attrName];
    if (val === undefined || val === null) return val;

    switch (options?.type) {
      case "date":
        return val instanceof Date ? val : new Date(val);
      case "datetime":
        return val instanceof Date ? val : new Date(val);
      case "integer":
        return typeof val === "number" ? val : parseInt(val, 10);
      default:
        return val;
    }
  }
}
