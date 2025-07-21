// global.d.ts
declare module 'heic-convert' {
  interface HeicConvertOptions {
    buffer: Buffer | ArrayBuffer;
    format: 'JPEG' | 'PNG' | 'HEIF';
    quality?: number;
  }
  export default function heicConvert(opts: HeicConvertOptions): Promise<ArrayBuffer>;
}
