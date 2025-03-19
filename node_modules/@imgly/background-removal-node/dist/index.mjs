// src/index.ts
import lodash from "lodash";
import ndarray5 from "ndarray";

// src/codecs.ts
import sharp from "sharp";
import ndarray from "ndarray";
async function imageDecode(blob) {
  const buffer = await blob.arrayBuffer();
  const mime = MimeType.fromString(blob.type);
  switch (mime.type) {
    case "image/x-alpha8": {
      const width = parseInt(mime.params["width"]);
      const height = parseInt(mime.params["height"]);
      return ndarray(new Uint8Array(await blob.arrayBuffer()), [
        height,
        width,
        1
      ]);
    }
    case "image/x-rgba8": {
      const width = parseInt(mime.params["width"]);
      const height = parseInt(mime.params["height"]);
      return ndarray(new Uint8Array(await blob.arrayBuffer()), [
        height,
        width,
        4
      ]);
    }
    case "application/octet-stream":
    case `image/png`:
    case `image/jpeg`:
    case `image/webp`: {
      const decoded = sharp(buffer);
      let { width, height, channels } = await decoded.metadata();
      if (channels === 3) {
        decoded.ensureAlpha();
        channels = 4;
      }
      const outBuffer = await decoded.raw().toBuffer();
      const array = ndarray(outBuffer, [height, width, channels]);
      await sharp(array.data, {
        raw: { width, height, channels }
      });
      return array;
    }
    default:
      throw new Error(`Unsupported format: ${mime.type}`);
  }
}
async function imageEncode(imageTensor, quality = 0.8, type = "image/png") {
  const [height, width, channels] = imageTensor.shape;
  if (channels !== 4)
    throw new Error("Only 4-channel images are supported");
  const image = sharp(imageTensor.data, { raw: { height, width, channels } });
  switch (type) {
    case "image/x-alpha8":
    case "image/x-rgba8": {
      const mime = MimeType.create(type, {
        width: width.toString(),
        height: height.toString()
      });
      return new Blob([imageTensor.data], { type: mime.toString() });
    }
    case `image/png`:
    case `image/jpeg`:
    case `image/webp`:
      const format = type.split("/").pop();
      const buffer = await image.toFormat(format, { quality: quality * 100 }).toBuffer();
      return new Blob([buffer], { type });
    default:
      throw new Error(`Invalid format: ${format}`);
  }
}
var MimeType = class _MimeType {
  type = "application/octet-stream";
  params = {};
  constructor(type, params) {
    this.type = type;
    this.params = params;
  }
  toString() {
    const paramsStr = [];
    for (const key in this.params) {
      const value = this.params[key];
      paramsStr.push(`${key}=${value}`);
    }
    return [this.type, ...paramsStr].join(";");
  }
  static create(type, params) {
    return new _MimeType(type, params);
  }
  isIdentical(other) {
    return this.type === other.type && this.params === other.params;
  }
  isEqual(other) {
    return this.type === other.type;
  }
  static fromString(mimeType) {
    const [type, ...paramsArr] = mimeType.split(";");
    const params = {};
    for (const param of paramsArr) {
      const [key, value] = param.split("=");
      params[key.trim()] = value.trim();
    }
    return new _MimeType(type, params);
  }
};

// src/url.ts
function isAbsoluteURI(url) {
  const regExp = new RegExp("^(?:[a-z+]+:)?//", "i");
  return regExp.test(url);
}
function ensureAbsoluteURI(url, baseUrl) {
  if (isAbsoluteURI(url)) {
    return new URL(url);
  } else {
    return new URL(url, baseUrl);
  }
}

