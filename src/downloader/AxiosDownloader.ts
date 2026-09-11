import fs from "fs";
import axios, { type AxiosProxyConfig } from "axios";
import { Downloader, type DownloaderParams } from "./CommonDownloader.js";

export default class AxiosDownloader extends Downloader {
  clone(): Downloader {
    return new AxiosDownloader(this._script).copyPropertiesFrom(this);
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

  async doDownload(params: DownloaderParams): Promise<void> {
    const { url, outputPath, headers } = params;

    // Get proxy configuration from environment variables
    const proxy = this.getProxyConfig();

    if (this._verbose) {
      console.log("Using proxy:", proxy);
      console.log("Using headers:", headers);
    }

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
