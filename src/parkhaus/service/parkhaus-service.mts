/**
 * Das Modul besteht aus der Klasse {@linkcode ParkhausService}.
 * @packageDocumentation
 */

import { Prisma } from "../../generated/prisma/client.ts";
import { getLogger } from "../../logger/logger.mts";
import { NotFoundError } from "./errors.mts";
import {ParkhausInclude} from "../../generated/prisma/models/Parkhaus.ts";
import { prismaClient } from '../../config/prisma-client.mts';

type FindByIdParams = {
    readonly id: number;
    readonly mitAutos?: boolean;
};

export type ParkhausMitAdresse = Prisma.ParkhausGetPayload<{
    include: { adresse: true };
}>;

export type ParkhausMitAdresseDTO = Omit<ParkhausMitAdresse, 'tarifProStunde'> & {
    tarifProStunde: number;
};

export type ParkhausMitAdresseUndAutos = Prisma.ParkhausGetPayload<{
    include: {
        adresse: true;
        autos: true;
    }
}>;

export type ParkhausMitAdresseUndAutosDTO = Omit<ParkhausMitAdresseUndAutos, 'tarifProStunde'> & {
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

        const include = mitAutos ? this.#includeAdresseUndAutos : this.#includeAdresse;
        const parkhaus: ParkhausMitAdresseUndAutos | null =
            await prismaClient.parkhaus.findUnique({
                where: { id },
                include,
            });
        if (parkhaus === null) {
            this.#logger.debug('Es gibt kein Parkhaus mit der ID %d', id);
            throw new NotFoundError(`Es gibt kein Parkhaus mit der ID ${id}`);
        }

        const { tarifProStunde } = parkhaus;
        const parkhausDTO: ParkhausMitAdresseUndAutosDTO = {
            ...parkhaus,
            tarifProStunde: tarifProStunde.toNumber(),
        };

        this.#logger.debug('findById: parkhausDTO=%o', parkhausDTO);
        return parkhausDTO;
    }
}