// src/resource.ts
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
async function loadFromURI(uri, config = { headers: { "Content-Type": "application/octet-stream" } }) {
  switch (uri.protocol) {
    case "http:":
      return await fetch(uri);
    case "https:":
      return await fetch(uri);
    case "file:": {
      const buffer = await readFile(fileURLToPath(uri));
      return new Response(buffer, { status: 200, headers: config.headers });
    }
    default:
      throw new Error(`Unsupported protocol: ${uri.protocol}`);
  }
}
async function loadAsBlob(key, config) {
  const resourceUri = ensureAbsoluteURI("./resources.json", config.publicPath);
  const resourceResponse = await loadFromURI(resourceUri);
  if (!resourceResponse.ok) {
    throw new Error(
      `Resource metadata not found. Ensure that the config.publicPath is configured correctly.`
    );
  }
  const resourceMap = await resourceResponse.json();
  const entry = resourceMap[key];
  if (!entry) {
    throw new Error(
      `Resource ${key} not found. Ensure that the config.publicPath is configured correctly.`
    );
  }
  const chunks = entry.chunks;
  let downloadedSize = 0;
  const responses = chunks.map(async (chunk) => {
    const url = ensureAbsoluteURI(chunk.hash, config.publicPath);
    const chunkSize = chunk.offsets[1] - chunk.offsets[0];
    const response = await loadFromURI(url, {
      headers: { "Content-Type": entry.mime }
    });
    const blob = await response.blob();
    if (chunkSize !== blob.size) {
      throw new Error(
        `Failed to fetch ${key} with size ${chunkSize} but got ${blob.size}`
      );
    }
    if (config.progress) {
      downloadedSize += chunkSize;
      config.progress(`fetch:${key}`, downloadedSize, entry.size);
    }
    return blob;
  });
  const allChunkData = await Promise.all(responses);
  const data = new Blob(allChunkData, { type: entry.mime });
  if (data.size !== entry.size) {
    throw new Error(
      `Failed to fetch ${key} with size ${entry.size} but got ${data.size}`
    );
  }
  return data;
}

// src/utils.ts
import ndarray2 from "ndarray";
function tensorResizeBilinear(imageTensor, newWidth, newHeight) {
  const [srcHeight, srcWidth, srcChannels] = imageTensor.shape;
  const scaleX = srcWidth / newWidth;
  const scaleY = srcHeight / newHeight;
  const resizedImageData = ndarray2(
    new Uint8Array(srcChannels * newWidth * newHeight),
    [newHeight, newWidth, srcChannels]
  );
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = x * scaleX;
      const srcY = y * scaleY;
      const x1 = Math.max(Math.floor(srcX), 0);
      const x2 = Math.min(Math.ceil(srcX), srcWidth - 1);
      const y1 = Math.max(Math.floor(srcY), 0);
      const y2 = Math.min(Math.ceil(srcY), srcHeight - 1);
      const dx = srcX - x1;
      const dy = srcY - y1;
      for (let c = 0; c < srcChannels; c++) {
        const p1 = imageTensor.get(y1, x1, c);
        const p2 = imageTensor.get(y1, x2, c);
        const p3 = imageTensor.get(y2, x1, c);
        const p4 = imageTensor.get(y2, x2, c);
        const interpolatedValue = (1 - dx) * (1 - dy) * p1 + dx * (1 - dy) * p2 + (1 - dx) * dy * p3 + dx * dy * p4;
        resizedImageData.set(y, x, c, Math.round(interpolatedValue));
      }
    }
  }
  return resizedImageData;
}
function tensorHWCtoBCHW(imageTensor, mean = [128, 128, 128], std = [256, 256, 256]) {
  var imageBufferData = imageTensor.data;
  const [srcHeight, srcWidth, srcChannels] = imageTensor.shape;
  const stride = srcHeight * srcWidth;
  const float32Data = new Float32Array(3 * stride);
  for (let i = 0, j = 0; i < imageBufferData.length; i += 4, j += 1) {
    float32Data[j] = (imageBufferData[i] - mean[0]) / std[0];
    float32Data[j + stride] = (imageBufferData[i + 1] - mean[1]) / std[1];
    float32Data[j + stride + stride] = (imageBufferData[i + 2] - mean[2]) / std[2];
  }
  return ndarray2(float32Data, [1, 3, srcHeight, srcWidth]);
}
async function imageSourceToImageData(image, _) {
  if (typeof image === "string") {
    image = ensureAbsoluteURI(image, `file://${process.cwd()}/`);
  }
  if (image instanceof URL) {
    image = await (await loadFromURI(image)).blob();
  }
  if (image instanceof ArrayBuffer || ArrayBuffer.isView(image)) {
    image = new Blob([image]);
  }
  if (image instanceof Blob) {
    image = await imageDecode(image);
  }
  return image;
}
function convertFloat32ToUint8(float32Array) {
  const uint8Array = new Uint8Array(float32Array.data.length);
  for (let i = 0; i < float32Array.data.length; i++) {
    uint8Array[i] = float32Array.data[i] * 255;
  }
  return ndarray2(uint8Array, float32Array.shape);
}

