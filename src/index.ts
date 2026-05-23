import { parseOptions } from "./arguments.js";

function main() {
  try {
    const options = parseOptions();
    console.log("Options:", options);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}

main();
