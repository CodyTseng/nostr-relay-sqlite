import { NostrRelay, createOutgoingNoticeMessage } from '@nostr-relay/core';
import { EventRepositorySqlite } from '@nostr-relay/event-repository-sqlite';
import { Validator } from '@nostr-relay/validator';
import { program } from 'commander';
import { bold, underline, yellow } from 'kleur/colors';
import { WebSocketServer } from 'ws';
import { getLocalIpAddress } from './ip.util';

const log = console.log;

async function bootstrap(options: { port?: number; file?: string } = {}) {
  const { port = 4869, file = ':memory:' } = options;

  const wss = new WebSocketServer({ port });

  const eventRepository = new EventRepositorySqlite(file);
  const relay = new NostrRelay(eventRepository);
  const validator = new Validator();

  const localIpAddress = getLocalIpAddress();
  log(`Now you can use your ${bold('Nostr App')} to connect to this relay.

${yellow('Local:')}           ${yellow(underline('ws://localhost:' + port))}
${yellow('On Your Network:')} ${yellow(underline('ws://' + localIpAddress + ':' + port))}
`);

  wss.on('connection', (ws) => {
    relay.handleConnection(ws);

    ws.on('message', async (data) => {
      try {
        const message = await validator.validateIncomingMessage(data);
        relay.handleMessage(ws, message);
      } catch (error) {
        if (error instanceof Error) {
          ws.send(JSON.stringify(createOutgoingNoticeMessage(error.message)));
        }
      }
    });

    ws.on('close', () => relay.handleDisconnect(ws));

    ws.on('error', (error) => {
      log(error);
      ws.send(JSON.stringify(createOutgoingNoticeMessage(error.message)));
    });
  });
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
