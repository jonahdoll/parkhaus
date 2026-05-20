/**
 * Das Modul besteht aus der Klasse {@linkcode ParkhausService}.
 * @packageDocumentation
 */

import { type Suchparameter, suchparameterNamen } from './suchparameter.mts';
import { NotFoundError } from './errors.mts';
import { type Pageable } from './pageable.mts';
import { ParkhausInclude } from '../../generated/prisma/models/Parkhaus.ts';
import { Prisma } from '../../generated/prisma/client.ts';
import { type Slice } from './slice.mts';
import { buildWhere } from './where-builder.mts';
import { getLogger } from '../../logger/logger.mts';
import { prismaClient } from '../../config/prisma-client.mts';

type FindByIdParams = {
    readonly id: number;
    readonly mitAutos?: boolean;
};

export type ParkhausMitAdresse = Prisma.ParkhausGetPayload<{
    include: { adresse: true };
}>;

export type ParkhausMitAdresseDTO = Omit<
    ParkhausMitAdresse,
    'tarifProStunde'
> & {
    tarifProStunde: number;
};

export type ParkhausMitAdresseUndAutos = Prisma.ParkhausGetPayload<{
    include: {
        adresse: true;
        autos: true;
    };
}>;

export type ParkhausMitAdresseUndAutosDTO = Omit<
    ParkhausMitAdresseUndAutos,
    'tarifProStunde'
> & {
    tarifProStunde: number;
};

/**
 * Die Klasse `ParkhausService` implementiert das Lesen für Parkhäuser und greift
 * mit _Prisma_ auf eine relationale DB zu.
 */
export class ParkhausService {
    static readonly ID_PATTERN = /^[1-9]\d{0,10}$/u;

    readonly #includeAdresse: ParkhausInclude = { adresse: true };
    readonly #includeAdresseUndAutos: ParkhausInclude = {
        adresse: true,
        autos: true,
    };

    readonly #logger = getLogger(ParkhausService.name);

    /**
     * Ein Parkhaus asynchron anhand seiner ID suchen
     * @param id ID des gesuchten Parkhauses
     * @returns Das gefundene Parkhaus in einem Promise.
     * @throws NotFoundError falls kein Parkhaus mit der ID existiert
     */
    async findById({
        id,
        mitAutos,
    }: FindByIdParams): Promise<Readonly<ParkhausMitAdresseUndAutosDTO>> {
        this.#logger.debug('findById: id=%d', id);

        const include = mitAutos
            ? this.#includeAdresseUndAutos
            : this.#includeAdresse;
        const parkhaus: ParkhausMitAdresseUndAutos | null =
            await prismaClient.parkhaus.findUnique({
                where: { id },
                include,
            });
        if (parkhaus === null) {
            this.#logger.debug('Es gibt kein Parkhaus mit der ID %d', id);
            throw new NotFoundError(`Es gibt kein Parkhaus mit der ID ${id}.`);
        }

        const { tarifProStunde } = parkhaus;
        const parkhausDTO: ParkhausMitAdresseUndAutosDTO = {
            ...parkhaus,
            tarifProStunde: tarifProStunde.toNumber(),
        };

        this.#logger.debug('findById: parkhausDTO=%o', parkhausDTO);
        return parkhausDTO;
    }

    /**
     * Parkhäuser asynchron suchen.
     * @param suchparameter JSON-Objekt mit Suchparameter.
     * @param pageable Maximale Anzahl an Datensätzen und Seitennummer.
     * @returns Ein JSON-Array mit den gefundenen Parkhäusern.
     * @throws NotFoundError falls keine Parkhäuser gefunden wurden.
     */
    async find(
        suchparameter: Suchparameter | null,
        pageable: Pageable,
    ): Promise<Readonly<Slice<Readonly<ParkhausMitAdresseDTO>>>> {
        this.#logger.debug(
            'find: suchparameter=%s, pageable=%o',
            JSON.stringify(suchparameter),
            pageable,
        );

        if (suchparameter === null) {
            return await this.#findAll(pageable);
        }
        const keys = Object.keys(suchparameter);
        if (keys.length === 0) {
            return await this.#findAll(pageable);
        }

        if (!this.#checkKeys(keys)) {
            this.#logger.debug('Ungueltige Suchparameter');
            throw new NotFoundError('Ungueltige Suchparameter');
        }

        const where = buildWhere(suchparameter);
        const { number, size } = pageable;
        const parkhaeuser: ParkhausMitAdresse[] =
            await prismaClient.parkhaus.findMany({
                where,
                skip: number * size,
                take: size,
                include: this.#includeAdresse,
            });
        if (parkhaeuser.length === 0) {
            this.#logger.debug('find: Keine Parkhäuser gefunden');
            throw new NotFoundError(
                `Keine Parkhäuser gefunden: ${JSON.stringify(suchparameter)}, Seite ${pageable.number}}`,
            );
        }
        const totalElements = await this.count(where);
        return this.#createSlice(parkhaeuser, totalElements);
    }

    /**
     * Anzahl der gefundenen Parkhäuser zurückliefern.
     * @param WHERE-Klausel der eigentlichen Suche.
     * @returns Anzahl der gefundenen Parkhäuser.
     */
    async count(where?: Prisma.ParkhausWhereInput) {
        this.#logger.debug('count: where=%o', where ?? 'undefined');
        const { count } = prismaClient.parkhaus;
        const anzahl =
            where === undefined ? await count() : await count({ where });
        this.#logger.debug('count: %d', anzahl);
        return anzahl;
    }

    async #findAll(
        pageable: Pageable,
    ): Promise<Readonly<Slice<ParkhausMitAdresseDTO>>> {
        const { number, size } = pageable;
        const parkhaeuser: ParkhausMitAdresse[] =
            await prismaClient.parkhaus.findMany({
                skip: number * size,
                take: size,
                include: this.#includeAdresse,
            });
        if (parkhaeuser.length === 0) {
            this.#logger.debug('#findAll: Keine Parkhäuser gefunden');
            throw new NotFoundError(`Ungueltige Seite "${number}"`);
        }
        const totalElements = await this.count();
        return this.#createSlice(parkhaeuser, totalElements);
    }

    #createSlice(
        parkhaeuser: ParkhausMitAdresse[],
        totalElements: number,
    ): Readonly<Slice<ParkhausMitAdresseDTO>> {
        const parkhaeuserDTO = parkhaeuser.map((parkhaus) => {
            // Rest Properties
            const { tarifProStunde, ...parkhausRest } = parkhaus;
            const parkhausDTO: ParkhausMitAdresseDTO = {
                // Spread Properties
                ...parkhausRest,
                tarifProStunde: tarifProStunde.toNumber(),
            };
            return parkhausDTO;
        });
        const parkhausSlice: Slice<ParkhausMitAdresseDTO> = {
            content: parkhaeuserDTO,
            totalElements,
        };
        this.#logger.debug('createSlice: parkhausSlice=%o', parkhausSlice);
        return parkhausSlice;
    }

    #checkKeys(keys: string[]) {
        this.#logger.debug('#checkKeys: keys=%o', keys);
        // Ist jeder Suchparameter auch eine Property von Buch oder "schlagwoerter"?
        let validKeys = true;
        keys.forEach((key) => {
            if (!suchparameterNamen.includes(key)) {
                this.#logger.debug(
                    '#checkKeys: ungueltiger Suchparameter "%s"',
                    key,
                );
                validKeys = false;
            }
        });

        return validKeys;
    }
}
