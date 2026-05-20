// oxlint-disable max-lines-per-function, no-magic-numbers

import { ParkhausMitAdresseDTO, ParkhausMitAdresseUndAutos, ParkhausService } from './parkhaus-service.mts';
import { Prisma, PrismaClient } from '../../generated/prisma/client.ts';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { type Pageable } from './pageable.mts';
import { type Suchparameter } from './suchparameter.mts';

const { findManyMock, countMock } = vi.hoisted(() => {
    return {
        findManyMock: vi.fn<PrismaClient['parkhaus']['findMany']>(),
        countMock: vi.fn<PrismaClient['parkhaus']['count']>(),
    };
});

vi.mock(import('../../config/prisma-client.mts'), () => {
    return {
        prismaClient: {
            parkhaus: {
                findMany: findManyMock,
                count: countMock,
            },
        } as unknown as PrismaClient,
    };
});

describe('ParkhausService find', () => {
    let service: ParkhausService;

    beforeEach(() => {
        service = new ParkhausService();
        findManyMock.mockReset();
        countMock.mockReset();
    });

    test('name vorhanden', async () => {
        // given
        const name = 'Südpfalz-Parkhaus Bellheim';
        const suchparameter: Suchparameter = { name };
        const pageable: Pageable = { number: 1, size: 5 };
        const parkhausMock: ParkhausMitAdresseUndAutos = {
                    id: 1,
                    version: 0,
                    name: 'Südpfalz-Parkhaus Bellheim',
                    kapazitaet: 120,
                    // oxlint-disable-next-line no-magic-numbers
                    tarifProStunde: new Prisma.Decimal(2.2),
                    erzeugt: new Date(),
                    aktualisiert: new Date(),
                    adresse: {
                        id: 11,
                        plz: '76756',
                        ort: 'Bellheim',
                        strasse: 'Hauptstraße',
                        hausnummer: '101',
                        parkhausId: 1,
                    },
                    autos: [],
                };
        const { tarifProStunde, ...parkhausRest } = parkhausMock;
        const parkhausMockDTO: ParkhausMitAdresseDTO = {
            ...parkhausRest,
            tarifProStunde: tarifProStunde.toNumber(),
        };
        findManyMock.mockResolvedValueOnce([parkhausMock]);
        countMock.mockResolvedValueOnce(1);

        // when
        const result = await service.find(suchparameter, pageable);

        // then
        const { content } = result;

        expect(content).toHaveLength(1);
        expect(content[0]).toStrictEqual(parkhausMockDTO);
    });

    test('name nicht vorhanden', async () => {
        // given
        const name = 'Name';
        const suchparameter: Suchparameter = { name };
        const pageable: Pageable = { number: 1, size: 5 };
        findManyMock.mockResolvedValue([]);

        // when / then
        await expect(service.find(suchparameter, pageable)).rejects.toThrow(
            /^Keine Parkhaeuser gefunden/u,
        );
    });
});
