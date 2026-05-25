import * as fs from 'fs';
import * as path from 'path';
import axios, { type AxiosProxyConfig } from 'axios';
import { existsSync } from 'fs';
import { trimOutputFilename } from './utils.js';

const IGNORED_HEADERS = ['if-none-match', 'if-modified-since'];

export class Downloader {
  private readonly _url: string;
  private readonly _headers: string[];
  private readonly _cookies: string | undefined;
  private outputDir: string = '.';
  private _targetFilename: string | undefined;
  private nameAndQuery: string | undefined;

  constructor(private readonly _script: string) {
    // Parse headers.
    const headerMatches = this._script.matchAll(/-H '([^']+)'/g);
    this._headers = [...headerMatches].map((m) => m[1]).filter((h) => h !== undefined);

    // Parse cookies.
    const cookieMatch = this._script.match(/-b '([^']+)'/);
    this._cookies = cookieMatch ? cookieMatch[1] : undefined;

    // Parse URL.
    const urlMatch = this._script.match(/curl \$?'([^']+)'/);
    if (!urlMatch || urlMatch.length < 2) {
      throw new Error('Invalid cURL script: URL not found');
    }
    this._url = urlMatch[1]!;
  }

  clone(): Downloader {
    return new Downloader(this._script)
      .setOutputDir(this.outputDir);
  }

  setOutputDir(dir: string): Downloader {
    this.outputDir = dir;
    return this;
  }

  setTargetFilename(name: string | undefined): Downloader {
    this._targetFilename = name;
    return this;
  }

  setUrlNameAndQuery(nameAndQuery: string): Downloader {
    this.nameAndQuery = nameAndQuery;
    return this;
  }

  get targetFilename(): string | undefined { return this._targetFilename; }

  get headers(): string[] { return this._headers; }

  get cookies(): string | undefined { return this._cookies; }

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
    const targetFilename = this._targetFilename || this.nameAndQuery || this._url;
    const outputFilename = trimOutputFilename(targetFilename);
    if (outputFilename === undefined) {
      throw new Error('Cannot determine output filename from URL: ' + targetFilename);
    }
    return outputFilename;
  }

  get outputFilePath(): string {
    return path.join(this.outputDir, this.outputFileName);
  }

  getProxyConfig(): AxiosProxyConfig | false {
    const proxyUrl = this.downloadUrl.startsWith('https:')
      ? (process.env.HTTPS_PROXY || process.env.https_proxy)
      : (process.env.HTTP_PROXY || process.env.http_proxy);

    if (!proxyUrl) {
      return false;
    }

    const proxyObj = new URL(proxyUrl);
    const auth = proxyObj.username
        ? { username: proxyObj.username, password: proxyObj.password }
        : undefined;

    return {
      protocol: proxyObj.protocol,
      host: proxyObj.hostname,
      port: parseInt(proxyObj.port, 10),
      ...(auth ? {auth} : {}),
    };
  }

  async download(): Promise<void> {
    const url = this.downloadUrl;
    const outputPath = this.outputFilePath;

    // Check existence before downloading
    if (existsSync(outputPath)) {
      // console.log(`File '${outputPath}' already exists, skipping download`);
      return;
    }
    console.log("Download URL:", url);
    console.log("Output path:", outputPath);

    // Create output directory if not exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // Prepare headers, excluding ignored ones and adding cookies if present
    const headers = Object.fromEntries(
      this._headers
        .map((h) => {
          const idx = h.indexOf(':');
          return idx > -1 ? [h.slice(0, idx).trim(), h.slice(idx + 1).trim()] : [h.trim(), ''];
        })
        .filter((kv) => kv.length === 2 && kv[0] && kv[1])
        .filter((kv) => !IGNORED_HEADERS.includes(kv[0]!.toLowerCase()))
    );

    // Add cookies to headers if present
    if (this._cookies) {
      headers['Cookie'] = this._cookies;
    }

    // Get proxy configuration from environment variables
    const proxy = this.getProxyConfig();
    // console.log("Using proxy:", proxy);
    // console.log("Using headers:", headers);

    // Perform the HTTP GET request to download the file
    const response = await axios({
      method: 'get',
      url,
      headers,
      proxy,
      responseType: 'arraybuffer',
    });

    // Save the downloaded content to the output file
    fs.writeFileSync(outputPath, Buffer.from(response.data));
  }
}
