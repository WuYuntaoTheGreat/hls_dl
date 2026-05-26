import { execSync } from "child_process";
import * as path from "node:path";
import { existsSync } from "node:fs";

export function convert(inputPath: string, outputPath: string): void {
    const ffmpegName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
    let ffmpegPath: string | null = null;

    // 1. Look for executable 'ffmpeg' (or 'ffmpeg.exe' on Windows) in system PATH
    const pathEnv = process.env.PATH || "";
    const pathDirs = pathEnv.split(path.delimiter);
    for (const dir of pathDirs) {
        const candidate = path.join(dir, ffmpegName);
        if (existsSync(candidate)) {
            ffmpegPath = candidate;
            break;
        }
    }

    // 2. If not found, prompt the user a message "ffmpeg is not installed or not found in PATH" and then exit the function.
    if (!ffmpegPath) {
        console.log("ffmpeg is not installed or not found in PATH");
        return;
    }
    console.log('Using ffmpeg at:', ffmpegPath);

    const inputDir = path.dirname(inputPath);
    const inputName = path.basename(inputPath);
    const outputPathAbs = path.resolve(outputPath);

    // 3. If found, execute the command to convert the input m3u8 file to mp4 format using ffmpeg.
    try {
        const verboseOption = "-v debug";
        const result = execSync(
            `${ffmpegPath} ${verboseOption} -allowed_extensions ALL -y -i "${inputName}" -c copy "${outputPathAbs}"`,
            {
                encoding: "utf-8",
                stdio: "inherit",
                cwd: inputDir,
            }
        );
        console.log(result);
        console.log(`Conversion completed: ${outputPath}`);
    } catch (error: any) {
        console.error("Error during conversion:");
        // console.error(error.stderr);
        // console.error(error.message);
        console.error(error);
    }
}
