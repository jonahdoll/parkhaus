/**
 * Das Modul besteht aus der Klasse {@linkcode WhereBuilder}.
 * @packageDocumentation
 */
import { type ParkhausWhereInput } from '../../generated/prisma/models/Parkhaus.ts';
import { type Suchparameter } from './suchparameter.mts';
import { getLogger } from '../../logger/logger.mts';

/** Typdefinitionen für die Suche mit der Parkhaus-ID. */
export type BuildIdParams = {
    /** ID des gesuchten Parkhauses. */
    readonly id: number;
    /** Sollen die Autos mitgeladen werden? */
    readonly mitAutos?: boolean;
};

const logger = getLogger('buildWher', 'func');

/**
 * WHERE-Klausel für die flexible Suche nach Parkhäusern bauen.
 * @param suchparameter JSON-Objekt mit Suchparameter.
 * @returns ParkhausWhereInput
 */
export const buildWhere = ({ ...restProps }: Suchparameter) => {
    logger.debug('build: restProps=%o', restProps);

    const where: ParkhausWhereInput = {};

    Object.entries(restProps).forEach(([key, value]) => {
        switch (key) {
            case 'name':
                where.name = { equals: value as string };
                break;
            case 'kapazitaet': {
                const kapazitaetNumber = Number.parseFloat(value as string);
                if (!Number.isNaN(kapazitaetNumber)) {
                    where.kapazitaet = { lte: kapazitaetNumber };
                }
                break;
            }
            case 'tarifProStunde': {
                const tarifNumber = Number.parseFloat(value as string);
                if (!Number.isNaN(tarifNumber)) {
                    where.tarifProStunde = { lte: tarifNumber };
                }
                break;
            }
            default:
                break;
        }
    });

    logger.debug('build: where=%o', where);
    return where;
};
