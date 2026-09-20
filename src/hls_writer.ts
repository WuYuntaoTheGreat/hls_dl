import type { Manifest } from "m3u8-parser";
import { HLSParser } from "./hls_parser.js";
import { writeFileSync } from "node:fs";
import { trimOutputFilename } from "./utils.js";
const VIDEO_M3U8 = "video.m3u8";
const AUDIO_M3U8 = "audio.m3u8";

function rawAttrArray(v: any, toUpper = false): string {
  if (!Array.isArray(v)) {
    return rawAttr(v, toUpper);
  } else {
    return v.map((item) => rawAttr(item, toUpper)).join(",");
  }
}

function rawAttr(attrs: any, toUpper = false): string {
  const ret: string[] = [];
  Object.entries(attrs as any).forEach(([k, v]) => {
    if (v === undefined || v === null) {
      return;
    }

    if (k.toLowerCase() === 'resolution' && (v as any).width !== undefined && (v as any).height !== undefined) {
      v = `${(v as any).width}x${(v as any).height}`;
    } else if (k.toLowerCase() === 'byterange' && (v as any).length !== undefined && (v as any).offset !== undefined) {
      v = `${(v as any).length}@${(v as any).offset}`;
    } else if (k.toLowerCase() === 'uri' && typeof v === 'string') {
      v = trimOutputFilename(v);
    } else if (typeof v === 'boolean') {
      v = v ? 'YES' : 'NO';
    }
    if (toUpper) {
      k = k.toUpperCase();
    }
    ret.push(`${k}="${v}"`);
  });
  return ret.join(",");
}

function linesPush(lines: string[], fn: (x: any) => string, value: any): void {
  if (value === undefined) {
    return;
  }
  if (Array.isArray(value) && value.length === 0) {
    return;
  }

  lines.push(fn(value));
}

function warnUnimp(tag: string, value: any): void {
  if (value === undefined) {
    return;
  }
  if (Array.isArray(value) && value.length === 0) {
    return;
  }

  console.warn(`Tag ${tag} is not supported and will be ignored in output m3u8`);
}

export class HLSWriter {
  private manifest: Manifest;
  constructor(private readonly parser: HLSParser, private readonly targetPath: string) {
    this.manifest = parser.cloneManifest();
  }

  createPlaylists(lines: string[]) {
    const preferMedia = this.parser.preferMedia;
    if (!preferMedia) {
      return;
    }
    lines.push(`#EXT-X-STREAM-INF:${rawAttr(preferMedia.attributes)}`);
    lines.push(VIDEO_M3U8);
  }

  createMediaGroups(lines: string[]) {
    if (!this.manifest.mediaGroups) {
      return;
    }
    Object.entries(this.manifest.mediaGroups).forEach(([groupType, groupMap]) => {
      Object.entries(groupMap).forEach(([groupId, groupItems]) => {
        Object.entries(groupItems).forEach(([itemName, item]) => {
          if (groupType !== 'AUDIO' || this.parser.preferAudio?.uri !== item.uri) {
            return;
          }
          item.uri = AUDIO_M3U8;
          lines.push(`#EXT-X-MEDIA:TYPE=${groupType.toUpperCase()},GROUP-ID="${groupId}",NAME="${itemName}",${rawAttr(item, true)}`);
        });
      });
    });
  }

