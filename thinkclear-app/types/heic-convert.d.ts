// types/heic-convert.d.ts
declare module 'heic-convert' {
  type HeicConvertOptions = {
    buffer: Buffer | ArrayBuffer;
    format: 'JPEG' | 'PNG' | 'HEIF';
    quality?: number;
  };
  function heicConvert(opts: HeicConvertOptions): Promise<ArrayBuffer>;
  export default heicConvert;
}
