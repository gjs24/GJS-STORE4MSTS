import fs from "node:fs";
import path from "node:path";
import { dialog } from "electron";

const possibleMstsPaths = [
  "C:\\Program Files (x86)\\Microsoft Games\\Train Simulator",
  "C:\\Program Files\\Microsoft Games\\Train Simulator",
  "D:\\Microsoft Games\\Train Simulator"
];

const possibleOpenRailsPaths = [
  "C:\\Program Files\\Open Rails",
  "C:\\Program Files (x86)\\Open Rails",
  "D:\\Open Rails"
];

function firstExisting(paths: string[]) {
  return paths.find((candidate) => fs.existsSync(candidate)) || "";
}

export function detectInstallPaths() {
  return {
    mstsPath: firstExisting(possibleMstsPaths),
    openRailsPath: firstExisting(possibleOpenRailsPaths)
  };
}

export async function chooseDirectory(title: string) {
  const result = await dialog.showOpenDialog({ title, properties: ["openDirectory", "createDirectory"] });
  return result.canceled ? "" : result.filePaths[0];
}

export function looksLikeSimulatorPath(targetPath: string, simulator: "MSTS" | "OPEN_RAILS") {
  if (!targetPath || !fs.existsSync(targetPath)) return false;
  if (simulator === "MSTS") {
    return fs.existsSync(path.join(targetPath, "train.exe")) || fs.existsSync(path.join(targetPath, "TRAINS"));
  }
  return fs.existsSync(path.join(targetPath, "OpenRails.exe")) || fs.existsSync(path.join(targetPath, "Content"));
}
