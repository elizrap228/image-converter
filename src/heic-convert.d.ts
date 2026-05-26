declare module "heic-convert" {
  function convert(opts: {
    buffer: Buffer;
    format: "PNG" | "JPEG";
    quality?: number;
  }): Promise<ArrayBuffer>;
  export = convert;
}