// src/onnx.ts
import ndarray3 from "ndarray";
import * as ort from "onnxruntime-node";
async function createOnnxSession(model, config) {
  if (config.debug) {
    ort.env.debug = true;
    ort.env.logLevel = "verbose";
    console.debug("ort.env.wasm:", ort.env.wasm);
  }
  const ort_config = {
    graphOptimizationLevel: "all",
    executionMode: "parallel"
  };
  const session = await ort.InferenceSession.create(model, ort_config).catch(
    (e) => {
      throw new Error(
        `Failed to create session: ${e}. Please check if the publicPath is set correctly.`
      );
    }
  );
  return session;
}
async function runOnnxSession(session, inputs, outputs) {
  const feeds = {};
  for (const [key, tensor] of inputs) {
    feeds[key] = new ort.Tensor(
      "float32",
      new Float32Array(tensor.data),
      tensor.shape
    );
  }
  const outputData = await session.run(feeds, {});
  const outputKVPairs = [];
  for (const key of outputs) {
    const output = outputData[key];
    const shape = output.dims;
    const data = output.data;
    const tensor = ndarray3(data, shape);
    outputKVPairs.push(tensor);
  }
  return outputKVPairs;
}

// src/schema.ts
import { z } from "zod";
import path from "node:path";

// package.json
var package_default = {
  name: "@imgly/background-removal-node",
  version: "1.4.5",
  description: "Background Removal in NodeJS",
  resources: "@imgly/background-removal-node",
  keywords: [
    "background-removal",
    "nodejs",
    "image-segmentation",
    "image-matting",
    "onnx"
  ],
  repository: {
    type: "git",
    url: "git+https://github.com/imgly/background-removal-js.git"
  },
  license: "SEE LICENSE IN LICENSE.md",
  author: {
    name: "IMG.LY GmbH",
    email: "support@img.ly",
    url: "https://img.ly"
  },
  bugs: {
    email: "support@img.ly"
  },
  homepage: "https://img.ly/showcases/cesdk/web/background-removal",
  source: "./src/index.ts",
  main: "./dist/index.cjs",
  module: "./dist/index.mjs",
  types: "./dist/index.d.ts",
  exports: {
    ".": {
      require: "./dist/index.cjs",
      import: "./dist/index.mjs",
      types: "./dist/index.d.ts"
    }
  },
  files: [
    "LICENSE.md",
    "README.md",
    "CHANGELOG.md",
    "ThirdPartyLicenses.json",
    "dist/",
    "bin/"
  ],
  scripts: {
    start: "npm run watch",
    clean: "npx rimraf dist",
    test: "true",
    resources: "node ../../scripts/package-resources.mjs",
    "changelog:create": "node ../../scripts/changelog/changelog-create.mjs",
    "changelog:generate": "node ../../scripts/changelog/changelog-generate.mjs",
    build: "npm run clean && npm run resources && npm run types && npm run changelog:generate && node scripts/build.mjs",
    types: " npx tsc --declaration --emitDeclarationOnly --declarationDir dist --declarationMap",
    watch: "npm run clean && npm run resources && npm run changelog:generate && node scripts/watch.mjs",
    lint: "npx prettier --write .",
    "publish:latest": "npm run build && npm publish --tag latest --access public",
    "publish:next": "npm run build && npm publish --tag next --access public",
    "package:pack": "npm run build && npm pack . --pack-destination ../../releases"
  },
  dependencies: {
    "onnxruntime-node": "~1.17.0",
    sharp: "~0.32.4",
    "@types/lodash": "~4.14.195",
    "@types/node": "~20.3.1",
    "@types/ndarray": "~1.0.14",
    lodash: "~4.17.21",
    ndarray: "~1.0.19",
    zod: "~3.21.4"
  },
  devDependencies: {
    assert: "~2.0.0",
    esbuild: "~0.18.18",
    "npm-dts": "~1.3.12",
    "os-browserify": "~0.3.0",
    "path-browserify": "~1.0.1",
    process: "~0.11.10",
    "stream-browserify": "~3.0.0",
    "ts-loader": "~9.4.3",
    tslib: "~2.5.3",
    typescript: "~5.1.6",
    util: "~0.12.5",
    webpack: "~5.85.1",
    "webpack-cli": "~5.1.4"
  }
};

