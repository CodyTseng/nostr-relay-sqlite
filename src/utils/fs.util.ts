import { mkdirSync, statSync } from 'fs';

export function ensureDirSync(dirPath: string) {
  const dirStat = _statSync(dirPath);

  if (!dirStat) {
    mkdirSync(dirPath, { recursive: true });
  } else if (!dirStat.isDirectory()) {
    throw new Error(`Log directory '${dirPath}' is not a directory`);
  }
}

function _statSync(dirPath: string) {
  try {
    return statSync(dirPath);
  } catch {
    return false;
  }
}
