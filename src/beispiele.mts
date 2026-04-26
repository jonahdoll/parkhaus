import process from 'node:process';
import { styleText } from 'node:util';
import { PrismaPg } from '@prisma/adapter-pg';
import { prismaQueryInsights } from '@prisma/sqlcommenter-query-insights';
import {
    PrismaClient,
    type Parkhaus,
    type Prisma,
} from './generated/prisma/client.ts';

let message = styleText(['black', 'bgWhite'], 'Node version');
console.log(`${message}=${process.version}`);
message = styleText(['black', 'bgWhite'], 'DATABASE_URL');
console.log(`${message}=${process.env['DATABASE_URL']}`);
console.log();

const adapter = new PrismaPg({
    connectionString: process.env['DATABASE_URL'],
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
    // Kommentar zu Log-Ausgabe:
    // /*prismaQuery='Buch.findMany%3A...
    comments: [prismaQueryInsights()],
});
prisma.$on('query', (e) => {
    message = styleText('green', `Query: ${e.query}`);
    console.log(message);
    message = styleText('cyan', `Duration: ${e.duration} ms`);
    console.log(message);
});

export type ParkhausMitAdresseUndAutos = Prisma.ParkhausGetPayload<{
    include: {
        adresse: true;
        autos: true;
    };
}>;

try {
    await prisma.$connect();

    const parkhaus: Parkhaus | null = await prisma.parkhaus.findUnique({
        where: { id: 1 },
    });
    message = styleText(['black', 'bgWhite'], 'parkhaus');
    console.log(`${message} = %j`, parkhaus);
    console.log();

    // SELECT *
    // FROM   parkhaus
    // JOIN   adresse ON parkhaus.id = adresse.parkhaus_id
    // WHERE  adresse.strasse LIKE "%n%"
    const parkhaeuser: ParkhausMitAdresseUndAutos[] =
        await prisma.parkhaus.findMany({
            where: {
                adresse: {
                    is: {
                        strasse: {
                            contains: 'n',
                        },
                    },
                },
            },
            include: {
                adresse: true,
                autos: true,
            },
        });
    message = styleText(['black', 'bgWhite'], 'parkhaeuserMitAdresseUndAutos');
    console.log(`${message} = %j`, parkhaeuser);
    console.log();

    const kennzeichen = parkhaeuser.map((p) =>
        p.autos.map((a) => a.kennzeichen),
    );
    message = styleText(['black', 'bgWhite'], 'kennzeichen');
    console.log(`${message} = %j`, kennzeichen);
    console.log();

    const strasse = parkhaeuser.map((p) => p.adresse?.strasse);
    message = styleText(['black', 'bgWhite'], 'strasse');
    console.log(`${message} = %j`, strasse);
    console.log();

    const parkhaueserPage2: Parkhaus[] = await prisma.parkhaus.findMany({
        skip: 5,
        take: 5,
    });
    message = styleText(['black', 'bgWhite'], 'parkhaueserPage2');
    console.log(`${message} = %j`, parkhaueserPage2);
    console.log();
} finally {
    await prisma.$disconnect();
}

// PrismaClient mit PostgreSQL-User "postgres", d.h. mit Administrationsrechten
const adapterAdmin = new PrismaPg({
    connectionString: process.env['DATABASE_URL_ADMIN'],
});
const prismaAdmin = new PrismaClient({ adapter: adapterAdmin });
try {
    const parkhaueserAdmin: Parkhaus[] = await prismaAdmin.parkhaus.findMany({
        where: {
            adresse: {
                strasse: {
                    contains: 'n',
                },
            },
        },
    });
    message = styleText(['black', 'bgWhite'], 'parkhaueserAdmin');
    console.log(`${message} = ${JSON.stringify(parkhaueserAdmin)}`);
} finally {
    await prismaAdmin.$disconnect();
}