// src/schema.ts
function isURI(s) {
  try {
    new URL(s);
    return true;
  } catch (err) {
    return false;
  }
}
var ConfigSchema = z.object({
  publicPath: z.string().optional().describe("The public path to the wasm files and the onnx model.").default(`file://${path.resolve(`node_modules/${package_default.name}/dist/`)}/`).transform((val) => {
    return val.replace("${PACKAGE_NAME}", package_default.name).replace("${PACKAGE_VERSION}", package_default.version);
  }).refine((val) => isURI(val), {
    message: "String must be a valid uri"
  }),
  debug: z.boolean().default(false).describe("Whether to enable debug logging."),
  proxyToWorker: z.boolean().default(true).describe("Whether to proxy inference to a web worker."),
  fetchArgs: z.any({}).default({}).describe("Arguments to pass to fetch when loading the model."),
  progress: z.function().args(z.string(), z.number(), z.number()).returns(z.void()).describe("Progress callback.").optional(),
  model: z.enum(["small", "medium", "large"]).default("medium"),
  output: z.object({
    format: z.enum([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/x-rgba8",
      "image/x-alpha8"
    ]).default("image/png"),
    quality: z.number().default(0.8)
  }).default({})
}).default({});
function validateConfig(configuration) {
  const config = ConfigSchema.parse(configuration ?? {});
  if (config.debug)
    console.log("Config:", config);
  if (config.debug && !config.progress) {
    config.progress = config.progress ?? ((key, current, total) => {
      console.debug(`Downloading ${key}: ${current} of ${total}`);
    });
  }
  return config;
}

// src/inference.ts
import ndarray4 from "ndarray";
async function initInference(config) {
  config = validateConfig(config);
  if (config.debug)
    console.debug("Loading model...");
  const model = config.model;
  const blob = await loadAsBlob(`/models/${model}`, config);
  const arrayBuffer = await blob.arrayBuffer();
  const session = await createOnnxSession(arrayBuffer, config);
  return { config, session };
}
async function runInference(imageTensor, config, session) {
  if (config.progress)
    config.progress("compute:inference", 0, 1);
  const resolution = 1024;
  const [srcHeight, srcWidth, srcChannels] = imageTensor.shape;
  let tensorImage = tensorResizeBilinear(imageTensor, resolution, resolution);
  const inputTensor = tensorHWCtoBCHW(tensorImage);
  const predictionsDict = await runOnnxSession(
    session,
    [["input", inputTensor]],
    ["output"]
  );
  let alphamask = ndarray4(predictionsDict[0].data, [resolution, resolution, 1]);
  let alphamaskU8 = convertFloat32ToUint8(alphamask);
  alphamaskU8 = tensorResizeBilinear(alphamaskU8, srcWidth, srcHeight);
  if (config.progress)
    config.progress("compute:inference", 1, 1);
  return alphamaskU8;
}

