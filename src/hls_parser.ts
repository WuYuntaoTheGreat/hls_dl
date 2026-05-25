import { readFileSync } from "node:fs";
import m3u8Parser from "m3u8-parser";

export class HLSParser {
  private readonly _m3u8Content: string;
  private readonly _manifest: any;

  private readonly _preferMedia: any | undefined;

  constructor(m3u8Path: string, private readonly preferBandwidth: "l" | "h" = "h") {
    this._m3u8Content = readFileSync(m3u8Path, "utf-8");
    const parser = new m3u8Parser.Parser();
    parser.push(this._m3u8Content);
    parser.end();
    this._manifest = parser.manifest;

    // console.log("Parsed m3u8 manifest:", JSON.stringify(this._manifest, null, 2));

  }

  get playlists(): any[] {
    return this._manifest.playlists || [];
  }

  get segments(): any[] {
    return this._manifest.segments || [];
  }

  get isMaster(): boolean {
    return this.playlists.length > 0;
  }

  get preferMedia(): any | undefined {
    return (this._manifest.playlists || []).reduce((prev: any | undefined, item: any) => {
      const itemBw = item.attributes?.BANDWIDTH; 
      const prevBw = prev?.attributes?.BANDWIDTH;
      if (itemBw === undefined) {
        return prev;
      } else if (prevBw === undefined) {
        return item;
      } else if (this.preferBandwidth === "l" && itemBw <= prevBw){
        return item;
      } else if (this.preferBandwidth === "h" && itemBw >= prevBw) {
        return item;
      } else {
        return prev;
      } 
    }, undefined)
  }

  get preferAudio(): any | undefined {
    const mediaGroups = this._manifest.mediaGroups;
    const audioId = this.preferMedia?.attributes?.AUDIO;
    return Object.values(mediaGroups?.AUDIO?.[audioId] || {})[0];
  }
}
