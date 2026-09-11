import { spawn } from "node:child_process";
import { Downloader, type DownloaderParams } from "./CommonDownloader.js";

export default class CurlDownloader extends Downloader {
  clone(): Downloader {
    return new CurlDownloader(this._script).copyPropertiesFrom(this);
  }

  doDownload(params: DownloaderParams): Promise<void> {
    return new Promise((resolve, reject) => {
      const curlArgs = [
        '-L', // Follow redirects
        '-o', params.outputPath, // Output file
        ...Object.entries(params.headers).flatMap(([key, value]) => ['-H', `${key}: ${value}`]), // Headers
        // TODO: use '--url' instead of directly passing the URL in higher versions of curl
        params.url // URL to download
      ];
      const curl = spawn('curl', curlArgs);
      curl.on('close', (code: number) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`curl exited with code ${code}`));
        }
      });
    });
  }
}
