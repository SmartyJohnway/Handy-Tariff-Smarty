// d:\HTSUSjohnway-SEP10\federal_register-master\ts_microservices_implementation\src\utilities.ts

// Corresponds to federal_register/utilities.rb

export class Utilities {
  // Ruby's extract_options is often used to separate a hash of options
  // from a list of other arguments. In TypeScript, this is typically
  // handled by function overloads or by explicitly defining the options
  // as the last parameter.
  // For now, we'll provide a simple utility that assumes options are the last argument if it's an object.
  public static extractOptions<T extends any[]>(args: T): [Record<string, any>, Exclude<T, Record<string, any>>] {
    const lastArg = args[args.length - 1];
    if (typeof lastArg === 'object' && lastArg !== null && !Array.isArray(lastArg)) {
      const options = args.pop() as Record<string, any>;
      return [options, args as Exclude<T, Record<string, any>>];
    } else {
      return [{}, args as Exclude<T, Record<string, any>>];
    }
  }
}

/**
 * Recursively builds URLSearchParams for nested objects and arrays.
 * @param formData The URLSearchParams instance to append to.
 * @param key The current key.
 * @param data The data to append.
 */
export const buildParams = (formData: URLSearchParams, key: string, data: any) => {
  if (Array.isArray(data)) {
    data.forEach(item => buildParams(formData, `${key}[]`, item));
  } else if (typeof data === 'object' && data !== null) {
    Object.entries(data).forEach(([nestedKey, nestedValue]) => {
      buildParams(formData, `${key}[${nestedKey}]`, nestedValue);
    });
  } else {
    formData.append(key, data);
  }
};
