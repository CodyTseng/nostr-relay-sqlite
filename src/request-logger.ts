import type {
  ClientContext,
  HandleMessagePlugin,
  HandleMessageResult,
  IncomingMessage,
} from '@nostr-relay/common';
import { mkdirSync, statSync } from 'fs';
import path from 'path';
import Pino from 'pino';

export class RequestLogger implements HandleMessagePlugin {
  private readonly logger: Pino.Logger;

  constructor() {
    const dir = path.join(__dirname, '../logs');
    const dirStat = this.statSync(dir);
    if (!dirStat) {
      mkdirSync(dir, { recursive: true });
    } else if (!dirStat.isDirectory()) {
      throw new Error(`Log directory '${dir}' is not a directory`);
    }

    this.logger = Pino({
      transport: {
        target: 'pino/file',
        options: { destination: path.join(dir, 'requests.log') },
      },
    });
  }

  async handleMessage(
    _ctx: ClientContext,
    [messageType]: IncomingMessage,
    next: () => Promise<HandleMessageResult>,
  ): Promise<HandleMessageResult> {
    const start = Date.now();
    const result = await next();
    this.logger.info(
      { messageType, duration: Date.now() - start },
      `${messageType} request processed in ${Date.now() - start}ms`,
    );
    return result;
  }

  private statSync(dirPath: string) {
    try {
      return statSync(dirPath);
    } catch {
      return false;
    }
  }
}
