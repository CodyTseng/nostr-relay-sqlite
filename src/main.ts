import { NostrRelay, createOutgoingNoticeMessage } from '@nostr-relay/core';
import { EventRepositorySqlite } from '@nostr-relay/event-repository-sqlite';
import { Validator } from '@nostr-relay/validator';
import { program } from 'commander';
import { bold, underline, yellow } from 'kleur/colors';
import path from 'path';
import { WebSocketServer } from 'ws';
import { RequestLogger } from './request-logger';
import { ensureDirSync, getLocalIpAddress } from './utils';

const DEFAULT_DB_DIR = path.join(__dirname, '../db');
const DEFAULT_DB_FILE = path.join(DEFAULT_DB_DIR, 'nostr.db');

async function bootstrap(options: { port?: number; file?: string } = {}) {
  const { port = 4869, file = DEFAULT_DB_FILE } = options;

  if (file === DEFAULT_DB_FILE) {
    ensureDirSync(DEFAULT_DB_DIR);
  }

  const wss = new WebSocketServer({ port });

  const eventRepository = new EventRepositorySqlite(file);
  const relay = new NostrRelay(eventRepository);
  const validator = new Validator();

  const logsDir = path.join(__dirname, '../logs');
  relay.register(new RequestLogger(logsDir));

  wss.on('connection', (ws) => {
    // Handle a new client connection. This method should be called when a new client connects to the Nostr Relay server.
    relay.handleConnection(ws);

    ws.on('message', async (data) => {
      try {
        // Validate the incoming message.
        const message = await validator.validateIncomingMessage(data);
        // Handle the incoming message.
        await relay.handleMessage(ws, message);
      } catch (error) {
        if (error instanceof Error) {
          ws.send(JSON.stringify(createOutgoingNoticeMessage(error.message)));
        }
      }
    });

    // Handle a client disconnection. This method should be called when a client disconnects from the Nostr Relay server.
    ws.on('close', () => relay.handleDisconnect(ws));

    ws.on('error', (error) => {
      ws.send(JSON.stringify(createOutgoingNoticeMessage(error.message)));
    });
  });

  const localIpAddress = getLocalIpAddress();
  console.log(`
db file:  ${file}
logs dir: ${logsDir}

Now you can use your ${bold('Nostr App')} to connect to this relay.

${yellow('Local:')}           ${yellow(underline('ws://localhost:' + port))}
${yellow('On Your Network:')} ${yellow(underline('ws://' + localIpAddress + ':' + port))}
`);
}

program
  .name('nostr-relay-sqlite')
  .description('a Nostr relay server using SQLite as a database');

program
  .option('-p, --port <port>', 'Port to listen on')
  .option('-f, --file <file>', 'Database file to use');

program.parse();

const options = program.opts();

bootstrap(options);
