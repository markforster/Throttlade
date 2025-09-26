declare class URLPattern {
  constructor(input: { pathname?: string, protocol?: string, hostname?: string });
  test(input: string): boolean;
}