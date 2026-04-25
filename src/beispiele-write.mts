import { PrismaPg } from '@prisma/adapter-pg';
import process from 'node:process';
import { styleText } from 'node:util';
import { Kundentyp, PrismaClient, type Prisma } from './generated/prisma/client.ts';
import { Parkhaus } from './generated/prisma/models/Parkhaus';
import { adresse } from '../generated/prisma/client';

let message = styleText(
    'yellow',
    `process.env['DATABASE_URL']=${process.env['DATABASE_URL']}`,
);
console.log(message);
console.log();

const adapter = new PrismaPg({
    connectionString: process.env['DATABASE_URL_ADMIN'],
});

const log: (Prisma.LogLevel | Prisma.LogDefinition)[] = [
    {
        emit: 'event',
        level: 'query',
    },
    'info',
    'warn',
    'error',
];

const prisma = new PrismaClient({
    adapter,
    errorFormat: 'pretty',
    log,
});
prisma.$on('query', (e) => {
    message = styleText('green', `Query: ${e.query}`);
    console.log(message);
    message = styleText('cyan', `Duration: ${e.duration} ms`);
    console.log(message);
});

const neuesParkhaus: Prisma.ParkhausCreateInput = {
    name: 'Neues Parkhaus',
    kapazitaet: 100,
    tarifProStunde: 1.7,
    adresse: {
        create: {
            plz: '12345',
            ort: 'Musterstadt',
            strasse: 'Musterstraße',
            hausnummer: '1',
        },
    },
    autos: {
        create: [
            {
                kennzeichen: 'Muster-1',
                einfahrtszeit: '2025-03-03T00:00:00Z',
                kundentyp: 'PREMIUM',
            },
        ],
    },
};
type ParkhausCreated = Prisma.ParkhausGetPayload<{
    include: {
        adresse: true;
        autos: true;
    };
}>;

const geaendertesParkhaus: Prisma.ParkhausUpdateInput = {
    version: { increment: 1 },
    kapazitaet: 110,
    tarifProStunde: 1.6,
};
type ParkhausUpdated = Prisma.ParkhausGetPayload<{}>; // eslint-disable-line @typescript-eslint/no-empty-object-type

try {
    await prisma.$connect();
    await prisma.$transaction(async (tx) => {
        const parkhausDb: ParkhausCreated = await tx.parkhaus.create({
            data: neuesParkhaus,
            include: { adresse: true, autos: true },
        });
        message = styleText(['black', 'bgWhite'], 'Generierte ID:');
        console.log(`${message} ${parkhausDb.id}`);
        console.log();

        const parkhausUpdated: ParkhausUpdated = await tx.parkhaus.update({
            data: geaendertesParkhaus,
            where: { id: 5 },
        });
        // eslint-disable-next-line require-atomic-updates
        message = styleText(['black', 'bgWhite'], 'Aktualisierte Version:');
        console.log(`${message} ${parkhausUpdated.version}`);
        console.log();

        const geloescht = await tx.parkhaus.delete({ where: { id: 6 } });
        // eslint-disable-next-line require-atomic-updates
        message = styleText(['black', 'bgWhite'], 'Geloescht:');
        console.log(`${message} ${geloescht.id}`);
    });
} finally {
    await prisma.$disconnect();
}
