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
import {
    type AutoNeuType,
    type ParkhausNeuType,
} from '../../../src/parkhaus/router/parkhaus-validation.mts';
import { beforeAll, describe, expect, test } from 'vitest';
import { ProblemDetails } from '../../../src/problem-details.mts';
import { getToken } from '../token.mts';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
// Radix fuer toString(36): erzeugt eine alphanumerische Zufallszeichenkette.
const RANDOM_RADIX = 36;
// Ab Index 2, um das fuehrende "0." von Math.random().toString() zu entfernen.
const RANDOM_SLICE_START = 2;
// Groesserer Test-Timeout in ms, da der Mailversand laenger dauern kann.
const MAIL_TEST_TIMEOUT = 30_000;

const idVorhanden = '3';
const idNichtVorhanden = '999999';
const idUngueltig = 'abc';

const neuesAuto: AutoNeuType = {
    kennzeichen: 'GER-AUTO-2026',
    einfahrtszeit: new Date('2026-04-02T09:00:00Z'),
    kundentyp: 'PREMIUM',
};

const neuesAutoInvalid: Record<string, unknown> = {
    kennzeichen: '',
    einfahrtszeit: 'kein-datum',
    kundentyp: 'UNBEKANNT',
};

// Eigenes Parkhaus mit Kapazitaet 1 und bereits einem Auto, damit die
// Kapazitaetspruefung unabhaengig von Seed-Daten und parallelen Tests greift.
const vollesParkhaus: ParkhausNeuType = {
    name: `Auto-Test-Voll-${Date.now()}-${Math.random().toString(RANDOM_RADIX).slice(RANDOM_SLICE_START)}`,
    kapazitaet: 1,
    tarifProStunde: 1,
    adresse: {
        plz: '76131',
        ort: 'Karlsruhe',
        strasse: 'Moltkestraße',
        hausnummer: '30',
    },
    autos: [
        {
            kennzeichen: 'GER-VOLL-1',
            einfahrtszeit: new Date('2026-04-02T08:00:00Z'),
            kundentyp: 'BASIS',
        },
    ],
};

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('POST /rest/:id/autos', () => {
    let token: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
    });

    test('Neues Auto zu vorhandenem Parkhaus hinzufuegen', async () => {
        // given
        const url = `${restURL}/${idVorhanden}/autos`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(url, {
            method: POST,
            body: JSON.stringify(neuesAuto),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(201);

        const location = response.headers.get(LOCATION);

        expect(location).toBeDefined();
        // Location-Format: .../rest/<parkhausId>/autos/<autoId>
        expect(location).toMatch(/\/rest\/3\/autos\/\d+$/u);
    });

    test('Auto zu nicht-vorhandenem Parkhaus hinzufuegen', async () => {
        // given
        const url = `${restURL}/${idNichtVorhanden}/autos`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const { status } = await fetch(url, {
            method: POST,
            body: JSON.stringify(neuesAuto),
            headers,
        });

        // then
        expect(status).toBe(404);
    });

    test('Auto mit ungueltiger (nicht-numerischer) Parkhaus-ID', async () => {
        // given
        const url = `${restURL}/${idUngueltig}/autos`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const { status } = await fetch(url, {
            method: POST,
            body: JSON.stringify(neuesAuto),
            headers,
        });

        // then
        expect(status).toBe(404);
    });

    test('Auto mit ungueltigen Daten hinzufuegen', async () => {
        // given
        const url = `${restURL}/${idVorhanden}/autos`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        const expectedPaths = ['kennzeichen', 'einfahrtszeit', 'kundentyp'];

        // when
        const response = await fetch(url, {
            method: POST,
            body: JSON.stringify(neuesAutoInvalid),
            headers,
        });

        // then
        expect(response.status).toBe(422);

        const body = (await response.json()) as ProblemDetails;
        const { detail } = body;

        expect(detail).toBeDefined();

        const paths = detail.map((det: any) => det.path[0]);

        expect(paths).toStrictEqual(expect.arrayContaining(expectedPaths));
    });

    test(
        'Auto hinzufuegen, aber Kapazitaet ueberschritten',
        async () => {
            // given: ein eigenes Parkhaus mit Kapazitaet 1 und bereits einem Auto
            const createHeaders = new Headers();
            createHeaders.append(CONTENT_TYPE, APPLICATION_JSON);
            createHeaders.append(AUTHORIZATION, `${BEARER} ${token}`);

            const createResponse = await fetch(restURL, {
                method: POST,
                body: JSON.stringify(vollesParkhaus),
                headers: createHeaders,
            });

            expect(createResponse.status).toBe(201);

            const location = createResponse.headers.get(LOCATION) ?? '';
            const parkhausId = location.slice(location.lastIndexOf('/') + 1);
            const url = `${restURL}/${parkhausId}/autos`;

            const headers = new Headers();
            headers.append(CONTENT_TYPE, APPLICATION_JSON);
            headers.append(AUTHORIZATION, `${BEARER} ${token}`);

            // when: ein weiteres Auto ueberschreitet die Kapazitaet von 1
            const response = await fetch(url, {
                method: POST,
                body: JSON.stringify({
                    kennzeichen: 'GER-VOLL-2',
                    einfahrtszeit: new Date('2026-04-02T09:00:00Z'),
                    kundentyp: 'BASIS',
                } satisfies AutoNeuType),
                headers,
            });

            // then
            expect(response.status).toBe(422);
            // Das Anlegen eines Parkhauses verschickt eine Mail; ohne erreichbaren
            // Mailserver kann dies laenger dauern, daher ein groesserer Timeout.
        },
        MAIL_TEST_TIMEOUT,
    );

    test.concurrent('Auto hinzufuegen, aber ohne Token', async () => {
        // given
        const url = `${restURL}/${idVorhanden}/autos`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);

        // when
        const { status } = await fetch(url, {
            method: POST,
            body: JSON.stringify(neuesAuto),
            headers,
        });

        // then
        expect(status).toBe(401);
    });

    test.concurrent('Auto hinzufuegen, aber mit falschem Token', async () => {
        // given
        const url = `${restURL}/${idVorhanden}/autos`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} FALSCHER_TOKEN`);

        // when
        const { status } = await fetch(url, {
            method: POST,
            body: JSON.stringify(neuesAuto),
            headers,
        });

        // then
        expect(status).toBe(401);
    });
});
