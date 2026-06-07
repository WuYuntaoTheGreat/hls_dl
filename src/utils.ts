import { NOMEM } from "node:dns";
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

export async function promptToDo(prompt: string, defVal: boolean): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let asw: string | undefined;
  while (asw === undefined){
    asw = await new Promise<string | undefined>((resolve) => {
      rl.question(prompt + (defVal ? '(Y/n)' : '(y/N)'), (answer: string) => {
        rl.close();
        resolve(answer.trim().toLowerCase());
      });
    });

    if (asw === 'y' || asw === 'yes') {
      return true;
    } else if (asw === 'n' || asw === 'no') {
      return false;
    } else if (asw === '') {
      return defVal;
    }
  }

  throw new Error('promptTodo interrupted!');
}

