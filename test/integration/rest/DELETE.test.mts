// oxlint-disable max-lines-per-function

import { AUTHORIZATION, BEARER, DELETE, restURL } from '../constants.mts';
import { beforeAll, describe, expect, test } from 'vitest';
import { getToken } from '../token.mts';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const id = '5';

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('DELETE /rest', () => {
    let token: string;
    let tokenUser: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
        tokenUser = await getToken('user', 'p');
    });

    test.concurrent('Vorhandenes Parkhaus loeschen', async () => {
        // given
        const url = `${restURL}/${id}`;
        const headers = new Headers();
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const { status } = await fetch(url, {
            method: DELETE,
            headers,
        });

        // then
        expect(status).toBe(204);
    });

    test.concurrent('Parkhaus loeschen, aber ohne Token', async () => {
        // given
        const url = `${restURL}/${id}`;

        // when
        const { status } = await fetch(url, { method: DELETE });

        // then
        expect(status).toBe(401);
    });

    test.concurrent('Parkhaus loeschen, aber mit falschem Token', async () => {
        // given
        const url = `${restURL}/${id}`;
        const headers = new Headers();
        headers.append(AUTHORIZATION, `${BEARER} FALSCHER_TOKEN`);

        // when
        const { status } = await fetch(url, {
            method: DELETE,
            headers,
        });

        // then
        expect(status).toBe(401);
    });

    test.concurrent('Vorhandenes Parkhaus als "user" loeschen', async () => {
        // given
        const url = `${restURL}/6`;
        const headers = new Headers();
        headers.append(AUTHORIZATION, `${BEARER} ${tokenUser}`);

        // when
        const { status } = await fetch(url, {
            method: DELETE,
            headers,
        });

        // then
        expect(status).toBe(403);
    });
});