  createSegments(lines: string[]) {
    if (!this.manifest.segments) {
      return;
    }
    let lastKey: any | undefined;
    let lastMap: any | undefined;

    for (let index = 0; index < this.manifest.segments.length; index++) {
      const segment = this.manifest.segments[index]!;

      if (segment.key) {
        if (!lastKey || lastKey.uri !== segment.key.uri) {
          lines.push(`#EXT-X-KEY:${rawAttr(segment.key, true)}`);
        }
        lastKey = segment.key;
      }

      if (segment.map) {
        if (!lastMap || lastMap.uri !== segment.map.uri) {
          lines.push(`#EXT-X-MAP:${rawAttr(segment.map, true)}`);
        }
        lastMap = segment.map;
      }

      linesPush(lines, (v) => `#EXT-X-BYTERANGE:${rawAttr(v)}`,              segment.byterange);
      linesPush(lines, (v) => `#EXT-X-PROGRAM-DATE-TIME:${v.toISOString()}`, segment.dateTimeObject);
      linesPush(lines, (v) => `#EXT-X-CUE-OUT:${v}`,                         segment.cueOut);
      linesPush(lines, (v) => `#EXT-X-CUE-OUT-CONT:${v}`,                    segment.cueOutCont);
      linesPush(lines, (v) => `#EXT-X-CUE-IN`,                               segment.cueIn);
      linesPush(lines, (v) => `#EXT-X-DISCONTINUITY`,                        segment.discontinuity ? true : undefined);

      lines.push(`#EXTINF:${segment.duration},${segment.title || ''}`);
      lines.push(trimOutputFilename(segment.uri)!);

      warnUnimp("#EXT-X-PART", segment.parts);
      warnUnimp("#EXT-X-PRELOAD-HINT", segment.preloadHints);

      // timeline?: number; <WTF?>
      // attributes?: RawAttributes; <Should be calculated from other fields in segment>
    }
  }

  createContent(lines: string[]) {
    lines.push("#EXTM3U");
    lines.push(`#EXT-X-VERSION:${this.manifest.version || 3}`);
    linesPush(lines, (v) => `#EXT-X-MEDIA-SEQUENCE:${v}`,                  this.manifest.mediaSequence);
    linesPush(lines, (v) => `#EXT-X-TARGETDURATION:${Math.ceil(v)}`,       this.manifest.targetDuration);
    linesPush(lines, (v) => `#EXT-X-PLAYLIST-TYPE:${v}`,                   this.manifest.playlistType);
    linesPush(lines, (v) => `#EXT-X-ALLOW-CACHE:${v ? 'YES' : 'NO'}`,      this.manifest.allowCache);
    linesPush(lines, (v) => `#EXT-X-DISCONTIUTY-SEQUENCE:${v}`,            this.manifest.discontinuitySequence);
    linesPush(lines, (v) => `#EXT-X-DATERANGE:${rawAttrArray(v)}`,         this.manifest.dateRanges);
    linesPush(lines, (v) => `#EXT-X-START:${rawAttr(v)}`,                  this.manifest.start);
    linesPush(lines, (v) => `#EXT-X-PROGRAM-DATE-TIME:${v}`,               this.manifest.dateTimeString);
    linesPush(lines, (v) => `#EXT-X-SKIP:${rawAttr(v)}`,                   this.manifest.skip);
    linesPush(lines, (v) => `#EXT-X-SERVER-CONTROL:${rawAttr(v)}`,         this.manifest.serverControl);
    linesPush(lines, (v) => `#EXT-X-RENDITION-REPORTS:${rawAttrArray(v)}`, this.manifest.renditionReports);
    linesPush(lines, (v) => `#EXT-X-PART-INF:${rawAttrArray(v)}`,          this.manifest.partInf);
    linesPush(lines, (v) => `#EXT-X-PART-TARGET-DURATION:${v}`,            this.manifest.partTargetDuration);
    linesPush(lines, (_) => `#EXT-X-INDEPENDENT-SEGMENTS`,                 this.manifest.independentSegments ? true : undefined);
    this.createPlaylists(lines);
    this.createMediaGroups(lines);

    this.createSegments(lines);
    linesPush(lines, (_) => `#EXT-X-ENDLIST`,                              this.manifest.endList ? true : undefined);

    warnUnimp("#EXT-X-CONTENT-PROTECTION",  this.manifest.contentProtection);
    warnUnimp("#EXT-X-DEFINITIONS",         this.manifest.definitions);
    warnUnimp("#EXT-X-I-FRAME-STREAM-INF",  this.manifest.iFramePlaylists);
    warnUnimp("#EXT-X-PRELOAD-SEGMENT",     this.manifest.preloadSegment);

    // custom?: unknown <Ignored!>;
    // dateTimeObject?: Date; <Should be calculated from dateTimeString>
    // totalDuration?: number; <Calculated from segments>
  }

  write() {
    const lines: string[] = [];
    this.createContent(lines);
    writeFileSync(this.targetPath, lines.join("\n"), "utf-8");
  }
}