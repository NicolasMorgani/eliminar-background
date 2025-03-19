export { imageEncode, imageDecode, MimeType };
import { NdArray } from 'ndarray';
declare function imageDecode(blob: Blob): Promise<NdArray<Uint8Array>>;
declare function imageEncode(imageTensor: NdArray<Uint8Array>, quality?: number, type?: string): Promise<Blob>;
declare class MimeType {
    type: string;
    params: Record<string, string>;
    private constructor();
    toString(): string;
    static create(type: any, params: Record<string, string>): MimeType;
    isIdentical(other: MimeType): Boolean;
    isEqual(other: MimeType): Boolean;
    static fromString(mimeType: string): MimeType;
}
//# sourceMappingURL=codecs.d.ts.map