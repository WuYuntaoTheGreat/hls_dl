import { writeFileSync, mkdirSync, existsSync, rmSync, copyFileSync } from "node:fs";
import path from "node:path";
import { parseOptions } from "./arguments.js";
import { readFile } from "node:fs/promises";
import clipboard from "clipboardy";
import { Downloader } from "./downloader.js";
import { HLSParser } from "./hls_parser.js";

const WORKING_DIR = ".hls_dl";
const CONTENT_DIR = path.join(WORKING_DIR, 'contents');
const SCRIPT_PATH = path.join(WORKING_DIR, 'download.sh');

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
  const masterParser = new HLSParser(masterDownloader.outputFilePath, options.bandwidth);
  const mediaDownloader = masterDownloader.clone().setTargetFilename('media.m3u8');

  if (masterParser.isMaster) {
    // Process media playlist
    const media = masterParser.preferMedia!;
    console.log("Preferred media playlist:", media);
    await mediaDownloader.setUrlNameAndQuery(media.uri).download();

    // Process audio playlist if exists
    const audio = masterParser.preferAudio;
    if (audio) {
      console.log("Preferred audio playlist:", audio);
      await masterDownloader.clone().setTargetFilename('audio.m3u8').setUrlNameAndQuery(audio.uri).download();
    }
  } else {
    copyFileSync(masterDownloader.outputFilePath, mediaDownloader.outputFilePath);
  }
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});

