export { initInference, runInference };
import { Config } from './schema';
import { NdArray } from 'ndarray';
declare function initInference(config?: Config): Promise<{
    config: {
        publicPath?: string;
        debug?: boolean;
        proxyToWorker?: boolean;
        fetchArgs?: any;
        progress?: (args_0: string, args_1: number, args_2: number, ...args_3: unknown[]) => void;
        model?: "small" | "medium" | "large";
        output?: {
            format?: "image/x-alpha8" | "image/x-rgba8" | "image/png" | "image/jpeg" | "image/webp";
            quality?: number;
        };
    };
    session: any;
}>;
declare function runInference(imageTensor: NdArray<Uint8Array>, config: Config, session: any): Promise<NdArray<Uint8Array>>;
//# sourceMappingURL=inference.d.ts.map