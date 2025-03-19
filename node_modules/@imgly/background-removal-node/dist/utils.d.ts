export { imageDecode, imageEncode, tensorResizeBilinear, tensorHWCtoBCHW, calculateProportionalSize, imageSourceToImageData, ImageSource, convertFloat32ToUint8 };
import { Config } from './schema';
import { NdArray } from 'ndarray';
import { imageDecode, imageEncode } from './codecs';
type ImageSource = ArrayBuffer | Uint8Array | Blob | URL | string | NdArray<Uint8Array>;
declare function tensorResizeBilinear(imageTensor: NdArray<Uint8Array>, newWidth: number, newHeight: number): NdArray<Uint8Array>;
declare function tensorHWCtoBCHW(imageTensor: NdArray<Uint8Array>, mean?: number[], std?: number[]): NdArray<Float32Array>;
declare function calculateProportionalSize(originalWidth: number, originalHeight: number, maxWidth: number, maxHeight: number): [number, number];
declare function imageSourceToImageData(image: ImageSource, _: Config): Promise<NdArray<Uint8Array>>;
declare function convertFloat32ToUint8(float32Array: NdArray<Float32Array>): NdArray<Uint8Array>;
//# sourceMappingURL=utils.d.ts.map