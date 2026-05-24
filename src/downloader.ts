import * as fs from 'fs';
import * as path from 'path';
import axios, { type AxiosProxyConfig } from 'axios';
import { existsSync } from 'fs';

export class Downloader {
  private readonly _url: string;
  private readonly _headers: string[];
  private targetFilename: string | undefined;
  private nameAndQuery: string | undefined;

  constructor(private readonly _script: string, private readonly _outputDir: string) {
    // Parse headers.
    const headerMatches = this._script.matchAll(/-H '([^']+)'/g);
    this._headers = [...headerMatches].map((m) => m[1]).filter((h) => h !== undefined);

    // Parse URL.
    const urlMatch = this._script.match(/curl \$?'([^']+)'/);
    if (!urlMatch || urlMatch.length < 2) {
      throw new Error('Invalid cURL script: URL not found');
    }
    this._url = urlMatch[1]!;
  }

  clone(): Downloader {
    return new Downloader(this._script, this._outputDir);
  }

  setTargetFilename(name: string): Downloader {
    this.targetFilename = name;
    return this;
  }

  setUrlNameAndQuery(nameAndQuery: string): Downloader {
    this.nameAndQuery = nameAndQuery;
    return this;
  }

  get headers(): string[] { return this._headers; }

  get downloadUrl(): string {
    const urlHostAndPath = this._url.match(/^.*\//)?.[0];
    if (!urlHostAndPath) {
      throw new Error('Cannot determine URL host and path from script');
    }
    if (this.nameAndQuery !== undefined) {
      return urlHostAndPath + this.nameAndQuery;
    } else {
      return this._url;
    }
  }

  get outputFileName(): string {
    const targetFilename = this.targetFilename || this.nameAndQuery || this._url;
    const outputFilename =targetFilename.match(/[^/?]*(?=\?|$)/)?.[0];
    if (!outputFilename) {
      throw new Error('Cannot determine output filename from URL: ' + targetFilename);
    }
    return outputFilename;
  }

  get outputFilePath(): string {
    return path.join(this._outputDir, this.outputFileName);
  }

  async download(): Promise<void> {
    const url = this.downloadUrl;
    const outputPath = this.outputFilePath;

    console.log("Download URL:", url);
    console.log("Output path:", outputPath);
    if (existsSync(outputPath)) {
      console.log("File already exists, skipping download");
      return;
    }

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
