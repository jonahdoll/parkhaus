/* oxlint-disable import/max-dependencies */
import { type Context, Hono, type Next } from 'hono';
import { ForbiddenError, UnauthorizedError } from './security/errors.mts';
import {
    NotFoundError,
    ParkhausExistsError,
    VersionInvalidError,
    VersionOutdatedError,
} from './parkhaus/service/errors.mts';
import {
    createProblemDetails,
    forbidden,
    preconditionFailed,
    unauthorized,
    unprocessableContent,
} from './problem-details.mts';
import { type ZodError } from 'zod';
import { router as authRouter } from './security/auth-router.mts';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import { corsOptions } from './config/cors.mts';
import { createMiddleware } from 'hono/factory';
import { router as devRouter } from './config/dev/dev-router.mts';
import { env } from './config/env.mts';
import { getLogger } from './logger/logger.mts';
import { router as healthRouter } from './admin/health-router.mts';
import { router as parkhausWriteRouter } from './parkhaus/router/parkhaus-write-router.mts';
import { paths } from './config/paths.mts';
import { requestLogger } from './logger/request-logger.mts';
import { responseTime } from './logger/response-time.mts';
import { router } from './parkhaus/router/parkhaus-router.mts';
import { secureHeaders } from 'hono/secure-headers';
import { showRoutes } from 'hono/dev';

/**
 * Web-Applikation mit Hono.
 * @author [Jonah Doll](mailto:dojo1024@h-ka.de)
 */
export const app = new Hono();

const logger = getLogger('app', 'file');

// -----------------------------------------------------------------------------
// M i d d l e w a r e
// -----------------------------------------------------------------------------

const securityHeaders = createMiddleware(async (c: Context, next: Next) => {
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'SAMEORIGIN');
    return await next();
});

app.use(secureHeaders(), cors(corsOptions), securityHeaders, compress());

if (logger.isLevelEnabled('debug')) {
    app.use(responseTime, requestLogger);
}

// -----------------------------------------------------------------------------
// R o u t e n
// -----------------------------------------------------------------------------
app.route(paths.rest, router);
app.route(paths.rest, parkhausWriteRouter);
app.route(paths.health, healthRouter);
app.route(paths.auth, authRouter);
// app.route('/', graphqlApp);
// app.route('/prometheus', prometheusRouter);

const { NODE_ENV } = env;
if (NODE_ENV === 'development' || NODE_ENV === 'test') {
    app.route(paths.dev, devRouter);
}

if (logger.isLevelEnabled('debug')) {
    showRoutes(app, {
        verbose: true,
    });
}

// -----------------------------------------------------------------------------
// E r r o r   H a n d l e r
// -----------------------------------------------------------------------------
// oxlint-disable-next-line promise/prefer-await-to-callbacks
app.onError((error, c) => {
    if (error instanceof NotFoundError) {
        return c.notFound();
    }

    if (error.name === 'ZodError') {
        return createProblemDetails(
            c,
            unprocessableContent,
            (error as ZodError).issues,
        );
    }

    if (error instanceof ParkhausExistsError) {
        return createProblemDetails(c, unprocessableContent, error.message);
    }

    if (
        error instanceof VersionInvalidError ||
        error instanceof VersionOutdatedError
    ) {
        return createProblemDetails(c, preconditionFailed, error.message);
    }

    if (error instanceof UnauthorizedError) {
        return createProblemDetails(c, unauthorized, error.message);
    }

    if (error instanceof ForbiddenError) {
        return createProblemDetails(c, forbidden, error.message);
    }

    logger.error('Interner Fehler: %o', error);
    console.log(error.stack);
    return c.body('Interner Fehler', 500);
});
