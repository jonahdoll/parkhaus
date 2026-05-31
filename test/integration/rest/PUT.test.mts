// oxlint-disable max-lines-per-function

import {
    APPLICATION_JSON,
    AUTHORIZATION,
    BEARER,
    CONTENT_TYPE,
    IF_MATCH,
    PUT,
    restURL,
} from '../constants.mts';
import { beforeAll, describe, expect, test } from 'vitest';
import { type ParkhausUpdateType } from '../../../src/parkhaus/router/parkhaus-validation.mts';
import { ProblemDetails } from '../../../src/problem-details.mts';
import { getToken } from '../token.mts';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const geaendertesParkhaus: ParkhausUpdateType = {
    name: 'Südpfalz-Parkhaus Bellheim',
    kapazitaet: 120,
    tarifProStunde: 2.3,
};
const idVorhanden = '1';

const geaendertesParkhausIdNichtVorhanden: ParkhausUpdateType = {
    name: 'Südpfalz-Parkhaus Bellheim',
    kapazitaet: 120,
    tarifProStunde: 2.3,
};

const idNichtVorhanden = '999999';

const geaendertesParkhausInvalid: Record<string, unknown> = {
    name: '',
    kapazitaet: -10,
    tarifProStunde: -1,
};

const veraltetesParkhaus: ParkhausUpdateType = {
    name: 'Südpfalz-Parkhaus Bellheim',
    kapazitaet: 120,
    tarifProStunde: 2.3,
};

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('PUT /rest/:id', () => {
    let token: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
    });

    test('Vorhandenes Parkhaus aendern', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaendertesParkhaus),
            headers,
        });

        // then
        expect(status).toBe(204);
    });

    test('Nicht-vorhandenes Parkhaus aendern', async () => {
        // given
        const url = `${restURL}/${idNichtVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaendertesParkhausIdNichtVorhanden),
            headers,
        });

        // then
        expect(status).toBe(404);
    });

    test('Vorhandenes Parkhaus aendern, aber mit ungueltigen Daten', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);
        const expectedPaths = ['name', 'kapazitaet', 'tarifProStunde'];

        // when
        const response = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaendertesParkhausInvalid),
            headers,
        });

        // then
        expect(response.status).toBe(422);

        const body = (await response.json()) as ProblemDetails;
        const { detail } = body;

        expect(detail).toBeDefined();
        expect(detail).toHaveLength(expectedPaths.length);

        const paths = detail.map((det: any) => det.path[0]);

        expect(paths).toStrictEqual(expect.arrayContaining(expectedPaths));
    });

    test('Vorhandenes Parkhaus aendern, aber ohne Versionsnummer', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaendertesParkhaus),
            headers,
        });

        // then
        expect(response.status).toBe(428);

        const { detail, statusCode } =
            (await response.json()) as ProblemDetails;

        expect(detail).toContain(IF_MATCH);
        expect(statusCode).toBe(428);
    });

    test('Vorhandenes Parkhaus aendern, aber mit alter Versionsnummer', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"-1"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(url, {
            method: PUT,
            body: JSON.stringify(veraltetesParkhaus),
            headers,
        });

        // then
        expect(response.status).toBe(412);

        const { detail, statusCode } =
            (await response.json()) as ProblemDetails;

        expect(detail).toMatch(/Versionsnummer/u);
        expect(statusCode).toBe(412);
    });

    test('Vorhandenes Parkhaus aendern, aber ohne Token', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaendertesParkhaus),
            headers,
        });

        // then
        expect(status).toBe(401);
    });

    test('Vorhandenes Parkhaus aendern, aber mit falschem Token', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} FALSCHER_TOKEN`);

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaendertesParkhaus),
            headers,
        });

        // then
        expect(status).toBe(401);
    });
});
