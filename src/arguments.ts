import { parseArgs } from "node:util";

export interface Options {
  continueJob: boolean;
  source: "clipboard" | "script";
  scriptFile: string | undefined;
  bandwidth: "l" | "h";
  threads: number;
  skipConvert: boolean;
}

export function printHelp(): void {
  console.log(`Usage: npx ts-node src/index.ts [options]

Options:
  -c, --continue          Continue previous unfinished download job
  -l, --clip              Use clipboard as URL source (default: true)
  -s, --script <file>     Use script file as URL source
  -b, --bandwidth <l|h>   Select bandwidth: 'l' (low) or 'h' (high) (default: h)
  -t, --thread <count>    Number of download threads (default: 5)
  -k, --skip-convert      Skip video conversion after download
  -h, --help              Show this help message`);
}

export function parseOptions(): Options {
  const { values } = parseArgs({
    options: {
      continue:       { type: "boolean", short: "c", default: false },
      clip:           { type: "boolean", short: "l", default: true },
      script:         { type: "string",  short: "s" },
      bandwidth:      { type: "string",  short: "b", default: "h" },
      thread:         { type: "string",  short: "t", default: "5" },
      "skip-convert": { type: "boolean", short: "k", default: false },
      help:           { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: false,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const bandwidth = values.bandwidth as string;
  if (bandwidth !== "l" && bandwidth !== "h") {
    throw new Error("Bandwidth must be 'l' (low) or 'h' (high)");
  }

  const threads = parseInt(values.thread as string, 10);
  if (isNaN(threads) || threads < 1) {
    throw new Error("Thread count must be a positive integer");
  }

  let source: "clipboard" | "script" = "clipboard";
  if (values.script) {
    source = "script";
  } else if (values.clip === false && !values.script) {
    // If --clip is explicitly set to false and no script, keep clipboard as default
    // parseArgs boolean default handles this, but we ensure script overrides
  }

  if (values.script) {
    source = "script";
  }

  return {
    continueJob: values.continue as boolean,
    source,
    scriptFile: values.script as string | undefined,
    bandwidth,
    threads,
    skipConvert: values["skip-convert"] as boolean,
  };
}
