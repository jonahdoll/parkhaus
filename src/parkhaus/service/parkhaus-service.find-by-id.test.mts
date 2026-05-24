import {
    type ParkhausMitAdresseUndAutos,
    type ParkhausMitAdresseUndAutosDTO,
    ParkhausService,
} from './parkhaus-service.mts';
import { Prisma, PrismaClient } from '../../generated/prisma/client.ts';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { findUniqueMock } = vi.hoisted(() => {
    return {
        findUniqueMock: vi.fn<PrismaClient['parkhaus']['findUnique']>(),
    };
});

vi.mock(import('../../config/prisma-client.mts'), () => {
    return {
        prismaClient: {
            parkhaus: {
                findUnique: findUniqueMock,
            },
        } as unknown as PrismaClient,
    };
});

describe('ParkhausService findById', () => {
    let service: ParkhausService;

    beforeEach(() => {
        service = new ParkhausService();
        findUniqueMock.mockReset();
    });

    test('id vorhanden', async () => {
        // given
        const id = 1;
        const parkhausMock: Readonly<ParkhausMitAdresseUndAutos> = {
            id,
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
                parkhausId: id,
            },
            autos: [],
        };
        const { tarifProStunde, ...parkhausRest } = parkhausMock;
        const parkhausMockDTO: ParkhausMitAdresseUndAutosDTO = {
            ...parkhausRest,
            tarifProStunde: tarifProStunde.toNumber(),
        };
        // return von prismaClient.parkhaus.findUnique()
        findUniqueMock.mockResolvedValueOnce(parkhausMock);

        // when
        const parkhaus = await service.findById({ id });

        // then
        expect(parkhaus).toStrictEqual(parkhausMockDTO);
    });

    test('id nicht vorhanden', async () => {
        // given
        const id = 999;
        findUniqueMock.mockResolvedValue(null);

        // when / then
        await expect(service.findById({ id })).rejects.toThrow(
            `Es gibt kein Parkhaus mit der ID ${id}.`,
        );
    });
});
