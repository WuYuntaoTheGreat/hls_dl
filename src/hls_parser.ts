import { readFileSync, writeFileSync } from "node:fs";
import m3u8Parser, { type Manifest, type PlaylistItem, type Segment } from "m3u8-parser";

export class HLSParser {
  private readonly _manifest: Manifest;
  private _preferBandwidth: "l" | "h" = "h";

  private constructor(manifest: Manifest) {
    this._manifest = manifest;
  }

  static fromPath(m3u8Path: string): HLSParser {
    const m3u8Content = readFileSync(m3u8Path, "utf-8");
    return HLSParser.fromContent(m3u8Content);
  }

  static fromContent(m3u8Content: string): HLSParser {
    const parser = new m3u8Parser.Parser();
    parser.push(m3u8Content);
    parser.end();
    return new HLSParser(parser.manifest);
  }

  static fromManifest(manifest: Manifest): HLSParser {
    return new HLSParser(manifest);
  }

  setPreferBandwidth(bandwidth: "l" | "h"): HLSParser {
    this._preferBandwidth = bandwidth;
    return this;
  }

  cloneManifest(): Manifest {
    return JSON.parse(JSON.stringify(this._manifest));
  }

  get playlists(): PlaylistItem[] {
    return this._manifest.playlists || [];
  }

  get segments(): Segment[] {
    return this._manifest.segments || [];
  }

  get isMaster(): boolean {
    return this.playlists.length > 0;
  }

  get preferMedia(): PlaylistItem | undefined {
    return (this._manifest.playlists || []).reduce((prev: PlaylistItem | undefined, item: PlaylistItem) => {
      const itemBw = item.attributes?.BANDWIDTH; 
      const prevBw = prev?.attributes?.BANDWIDTH;
      if (itemBw === undefined) {
        return prev;
      } else if (prevBw === undefined) {
        return item;
      } else if (this._preferBandwidth === "l" && itemBw <= prevBw){
        return item;
      } else if (this._preferBandwidth === "h" && itemBw >= prevBw) {
        return item;
      } else {
        return prev;
      } 
    }, undefined)
  }

  get preferAudio(): any | undefined {
    const audioId = this.preferMedia?.attributes?.AUDIO;
    return this._manifest.mediaGroups?.getItem('AUDIO')?.getItem(audioId)?.getFirstItem();
  }

  writeToFile(path: string): void {
  }
}
