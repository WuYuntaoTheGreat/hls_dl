import { writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { parseOptions } from "./arguments.js";
import { readFile } from "node:fs/promises";
import clipboard from "clipboardy";
import { Downloader, WORKING_DIR } from "./downloader.js";

export const SCRIPT_PATH = path.join(WORKING_DIR, 'download.sh');

async function main() {
  // Parse command-line options
  const options = parseOptions();
  // console.log("Options:", options);

  // Clear previous workspace
  if (options.clear) {
    rmSync(WORKING_DIR, { recursive: true, force: true });
  }

  if (!options.scriptFile) {
    options.scriptFile = SCRIPT_PATH;
  }

  // Read m3u8 script from clipboard or file
  const m3u8Script = existsSync(options.scriptFile)
    ? await readFile(options.scriptFile!, "utf-8")
    : await clipboard.read();
  // console.log("m3u8Script:", m3u8Script);

  // Check m3u8Script syntax
  // Create downloader for master m3u8 file
  const downloader = new Downloader(m3u8Script);

  // Create working directory and save m3u8 script to working directory
  mkdirSync(WORKING_DIR, { recursive: true });
  writeFileSync(SCRIPT_PATH, m3u8Script, { encoding: "utf-8" });

  // Download master m3u8 file
  downloader.targetFilename = 'master.m3u8';
  if (existsSync(downloader.outputFilePath)) {
    console.log("Master m3u8 already exists, skipping download");
  } else {
    await downloader.download();
  }

  // Parse master m3u8
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});

