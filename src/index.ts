import "./utils.js";
import { writeFileSync, mkdirSync, existsSync, rmSync, copyFileSync } from "node:fs";
import path from "node:path";
import { parseOptions, type Options } from "./arguments.js";
import { readFile } from "node:fs/promises";
import clipboard from "clipboardy";
import { Downloader } from "./downloader.js";
import { HLSParser } from "./hls_parser.js";

const WORKING_DIR = ".hls_dl";
const CONTENT_DIR = path.join(WORKING_DIR, 'contents');
const SCRIPT_PATH = path.join(WORKING_DIR, 'download.sh');

async function processMedia(downloader: Downloader, threads: number): Promise<void> {
  const mediaParser = new HLSParser(downloader.outputFilePath);
  const keyUris = mediaParser.segments.map((s) => s.key?.uri as string).filter(Boolean).uniq();
  const mapUris = mediaParser.segments.map((s) => s.map?.uri as string).filter(Boolean).uniq();

  console.log("Media segment keys:", keyUris);
  console.log("Media segment maps:", mapUris);
}

async function processMaster(downloader: Downloader, options: Options): Promise<void> {
  const masterParser = new HLSParser(downloader.outputFilePath, options.bandwidth);

  if (masterParser.isMaster) {
    // Process media playlist
    const media = masterParser.preferMedia!;
    console.log("Preferred media playlist:", media);
    const mediaDownloader = downloader.clone().setTargetFilename('media.m3u8').setUrlNameAndQuery(media.uri);
    await mediaDownloader.download();
    await processMedia(mediaDownloader, options.threads);

    // Process audio playlist if exists
    const audio = masterParser.preferAudio;
    if (audio) {
      console.log("Preferred audio playlist:", audio);
      const audioDownloader = downloader.clone().setTargetFilename('audio.m3u8').setUrlNameAndQuery(audio.uri);
      await audioDownloader.download();
      await processMedia(audioDownloader, options.threads);
    }
  } else {
    // Process media playlist
    const mediaDownloader = downloader.clone().setTargetFilename('media.m3u8');
    copyFileSync(downloader.outputFilePath, mediaDownloader.outputFilePath);
    await processMedia(mediaDownloader, options.threads);
  }
}

async function main() {
  // Parse command-line options
  const options = parseOptions();

  // Clear previous workspace
  if (options.clear) {
    rmSync(WORKING_DIR, { recursive: true, force: true });
    process.exit(0);
  }

  if (!options.scriptFile) {
    options.scriptFile = SCRIPT_PATH;
  }

  // Read m3u8 script from clipboard or file
  const m3u8Script = existsSync(options.scriptFile)
    ? await readFile(options.scriptFile!, "utf-8")
    : await clipboard.read();

  // Create working directory and save m3u8 script to working directory
  mkdirSync(WORKING_DIR, { recursive: true });
  writeFileSync(SCRIPT_PATH, m3u8Script, { encoding: "utf-8" });

  // Download master m3u8 file
  const masterDownloader = new Downloader(m3u8Script)
    .setOutputDir(WORKING_DIR)
    .setTargetFilename('master.m3u8');
  await masterDownloader.download();

  // Parse master m3u8
  await processMaster(masterDownloader, options);
}

main().catch((err) => {
  console.error((err as Error).message);
  console.error((err as Error).stack);
  process.exit(1);
});

