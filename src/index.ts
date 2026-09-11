import "./utils.js";
import { writeFileSync, mkdirSync, existsSync, rmSync, copyFileSync } from "node:fs";
import path from "node:path";
import { parseOptions, type Options } from "./arguments.js";
import { readFile } from "node:fs/promises";
import clipboard from "clipboardy";
import { Downloader } from "./downloader/CommonDownloader.js";
import { HLSParser } from "./hls_parser.js";
import { HLSWriter } from "./hls_writer.js";
import { convert } from "./converter.js";
import { promptToDo } from "./utils.js";
import AxiosDownloader from "./downloader/AxiosDownloader.js";
import CurlDownloader from "./downloader/CurlDownloader.js";

const WORKING_DIR = ".hls_dl";
const CONTENT_DIR = path.join(WORKING_DIR, 'contents');
const SCRIPT_PATH = path.join(WORKING_DIR, 'download.sh');
const CONVERT_OUTPUT= 'out.mp4';

async function processMedia(downloader: Downloader, threads: number): Promise<void> {
  const mediaParser = HLSParser.fromPath(downloader.outputFilePath);
  const keyUris = mediaParser.segments.map((s) => s.key?.uri as string).filter(Boolean).uniq();
  const mapUris = mediaParser.segments.map((s) => s.map?.uri as string).filter(Boolean).uniq();
  const segUris = mediaParser.segments.map((s) => s.uri as string).filter(Boolean);

  console.log('    Downloading media segments...');
  const mediaDownloader = downloader.clone().setOutputDir(CONTENT_DIR).setTargetFilename(undefined);

  const uris = [...keyUris, ...mapUris, ...segUris];
  let error: Error | null = null;
  const workers: Promise<void>[] = [];

  for (let i = 0; i < threads; i++) {
    workers.push(
      (async () => {
        while (!error) {
          const uri = uris.shift();
          if (!uri) break;
          try {
            await mediaDownloader.clone().setUrlNameAndQuery(uri).download();
          } catch (e) {
            error = e as Error;
          }
        }
      })()
    );
  }

  await Promise.all(workers);
  if (error) throw error;

  console.log('    Rewriting m3u8...');
  await new HLSWriter(mediaParser, path.join(CONTENT_DIR, downloader.targetFilename!)).write();
}

async function processMaster(downloader: Downloader, options: Options): Promise<void> {
  console.log('Processing master playlist...');
  const masterParser = HLSParser.fromPath(downloader.outputFilePath).setPreferBandwidth(options.bandwidth);

  if (masterParser.playlists.length > 0) {
    // Process media playlist
    console.log('  Processing media playlist...');
    const media = masterParser.preferMedia!;
    const mediaDownloader = downloader.clone().setTargetFilename('video.m3u8').setUrlNameAndQuery(media.uri);
    await mediaDownloader.download();
    await processMedia(mediaDownloader, options.threads);

    // Process audio playlist if exists
    const audio = masterParser.preferAudio;
    if (audio) {
      console.log('  Processing audio playlist...');
      const audioDownloader = downloader.clone().setTargetFilename('audio.m3u8').setUrlNameAndQuery(audio.uri);
      await audioDownloader.download();
      await processMedia(audioDownloader, options.threads);
    }
    console.log('  Rewriting master m3u8...');
    new HLSWriter(masterParser, path.join(CONTENT_DIR, 'index.m3u8')).write();
  } else {
    // Process media playlist
    console.log('Processing media playlist...');
    const mediaDownloader = downloader.clone().setTargetFilename('video.m3u8');
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

  // Read m3u8 script from clipboard or file
  const m3u8Script: string = await (async () => {
    if (options.scriptFile) {
      console.log(`Reading m3u8 script from command line: ${options.scriptFile} ...`);
      return await readFile(options.scriptFile, "utf-8");
    } else if (existsSync(SCRIPT_PATH)) {
      console.log(`Reading m3u8 script from working directory: ${WORKING_DIR}  ...`);
      return await readFile(SCRIPT_PATH, "utf-8");
    } else {
      console.log("Reading m3u8 script from clipboard ...");
      return await clipboard.read();
    }
  })();

  if (!m3u8Script) {
    throw new Error("No m3u8 script provided. Please provide a script via command line, clipboard.");
  }

  // Create working directory and save m3u8 script to working directory
  console.log('Saving m3u8 script to working directory...');
  mkdirSync(WORKING_DIR, { recursive: true });
  writeFileSync(SCRIPT_PATH, m3u8Script, { encoding: "utf-8" });

  // Download master m3u8 file
  const masterDownloader = options.curl
    ? new CurlDownloader(m3u8Script)
    : new AxiosDownloader(m3u8Script);
  masterDownloader
    .setOutputDir(WORKING_DIR)
    .setTargetFilename('master.m3u8')
    .setVerbose(options.verbose);
  await masterDownloader.download();

  // Parse master m3u8
  await processMaster(masterDownloader, options);

  // Convert to mp4
  const convertInput = [
    path.join(CONTENT_DIR, 'index.m3u8'),
    path.join(CONTENT_DIR, 'video.m3u8'),
  ].find((p) => existsSync(p));

  console.log('before convert');
  if (convertInput) {
    if (await promptToDo("Do you want to convert the downloaded m3u8 file to mp4 format using ffmpeg? ", true)) {
      convert(convertInput, CONVERT_OUTPUT);
    }
  } else {
    console.warn('m3u8 not found, skipping conversion to mp4');
  }
  console.log('after convert');

  // Clear working directory
  if (await promptToDo("Do you want to clear the downloaded files in working directory? ", true)) {
    rmSync(WORKING_DIR, { recursive: true, force: true });
    console.log('Working directory cleared');
  }

  console.log('Done');
}

main().catch((err) => {
  console.error((err as Error).message);
  console.error((err as Error).stack);
  process.exit(1);
});

