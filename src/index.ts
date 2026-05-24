import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { parseOptions } from "./arguments.js";
import { readFile } from "node:fs/promises";
import clipboard from "clipboardy";
import { Downloader, WORKING_DIR } from "./downloader.js";

export const DOWNLOAD_SCRIPT = path.join(WORKING_DIR, 'download.sh');

async function main() {
  // Parse command-line options
  const options = parseOptions();
  // console.log("Options:", options);

  // Read m3u8 script from clipboard or file
  let m3u8Script = "";
  if (options.source === "clipboard") {
    m3u8Script = await clipboard.read();
  } else {
    m3u8Script = await readFile(options.scriptFile!, "utf-8");
  }
  // console.log("m3u8Script:", m3u8Script);

  // Download master m3u8 file
  const downloader = new Downloader(m3u8Script);

  // Create working directory and save m3u8 script to working directory
  mkdirSync(WORKING_DIR, { recursive: true });
  writeFileSync(DOWNLOAD_SCRIPT, m3u8Script, { encoding: "utf-8" });

  // Download master m3u8 file
  downloader.targetFilename = 'master.m3u8';
  await downloader.download();
  console.log('Master m3u8 file downloaded successfully.');
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});

