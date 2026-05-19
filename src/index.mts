import { connectDB, disconnectDB } from './config/prisma-client.mts';
import Bun from 'bun';
import { app } from './app.mts';
import { banner } from './logger/banner.mts';
import { container } from './container.mts';
import { env } from './config/env.mts';
import process from 'node:process';
import { serverConfig } from './config/server.mts';

const { NODE_ENV } = env;
if (NODE_ENV === 'development' || NODE_ENV === 'test') {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
}

const { fetch } = app;
const { port, portHttp, key, cert } = serverConfig;

await container.dbPopulateService.populate();
await connectDB();

Bun.serve({ port: portHttp, fetch });
Bun.serve({
    port,
    fetch,
    tls: {
        key,
        cert,
    },
});

await banner();

process.on('SIGINT', () => {
    (async () => {
        await disconnectDB();
    })();

    console.log('Der Server wird heruntergefahren.');
});
