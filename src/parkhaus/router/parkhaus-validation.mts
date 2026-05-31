// oxlint-disable no-magic-numbers

import { z } from 'zod';

const ParkhausComplete = z.strictObject({
    id: z.union([z.number().int().gt(0), z.string().regex(/^[1-9]\d*$/u)]),
    version: z.int().gte(0),
    name: z.string().regex(/^\w.*/u).max(100),
    kapazitaet: z.number().int().gt(0),
    tarifProStunde: z.number().gte(0),
    erzeugt: z.coerce.date().optional(),
    aktualisiert: z.coerce.date().optional(),
    adresse: z.strictObject({
        plz: z.string().min(1).max(10),
        ort: z.string().min(1).max(100),
        strasse: z.string().min(1).max(100),
        hausnummer: z.string().min(1).max(10),
    }),
    autos: z
        .array(
            z.strictObject({
                id: z.number().int().gt(0).optional(),
                kennzeichen: z.string().min(1).max(20),
                einfahrtszeit: z.coerce.date(),
                kundentyp: z.enum(['PREMIUM', 'BASIS', 'ANWOHNER']),
            }),
        )
        .optional(),
});
export const ParkhausNeuSchema = ParkhausComplete.omit({
    id: true,
    version: true,
}).readonly();

export const ParkhausUpdateSchema = ParkhausComplete.omit({
    id: true,
    version: true,
    adresse: true,
    autos: true,
}).readonly();

export const ParkhausUpdateGraphQLSchema = ParkhausComplete.omit({
    adresse: true,
    autos: true,
}).readonly();

export type ParkhausNeuType = z.infer<typeof ParkhausNeuSchema>;
export type ParkhausUpdateType = z.infer<typeof ParkhausUpdateSchema>;
