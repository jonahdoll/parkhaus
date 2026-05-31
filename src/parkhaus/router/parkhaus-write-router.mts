/**
 * Das Modul besteht aus Router für die Verwaltung von Bücher.
 * @packageDocumentation
 */

import {
    type ParkhausCreate,
    type ParkhausFileCreated,
    type ParkhausUpdate,
} from '../service/parkhaus-write-service.mts';
import {
    ParkhausNeuSchema,
    type ParkhausNeuType,
    ParkhausUpdateSchema,
    type ParkhausUpdateType,
} from './parkhaus-validation.mts';
import {
    badRequest,
    createProblemDetails,
    preconditionRequired,
} from '../../problem-details.mts';
import { File } from 'node:buffer';
import { Hono } from 'hono';
import { container } from '../../container.mts';
import { createBaseUrl } from './create-base-url.mts';
import { getLogger } from '../../logger/logger.mts';
import { rolesRequired } from '../../security/roles-required.mts';

const { parkhausWriteService } = container;

/**
 * Router für die Verwaltung von Parkhäusern.
 * @author [Jonah Doll](mailto:dojo1024@h-ka.de)
 */
export const router = new Hono();

const logger = getLogger('parkhaus-write-router', 'file');

// -----------------------------------------------------------------------------
// N e u a n l e g e n
// -----------------------------------------------------------------------------
const parkhausDtoToParkhausCreateInput = (
    parkhausDTO: ParkhausNeuType,
): ParkhausCreate => {
    const autos = parkhausDTO.autos?.map((autosDTO) => {
        const auto = {
            kennzeichen: autosDTO.kennzeichen,
            einfahrtszeit: autosDTO.einfahrtszeit,
            kundentyp: autosDTO.kundentyp,
        };
        return auto;
    });
    const parkhaus: ParkhausCreate = {
        version: 0,
        name: parkhausDTO.name,
        kapazitaet: parkhausDTO.kapazitaet,
        tarifProStunde: parkhausDTO.tarifProStunde,
        adresse: {
            create: {
                plz: parkhausDTO.adresse.plz,
                ort: parkhausDTO.adresse.ort,
                strasse: parkhausDTO.adresse.strasse,
                hausnummer: parkhausDTO.adresse.hausnummer,
            },
        },
        autos: { create: autos ?? [] },
    };
    return parkhaus;
};

router.post('/', rolesRequired('admin', 'user'), async (c) => {
    const requestBody = await c.req.json();

    // Validierung mit Zod: ZodError wird geworfen, falls Validierung nicht erfolgreich
    const parkhausDTO: ParkhausNeuType = ParkhausNeuSchema.parse(requestBody);
    logger.debug('post: parkhausDTO=%o', parkhausDTO);

    const parkhaus = parkhausDtoToParkhausCreateInput(parkhausDTO);
    const id = await parkhausWriteService.create(parkhaus);

    const location = `${createBaseUrl(c.req)}/${id}`;
    const { header, body } = c;
    header('Location', location);
    return body(null, 201);
});

// -----------------------------------------------------------------------------
// A e n d e r n
// -----------------------------------------------------------------------------
const parkhausDtoToParkhausUpdate = (
    parkhausDTO: ParkhausUpdateType,
): ParkhausUpdate => {
    return {
        name: parkhausDTO.name,
        kapazitaet: parkhausDTO.kapazitaet,
        tarifProStunde: parkhausDTO.tarifProStunde,
    };
};

router.put('/:id', rolesRequired('admin', 'user'), async (c) => {
    const { req } = c;
    const id = req.param('id') ?? '-1';
    logger.debug('put: id=%s', id);
    const idNumber = Number.parseInt(id, 10);
    if (Number.isNaN(idNumber)) {
        return c.notFound();
    }

    const version = req.header('If-Match');
    logger.debug('put: version=%s', version);
    if (version === undefined) {
        logger.debug('put: version === undefined');
        return createProblemDetails(
            c,
            preconditionRequired,
            'Header "If-Match" fehlt',
        );
    }

    const requestBody = await c.req.json();
    logger.debug('put: requestBody=%o', requestBody);

    const parkhausDTO: ParkhausUpdateType =
        ParkhausUpdateSchema.parse(requestBody);
    logger.debug('put: parkhausDTO=%o', parkhausDTO);

    const parkhaus = parkhausDtoToParkhausUpdate(parkhausDTO);
    const neueVersion = await parkhausWriteService.update({
        id: idNumber,
        parkhaus,
        version,
    });
    logger.debug('put: neueVersion=%d', neueVersion);
    const headers = {
        ETag: `"${neueVersion}"`,
    };
    return c.body(null, 204, headers);
});

// -----------------------------------------------------------------------------
// L o e s c h e n
// -----------------------------------------------------------------------------
router.delete('/:id', rolesRequired('admin'), async (c) => {
    const id = c.req.param('id') ?? '-1';
    logger.debug('delete: id=%s', id);
    const idNumber = Number.parseInt(id, 10);
    const { body } = c;
    if (Number.isNaN(idNumber)) {
        return body(null, 204);
    }

    await parkhausWriteService.delete(idNumber);
    return body(null, 204);
});

// -----------------------------------------------------------------------------
// F i l e   U p l o a d
// -----------------------------------------------------------------------------
router.post('/:id', rolesRequired('admin', 'user'), async (c) => {
    const id = c.req.param('id') ?? '-1';
    logger.debug('upload: id=%s', id);
    const idNumber = Number.parseInt(id, 10);
    if (Number.isNaN(idNumber)) {
        return c.notFound();
    }

    const contentType = c.req.header('Content-Type');
    logger.debug('upload: contentType=%s', contentType);

    const body = await c.req.parseBody();
    const { file } = body;
    if (file === undefined || (Array.isArray(file) && file.length !== 1)) {
        return createProblemDetails(
            c,
            badRequest,
            'Keine oder mehrere Dateien hochgeladen',
        );
    }
    if (!(file instanceof File)) {
        return createProblemDetails(
            c,
            badRequest,
            `Ungueltiger Typ beim Upload: ${typeof file}`,
        );
    }

    const { name, size, type } = file;
    logger.debug('upload: name=%s, size=%d, type=%s', name, size, type);
    const buffer = Buffer.from(await file.arrayBuffer());
    const parkhausFile: ParkhausFileCreated | undefined =
        await parkhausWriteService.addFile(idNumber, buffer, name, size, type);
    logger.debug(
        'upload: id=%s, byteLength=%s, filename=%s, mimetype=%s',
        parkhausFile?.id,
        parkhausFile?.data.byteLength,
        parkhausFile?.filename,
        parkhausFile?.mimetype,
    );

    const location = `${createBaseUrl(c.req)}/file/${id}`;
    c.header('Location', location);
    return c.body(null, 204);
});
