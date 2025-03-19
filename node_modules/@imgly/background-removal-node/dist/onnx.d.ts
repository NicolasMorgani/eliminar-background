export { createOnnxSession, runOnnxSession };
import ndarray, { NdArray } from 'ndarray';
import { Config } from './schema';
declare function createOnnxSession(model: any, config: Config): Promise<any>;
declare function runOnnxSession(session: any, inputs: [string, NdArray<Float32Array>][], outputs: [string]): Promise<ndarray.NdArray<Float32Array>[]>;
//# sourceMappingURL=onnx.d.ts.map