// src/index.ts
var src_default = removeBackground;
var { memoize } = lodash;
var init = memoize(initInference, (config) => JSON.stringify(config));
async function removeBackground(image, configuration) {
  const { config, session } = await init(configuration);
  const imageTensor = await imageSourceToImageData(image, config);
  const [width, height, channels] = imageTensor.shape;
  const alphamask = await runInference(imageTensor, config, session);
  const stride = width * height;
  const outImageTensor = imageTensor;
  for (let i = 0; i < stride; i += 1) {
    outImageTensor.data[4 * i + 3] = alphamask.data[i];
  }
  const outImage = await imageEncode(
    outImageTensor,
    config.output.quality,
    config.output.format
  );
  return outImage;
}
async function removeForeground(image, configuration) {
  const { config, session } = await init(configuration);
  const imageTensor = await imageSourceToImageData(image, config);
  const [width, height, channels] = imageTensor.shape;
  const alphamask = await runInference(imageTensor, config, session);
  const stride = width * height;
  const outImageTensor = imageTensor;
  for (let i = 0; i < stride; i += 1) {
    outImageTensor.data[4 * i + 3] = 255 - alphamask.data[i];
  }
  const outImage = await imageEncode(
    outImageTensor,
    config.output.quality,
    config.output.format
  );
  return outImage;
}
async function segmentForeground(image, configuration) {
  const { config, session } = await init(configuration);
  const imageTensor = await imageSourceToImageData(image, config);
  const [height, width, channels] = imageTensor.shape;
  const alphamask = await runInference(imageTensor, config, session);
  const stride = width * height;
  if (config.output.format === "image/x-alpha8") {
    const outImage = await imageEncode(
      alphamask,
      config.output.quality,
      config.output.format
    );
    return outImage;
  } else {
    const outImageTensor = ndarray5(new Uint8Array(channels * stride), [
      height,
      width,
      channels
    ]);
    for (let i = 0; i < stride; i += 1) {
      const index = 4 * i + 3;
      outImageTensor.data[index] = alphamask.data[i];
      outImageTensor.data[index + 1] = alphamask.data[i];
      outImageTensor.data[index + 2] = alphamask.data[i];
      outImageTensor.data[index + 3] = 255;
    }
    const outImage = await imageEncode(
      outImageTensor,
      config.output.quality,
      config.output.format
    );
    return outImage;
  }
}
async function applySegmentationMask(image, mask, config) {
  config = validateConfig(config);
  const imageTensor = await imageSourceToImageData(image, config);
  const [imageHeight, imageWidth, imageChannels] = imageTensor.shape;
  const maskTensor = await imageSourceToImageData(mask, config);
  const [maskHeight, maskWidth, maskChannels] = maskTensor.shape;
  const alphaMask = maskHeight !== imageHeight || maskWidth !== imageWidth ? tensorResizeBilinear(maskTensor, imageWidth, imageHeight) : maskTensor;
  const stride = imageWidth * imageHeight;
  for (let i = 0; i < stride; i += 1) {
    const idxImage = imageChannels * i;
    const idxMask = maskChannels * i;
    imageTensor.data[idxImage + 3] = alphaMask.data[idxMask];
  }
  const outImage = await imageEncode(
    imageTensor,
    config.output.quality,
    config.output.format
  );
  return outImage;
}
export {
  applySegmentationMask,
  src_default as default,
  removeBackground,
  removeForeground,
  segmentForeground
};
//# sourceMappingURL=index.mjs.map
