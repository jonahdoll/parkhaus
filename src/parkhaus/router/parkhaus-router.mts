/**
 * Das Modul besteht aus Router für die Verwaltung von Parkhäusern.
 * @packageDocumentation
 */

import { Hono } from 'hono';
import { container } from '../../container.mts';
import { createPage } from './page.mts';
import { createPageable } from '../service/pageable.mts';
import { getLogger } from '../../logger/logger.mts';

const { parkhausService } = container;

/**
 * Router für die Verwaltung von Parkhäusern.
 * @author [Jonah Doll](mailto:dojo1024@h-ka.de)
 */
export const router = new Hono();

const logger = getLogger('parkhaus-router', 'file');

// -----------------------------------------------------------------------------
// S u c h e   m i t   P f a d - P a r a m e t e r
// -----------------------------------------------------------------------------
router.get('/:id', async (c) => {
    const { req } = c;
    const accept = req.header('Accept')?.toLowerCase() ?? '*/*';
    if (accept !== '*/*' && !/(json|html)/u.test(accept)) {
        logger.debug('get: Accept=%s', accept);
        return c.body(null, 406);
    }

    const id = req.param('id');
    logger.debug('get: id=%s', id);
    const idNumber = Number.parseInt(id, 10);
    if (Number.isNaN(idNumber)) {
        return c.notFound();
    }

    const parkhaus = await parkhausService.findById({ id: idNumber });

    const ifNonMatch = req.header('If-None-Match');
    const { version } = parkhaus;
    if (ifNonMatch === `"${version}"`) {
        logger.debug('get: Not Modified');
        return c.body(null, 304);
    }

    logger.debug('get: version=%d', version);
    const { header, json } = c;
    header('ETag', `"${version}"`);

    logger.debug('get: %o', parkhaus);
    console.log(`x=${parkhaus.tarifProStunde}`);
    return json(parkhaus);
});

// -----------------------------------------------------------------------------
// S u c h e   m i t   Q u e r y - P a r a m e t e r
// -----------------------------------------------------------------------------
router.get('/', async (c) => {
    const { req } = c;
    const accept = req.header('Accept')?.toLowerCase() ?? '*/*';
    if (accept !== '*/*' && !/(json|html)/u.test(accept)) {
        logger.debug('get: Accept=%s', accept);
        return c.body(null, 406);
    }

    const queryParams = req.query();
    logger.debug('get: queryParams=%o', queryParams);
    const countOnly = queryParams['count-only'];
    if (countOnly !== undefined) {
        const count = await parkhausService.count();
        logger.debug('get: count=%d', count);
        return c.json({ count });
    }

    const { page, size } = queryParams;
    delete queryParams['page'];
    delete queryParams['size'];
    logger.debug(
        'get: page=%s, size=%s,  queryParams=%o',
        page,
        size,
        queryParams,
    );

    const pageable = createPageable({ number: page, size });
    const parkhausSlice = await parkhausService.find(queryParams, pageable); // NOSONAR
    const parkhausPage = createPage(parkhausSlice, pageable);
    logger.debug('get: buchPage=%o', parkhausPage);
    return c.json(parkhausPage);
});
