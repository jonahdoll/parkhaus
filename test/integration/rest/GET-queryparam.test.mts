// oxlint-disable max-lines-per-function, no-magic-numbers

import { CONTENT_TYPE, restURL } from '../constants.mts';
import { describe, expect, test } from 'vitest';
import { type Page } from '../../../src/parkhaus/router/page.mts';
import { Parkhaus } from '../../../src/generated/prisma/client.ts';
import { ParkhausMitAdresse } from '../../../src/parkhaus/service/parkhaus-service.mts';

type ParkhausType = Omit<Parkhaus, 'tarifProStunde'> & {
    tarifProStunde: number;
};

type ParkhausMitAdresseType = Omit<ParkhausMitAdresse, 'tarifProStunde'> & {
    tarifProStunde: number;
};

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const nameArray = ['Parkhaus Aachen', 'Parkhaus Berlin', 'Parkhaus Hamburg'];
const nameNichtVorhanden = ['xxx', 'yyy', 'zzz'];
const kapazitaet = [400, 500];
const tarifProStunde = [4, 5];

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('GET /rest', () => {
    test.concurrent('Alle Parkhäuser', async () => {
        // given
        const requestHeaders = new Headers();
        requestHeaders.append('Accept', 'application/json');

        // when
        const response = await fetch(restURL, { headers: requestHeaders });
        const { status, headers } = response;

        // then
        expect(status).toBe(200);
        expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

        const body = (await response.json()) as Page<ParkhausType>;

        body.content
            .map((parkhaus) => parkhaus.id)
            .forEach((id) => {
                expect(id).toBeDefined();
            });
    });

    test.concurrent.each(nameArray)(
        'Parkhäuser mit Name %s suchen',
        async (name) => {
            // given
            const params = new URLSearchParams({ name });
            const url = `${restURL}?${params}`;
            const requestHeaders = new Headers();
            requestHeaders.append('Accept', 'application/json');

            // when
            const response = await fetch(url, { headers: requestHeaders });
            const { status, headers } = response;

            // then
            expect(status).toBe(200);
            expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

            const body =
                (await response.json()) as Page<ParkhausMitAdresseType>;

            expect(body).toBeDefined();

            // Jedes Parkhaus hat einen Namen
            body.content
                .map((parkhaus) => parkhaus.name)
                // oxlint-disable-next-line id-length
                .forEach((n) =>
                    expect(n).toStrictEqual(expect.stringContaining(name)),
                );
        },
    );

    test.concurrent.each(nameNichtVorhanden)(
        'Parkhäuser zu nicht vorhandenem Name %s suchen',
        async (name) => {
            // given
            const params = new URLSearchParams({ name });
            const url = `${restURL}?${params}`;
            const requestHeaders = new Headers();
            requestHeaders.append('Accept', 'application/json');

            // when
            const { status } = await fetch(url, { headers: requestHeaders });

            // then
            expect(status).toBe(404);
        },
    );

    test.concurrent.each(kapazitaet)(
        'Parkhäuser mit max. Kapazität %d suchen',
        async (maxKapazitaet) => {
            // given
            const params = new URLSearchParams({
                kapazitaet: maxKapazitaet.toString(),
            });
            const url = `${restURL}?${params}`;
            const requestHeaders = new Headers();
            requestHeaders.append('Accept', 'application/json');

            // when
            const response = await fetch(url, { headers: requestHeaders });
            const { status, headers } = response;

            // then
            expect(status).toBe(200);
            expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

            const body = (await response.json()) as Page<ParkhausType>;

            // Jedes Parkhaus hat eine Kapazität <= maxKapazität
            body.content
                .map((parkhaus) => parkhaus?.kapazitaet ?? 0)
                .forEach((kp) =>
                    expect(Number(kp)).toBeLessThanOrEqual(maxKapazitaet),
                );
        },
    );

    test.concurrent.each(tarifProStunde)(
        'Parkhäuser mit max. Tarifpro Stunde %d suchen',
        async (tarif) => {
            // given
            const params = new URLSearchParams({
                tarifProStunde: tarif.toString(),
            });
            const url = `${restURL}?${params}`;
            const requestHeaders = new Headers();
            requestHeaders.append('Accept', 'application/json');

            // when
            const response = await fetch(url, { headers: requestHeaders });
            const { status, headers } = response;

            // then
            expect(status).toBe(200);
            expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

            const body = (await response.json()) as Page<ParkhausType>;

            // Jedes Parkhaus hat einen Tarif <= tarif
            body.content
                .map((parkhaus) => parkhaus?.tarifProStunde ?? 0)
                .forEach((tr) => expect(Number(tr)).toBeLessThanOrEqual(tarif));
        },
    );

    test.concurrent('Keine Parkhäuser zu einer nicht-vorhandenen Property', async () => {
        // given
        const params = new URLSearchParams({ foo: 'bar' });
        const url = `${restURL}?${params}`;
        const requestHeaders = new Headers();
        requestHeaders.append('Accept', 'application/json');

        // when
        const { status } = await fetch(url, { headers: requestHeaders });

        // then
        expect(status).toBe(404);
    });
});
