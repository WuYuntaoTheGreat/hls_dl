import * as fs from 'fs';
import * as path from 'path';
import { existsSync } from 'fs';
import { trimOutputFilename } from '../utils.js';

const IGNORED_HEADERS = ['if-none-match', 'if-modified-since'];

export type DownloaderParams = {
  url: string;
  outputPath: string;
  headers: Record<string, string>;
};

export abstract class Downloader {
  protected readonly _url: string;
  protected readonly _headers: string[];
  protected readonly _cookies: string | undefined;
  protected outputDir: string = '.';
  protected _targetFilename: string | undefined;
  protected nameAndQuery: string | undefined;
  protected _verbose: boolean = false;

  constructor(protected readonly _script: string) {
    // Parse headers.
    const headerMatches = this._script.matchAll(/-H '([^']+)'/g);
    this._headers = [...headerMatches].map((m) => m[1]).filter((h) => h !== undefined);

    // Parse cookies.
    const cookieMatch = this._script.match(/-b '([^']+)'/);
    this._cookies = cookieMatch ? cookieMatch[1] : undefined;

    // Parse URL.
    const urlMatch = this._script.match(/curl\s+(?:--url\s+)?\$?'([^']+)'/);
    if (!urlMatch || urlMatch.length < 2) {
      throw new Error('Invalid cURL script: URL not found');
    }
    this._url = urlMatch[1]!;
  }

  abstract clone(): Downloader;
  protected copyPropertiesFrom(src: Downloader): Downloader {
    this.outputDir        = src.outputDir;
    this._targetFilename  = src._targetFilename;
    this.nameAndQuery     = src.nameAndQuery;
    this._verbose         = src._verbose;
    return this;
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

  setVerbose(verbose: boolean): Downloader {
    this._verbose = verbose;
    return this;
  }

  get targetFilename(): string | undefined { return this._targetFilename; }

  get headers(): string[] { return this._headers; }

  get cookies(): string | undefined { return this._cookies; }

  get downloadUrl(): string {
    if (this.nameAndQuery === undefined) {
      return this._url;
    }

    if (['https://', 'http://'].find((s) => this.nameAndQuery!.startsWith(s))) {
      return this.nameAndQuery!;
    }

    const url = new URL(this._url);
    if (this.nameAndQuery!.startsWith('/')) {
      return url.origin + this.nameAndQuery;
    }

    return new URL(this.nameAndQuery!, url).href;
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

    // // Perform the HTTP GET request to download the file
    // const response = await axios({
    //   method: 'get',
    //   url,
    //   headers,
    //   proxy,
    //   responseType: 'arraybuffer',
    // });

    // // Save the downloaded content to the output file
    // fs.writeFileSync(outputPath, Buffer.from(response.data));
    await this.doDownload({ url, outputPath, headers });
  }

  abstract doDownload(params: DownloaderParams): Promise<void>;
}

