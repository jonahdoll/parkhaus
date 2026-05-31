// oxlint-disable max-lines-per-function
// oxlint-disable no-magic-numbers

import {
    type ParkhausCreate,
    ParkhausWriteService,
} from './parkhaus-write-service.mts';
import { Prisma, PrismaClient } from '../../generated/prisma/client.ts';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ParkhausService } from './parkhaus-service.mts';

// Hoisting: wird an den (Datei-) Anfang verschoben
const { createMock, countMock, transactionMock, sendmailMock } = vi.hoisted(
    () => {
        return {
            createMock: vi.fn<Prisma.ParkhausDelegate['create']>(),
            countMock: vi.fn<Prisma.ParkhausDelegate['count']>(),
            transactionMock: vi.fn(), // oxlint-disable-line vitest/require-mock-type-parameters
            sendmailMock: vi.fn(), // oxlint-disable-line vitest/require-mock-type-parameters
        };
    },
);

vi.mock(import('../../config/prisma-client.mts'), () => {
    return {
        prismaClient: {
            parkhaus: {
                create: createMock,
                count: countMock,
            },
            $transaction: transactionMock,
        } as unknown as PrismaClient,
    };
});

vi.mock(import('../../mail/sendmail.mts'), () => {
    return {
        sendmail: sendmailMock,
    };
});

describe('ParkhausWriteService create', () => {
    let service: ParkhausWriteService;
    let readService: ParkhausService;

    beforeEach(() => {
        readService = new ParkhausService();
        service = new ParkhausWriteService(readService);

        createMock.mockReset();
        countMock.mockReset();
        transactionMock.mockReset();
        sendmailMock.mockReset();

        transactionMock.mockImplementation(
            async (
                transactionBody: (
                    tx: Prisma.TransactionClient,
                ) => Promise<unknown>,
            ) =>
                await transactionBody({
                    parkhaus: {
                        create: createMock,
                        count: countMock,
                    },
                } as unknown as Prisma.TransactionClient),
        );
    });

    test('Neues Parkhaus', async () => {
        // given
        const idMock = 1;
        const parkhaus: ParkhausCreate = {
            name: 'Südpfalz-Parkhaus Bellheim',
            kapazitaet: 120,
            // oxlint-disable-next-line no-magic-numbers
            tarifProStunde: new Prisma.Decimal(2.2),
            erzeugt: new Date(),
            aktualisiert: new Date(),
            adresse: {
                create: {
                    plz: '76756',
                    ort: 'Bellheim',
                    strasse: 'Hauptstraße',
                    hausnummer: '101',
                },
            },
        };
        const parkhausTmp: any = { ...parkhaus };
        parkhausTmp.id = idMock;
        parkhausTmp.adresse.create.id = 11;
        parkhausTmp.adresse.create.parkhausId = idMock;
        createMock.mockResolvedValue(parkhausTmp);
        sendmailMock.mockResolvedValue(null);

        // when
        const id = await service.create(parkhaus);

        // then
        expect(id).toBe(idMock);
        expect(sendmailMock).toHaveBeenCalledOnce();
    });
});
