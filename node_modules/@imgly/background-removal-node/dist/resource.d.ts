export { loadAsBlob, loadAsUrl, loadFromURI };
import { Config } from './schema';
declare function loadAsUrl(url: string, config: Config): Promise<string>;
declare function loadFromURI(uri: URL, config?: {
    headers: {
        'Content-Type': string;
    };
}): Promise<Response>;
declare function loadAsBlob(key: string, config: Config): Promise<Blob>;
//# sourceMappingURL=resource.d.ts.map