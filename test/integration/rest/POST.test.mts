// oxlint-disable max-lines-per-function

import {
    APPLICATION_JSON,
    AUTHORIZATION,
    BEARER,
    CONTENT_TYPE,
    LOCATION,
    POST,
    restURL,
} from '../constants.mts';
import { beforeAll, describe, expect, test } from 'vitest';
import { type ParkhausNeuType } from '../../../src/parkhaus/router/parkhaus-validation.mts';
import { ParkhausService } from '../../../src/parkhaus/service/parkhaus-service.mts';
import { ProblemDetails } from '../../../src/problem-details.mts';
import { getToken } from '../token.mts';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const neuesParkhaus: ParkhausNeuType = {
    name: 'Test',
    kapazitaet: 120,
    tarifProStunde: 2.2,
    adresse: {
        plz: '76756',
        ort: 'Bellheim',
        strasse: 'Hauptstraße',
        hausnummer: '101',
    },
    autos: [
        {
            kennzeichen: 'GER-JD-2026',
            einfahrtszeit: new Date('2026-04-02T09:00:00Z'),
            kundentyp: 'ANWOHNER',
        },
    ],
};
const neuesParkhausInvalid: Record<string, unknown> = {
    name: 42,
    kapazitaet: 'viele',
    tarifProStunde: 'teuer',
    adresse: 'kein-objekt',
    autos: 'kein-array',
};
const neuesParkhausNameExistiert: ParkhausNeuType = {
    name: 'Südpfalz-Parkhaus Bellheim',
    kapazitaet: 120,
    tarifProStunde: 2.2,
    adresse: {
        plz: '76756',
        ort: 'Bellheim',
        strasse: 'Hauptstraße',
        hausnummer: '101',
    },
    autos: [
        {
            kennzeichen: 'GER-JD-2026',
            einfahrtszeit: new Date('2026-04-02T09:00:00Z'),
            kundentyp: 'ANWOHNER',
        },
    ],
};

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('POST /rest', () => {
    let token: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
    });

    test('Neues Parkhaus', async () => {
        // given
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neuesParkhaus),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(201);

        const responseHeaders = response.headers;
        const location = responseHeaders.get(LOCATION);

        expect(location).toBeDefined();

        // ID nach dem letzten "/"
        const indexLastSlash = location?.lastIndexOf('/') ?? -1;

        expect(indexLastSlash).not.toBe(-1);

        const idStr = location?.slice(indexLastSlash + 1);

        expect(idStr).toBeDefined();
        expect(ParkhausService.ID_PATTERN.test(idStr ?? '')).toBe(true);
    });

    test('Neues Parkhaus mit ungueltigen Daten', async () => {
        // given
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        const expectedPaths = [
            'name',
            'kapazitaet',
            'tarifProStunde',
            'adresse',
            'autos',
        ];

        // when
        const response = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neuesParkhausInvalid),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(422);

        const body = (await response.json()) as ProblemDetails;
        const { detail } = body;

        expect(detail).toBeDefined();
        expect(detail).toHaveLength(expectedPaths.length);

        const paths = detail.map((det: any) => det.path[0]);

        expect(paths).toStrictEqual(expect.arrayContaining(expectedPaths));
    });

    test('Neues Parkhaus, aber der Name existiert bereits', async () => {
        // given
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neuesParkhausNameExistiert),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(422);

        const body = (await response.json()) as ProblemDetails;

        expect(body.detail).toStrictEqual(expect.stringContaining('Name'));
    });

    test.concurrent('Neues Parkhaus, aber ohne Token', async () => {
        // when
        const { status } = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neuesParkhaus),
        });

        // then
        expect(status).toBe(401);
    });

    test.concurrent('Neues Parkhaus, aber mit falschem Token', async () => {
        // given
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} FALSCHER_TOKEN`);

        // when
        const { status } = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neuesParkhaus),
            headers,
        });

        // then
        expect(status).toBe(401);
    });

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    test.concurrent.todo('Abgelaufener Token', () => {});
});
