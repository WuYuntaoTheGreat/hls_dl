import { readFileSync } from "node:fs";
import m3u8Parser from "m3u8-parser";

export class HLSParser {
  private readonly _m3u8Content: string;
  private readonly _manifest: any;

  private readonly _preferMedia: any | undefined;

  constructor(m3u8Path: string, preferBandwidth: "l" | "h" = "h") {
    this._m3u8Content = readFileSync(m3u8Path, "utf-8");
    const parser = new m3u8Parser.Parser();
    parser.push(this._m3u8Content);
    parser.end();
    this._manifest = parser.manifest;

    console.log("Parsed m3u8 manifest:", JSON.stringify(this._manifest, null, 2));

    const comparator = { 'l': (a: number, b: number) => a - b, 'h': (a: number, b: number) => b - a }[preferBandwidth];

    this._preferMedia = (this._manifest.playlists as any[]).reduce((prev: any | undefined, item: any) => {
      const itemBw = item.attributes?.BANDWIDTH; 
      const prevBw = prev?.attributes?.BANDWIDTH;
      if (itemBw === undefined) {
        return prev;
      } else if (prevBw === undefined) {
        return item;
      } else if (prevBw === undefined || comparator(itemBw, prevBw) < 0) {
        return item;
      } else {
        return prev;
      } 
    }, undefined)

    // console.log('Preferred media playlist:', this._preferMedia);
  }

  get playlists(): any[] {
    return this._manifest.playlists || [];
  }

  get mediaGroups(): any {
    return this._manifest.mediaGroups || {};
  }

  get isMaster(): boolean {
    return this.playlists?.[0].attributes?.BANDWIDTH !== undefined;
  }

  get preferMedia(): any | undefined {
    return this._preferMedia;
  }

}
