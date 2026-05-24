import * as fs from 'fs';
import * as path from 'path';
import axios, { type AxiosProxyConfig } from 'axios';

export const WORKING_DIR = ".hls_dl";
export const CONTENT_DIR = path.join(WORKING_DIR, 'contents');

export class Downloader {
  private readonly _script: string;
  private readonly _url: string;
  private readonly _headers: string[];
  targetFilename: string | undefined;
  filename: string | undefined;

  constructor(script: string) {
    // Save the original script for cloning.
    this._script = script;

    // Parse headers.
    const headerMatches = script.matchAll(/-H '([^']+)'/g);
    this._headers = [...headerMatches].map((m) => m[1]).filter((h) => h !== undefined);

    // Parse URL.
    const urlMatch = script.match(/curl \$?'([^']+)'/);
    if (!urlMatch || urlMatch.length < 2) {
      throw new Error('Invalid cURL script: URL not found');
    }
    this._url = urlMatch[1]!;
  }

  clone(): Downloader {
    return new Downloader(this._script);
  }

  get headers(): string[] { return this._headers; }

  get urlPath(): string {
    const urlObj = new URL(this._url);
    const pathname = urlObj.pathname;
    const lastSlash = pathname.lastIndexOf('/');
    return lastSlash >= 0 ? pathname.slice(0, lastSlash + 1) : '/';
  }

  get urlFilename(): string {
    const urlObj = new URL(this.downloadUrl);
    const pathname = urlObj.pathname;
    const lastSlash = pathname.lastIndexOf('/');
    return lastSlash >= 0 ? pathname.slice(lastSlash + 1) : pathname;
  }

  get downloadUrl(): string {
    if (this.filename !== undefined) {
      return this.urlPath + this.filename;
    } else {
      return this._url;
    }
  }

  get outputFilePath(): string {
    const targetFilename = this.targetFilename || this.filename || this.urlFilename;
    return path.join(CONTENT_DIR, targetFilename);
  }

  async download(): Promise<void> {
    const url = this.downloadUrl;
    const outputPath = this.outputFilePath;

    console.log("Download URL:", url);
    console.log("Output path:", outputPath);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const headers: Record<string, string> = {};
    for (const h of this._headers) {
      const colonIndex = h.indexOf(':');
      if (colonIndex > 0) {
        headers[h.slice(0, colonIndex).trim()] = h.slice(colonIndex + 1).trim();
      }
    }

    const proxyUrl = url.startsWith('https:')
      ? (process.env.HTTPS_PROXY || process.env.https_proxy)
      : (process.env.HTTP_PROXY || process.env.http_proxy);

    let proxy: AxiosProxyConfig | false = false;
    if (proxyUrl) {
      const proxyObj = new URL(proxyUrl);
      const auth = proxyObj.username
          ? { username: proxyObj.username, password: proxyObj.password }
          : undefined;

      proxy = {
        protocol: proxyObj.protocol,
        host: proxyObj.hostname,
        port: parseInt(proxyObj.port, 10),
        ...(auth ? {auth} : {}),
      };
    }

    const response = await axios({
      method: 'get',
      url,
      headers,
      proxy,
      responseType: 'arraybuffer',
    });

    fs.writeFileSync(outputPath, Buffer.from(response.data));
  }
}
