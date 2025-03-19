export default removeBackground;
export { removeBackground, removeForeground, segmentForeground, applySegmentationMask };
export type { Config, ImageSource };
import { Config } from './schema';
import { ImageSource } from './utils';
/**
 * Removes the background from an image.
 *
 * @param image - The image to remove the background from.
 * @param configuration - Optional configuration for the background removal process.
 * @returns A Promise that resolves to the resulting image with the background removed.
 */
declare function removeBackground(image: ImageSource, configuration?: Config): Promise<Blob>;
/**
 * Removes the foreground from an image.
 *
 * @param image - The image to remove the foreground from.
 * @param configuration - Optional configuration for the foreground removal process.
 * @returns A Promise that resolves to the resulting image with the foreground removed.
 */
declare function removeForeground(image: ImageSource, configuration?: Config): Promise<Blob>;
/**
 * Segments the foreground of an image using a given configuration.
 *
 * @param image - The image source to segment.
 * @param configuration - The optional configuration for the segmentation.
 * @returns A Promise that resolves to the segmented foreground as a Blob.
 */
declare function segmentForeground(image: ImageSource, configuration?: Config): Promise<Blob>;
declare function applySegmentationMask(image: any, mask: any, config?: Config): Promise<Blob>;
//# sourceMappingURL=index.d.ts.map