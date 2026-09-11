import { parseArgs } from "node:util";

export interface Options {
  clear: boolean;
  curl: boolean;
  scriptFile: string | undefined;
  bandwidth: "l" | "h";
  threads: number;
  verbose: boolean;
}

export function printHelp(): void {
  console.log(`Usage: npx ts-node src/index.ts [options]

Options:
  -c, --clear             Clear previous download job
  -C, --curl              Use cURL for downloading (default: axios)
  -s, --script <file>     Use script file as URL source; if ommitted, URL will be read from clipboard
  -b, --bandwidth <l|h>   Select bandwidth: 'l' (low) or 'h' (high) (default: h)
  -t, --thread <count>    Number of download threads (default: 1)
  -v, --verbose           Enable verbose logging
  -h, --help              Show this help message`);
}

export function parseOptions(): Options {
  const { values } = parseArgs({
    options: {
      clear:          { type: "boolean", short: "c", default: false },
      curl:           { type: "boolean", short: "C", default: false },
      script:         { type: "string",  short: "s" },
      bandwidth:      { type: "string",  short: "b", default: "h" },
      thread:         { type: "string",  short: "t", default: "1" },
      verbose:        { type: "boolean", short: "v", default: false },
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

  return {
    clear: values.clear as boolean,
    curl: values.curl as boolean,
    scriptFile: values.script as string | undefined,
    bandwidth,
    threads,
    verbose: values.verbose as boolean,
  };
}
