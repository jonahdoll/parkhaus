/**
 * Das Modul besteht aus Typdefinitionen für die Suche in `ParkhausService`.
 * @packageDocumentation
 */

// Typdefinition für `find`
export type Suchparameter = {
    readonly name?: string;
    readonly kapazitaet?: number;
    readonly tarifProStunde?: number;
};

// gueltige Namen fuer die Suchparameter
export const suchparameterNamen = ['name', 'kapazitaet', 'tarifProStunde'];
