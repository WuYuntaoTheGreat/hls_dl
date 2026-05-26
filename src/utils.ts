import * as readline from "node:readline";

declare global {
  interface Array<T> {
    uniq(): T[];
  }

  interface Object {
    getItem<T>(key: PropertyKey | undefined): T | undefined;
    getFirstItem<T>(): T | undefined;
  }
}

Array.prototype.uniq = function<T>(): T[] {
  return [...new Set(this)];
}

Object.prototype.getItem = function<T>(key: PropertyKey | undefined): T | undefined {
  if (key === undefined) {
    return undefined;
  }
  return (this as Record<string, T>)[key as string];
}

Object.prototype.getFirstItem = function<T>(): T | undefined {
  for (const key in this) {
    if (Object.prototype.hasOwnProperty.call(this, key)) {
      return (this as Record<string, T>)[key];
    }
  }
  return undefined;
}

export function trimOutputFilename(targetFilename: string | undefined): string | undefined {
  if (targetFilename === undefined) {
    return undefined;
  }
  const outputFilename = targetFilename.match(/[^/?]*(?=\?|$)/)?.[0];
  return outputFilename;
}

export async function promptToDo(prompt: string, callback: () => void): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer: string) => {
      const normalized = answer.trim().toLowerCase();
      rl.close();

      if (normalized === "y" || normalized === "yes") {
        callback();
      }
      resolve();
    });
  });
}

