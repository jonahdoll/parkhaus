/**
 * Das Modul besteht aus der Klasse {@linkcode ParkhausWriteService} für die
 * Schreiboperationen.
 * @packageDocumentation
 */

import {
    NotFoundError,
    ParkhausExistsError,
    VersionInvalidError,
    VersionOutdatedError,
} from './errors.mts';
import {
    type ParkhausFile,
    type Prisma,
} from '../../generated/prisma/client.ts';
import { ParkhausService } from './parkhaus-service.mts';
import { getLogger } from '../../logger/logger.mts';
import { prismaClient } from '../../config/prisma-client.mts';
import { sendmail } from '../../mail/sendmail.mts';

export type ParkhausCreate = Prisma.ParkhausCreateInput;
type ParkhausCreated = Prisma.ParkhausGetPayload<{
    include: {
        adresse: true;
        autos: true;
    };
}>;

export type ParkhausUpdate = Prisma.ParkhausUpdateInput;
/** Typdefinitionen zum Aktualisieren eines Parkhauses mit `update`. */
export type UpdateParams = {
    /** ID des zu aktualisierenden Parkhauses. */
    readonly id: number | undefined;
    /** Parkhaus-Objekt mit den aktualisierten Werten. */
    readonly parkhaus: ParkhausUpdate;
    /** Versionsnummer für die zu aktualisierenden Werte. */
    readonly version: string;
};
type ParkhausUpdated = Prisma.ParkhausGetPayload<{}>;

type ParkhausFileCreate = Prisma.ParkhausFileUncheckedCreateInput;
export type ParkhausFileCreated = Prisma.ParkhausFileGetPayload<{}>;

/**
 * Die Klasse `ParkhausWriteService` implementiert den Anwendungskern für das
 * Schreiben von Parkhäusern und greift mit _Prisma_ auf die DB zu.
 */
export class ParkhausWriteService {
    private static readonly VERSION_PATTERN = /^"\d{1,3}"/u;

    readonly #readService: ParkhausService;

    readonly #logger = getLogger(ParkhausWriteService.name);

    constructor(readService: ParkhausService) {
        this.#readService = readService;
    }

    /**
     * Ein neues Parkhaus soll angelegt werden.
     * @param parkhaus Das neu abzulegende Parkhaus
     * @returns Die ID des neu angelegten Parkhauses
     */
    async create(parkhaus: ParkhausCreate) {
        this.#logger.debug('create: parkhaus=%o', parkhaus);
        await this.#validateCreate(parkhaus);

        // Neuer Datensatz mit generierter ID
        let parkhausDb: ParkhausCreated | undefined;
        await prismaClient.$transaction(async (tx) => {
            parkhausDb = await tx.parkhaus.create({
                data: parkhaus,
                include: { adresse: true, autos: true },
            });
        });
        await ParkhausWriteService.#sendmail({
            id: parkhausDb?.id ?? 'N/A',
            titel: parkhausDb?.name ?? 'N/A',
        });

        this.#logger.debug('create: parkhausDb.id=%s', parkhausDb?.id);
        return parkhausDb?.id ?? Number.NaN;
    }

    /**
     * Zu einem vorhandenen Parkhaus eine Binärdatei mit z.B. einem Bild abspeichern.
     * @param parkhausId ID des vorhandenen Parkhauses
     * @param data Bytes der Datei als Buffer Node
     * @param name Dateiname
     * @param size Dateigröße in Bytes
     * @param type MIME-Typ, z.B. image/png
     * @returns Entity-Objekt für `ParkhausFile`
     */
    // oxlint-disable-next-line max-params
    async addFile(
        parkhausId: number,
        data: Buffer,
        name: string,
        size: number,
        type: string,
    ): Promise<Readonly<ParkhausFile> | undefined> {
        this.#logger.debug(
            'addFile: parkhausId=%d, filename=%s, size=%d',
            parkhausId,
            name,
            size,
        );

        let parkhausFileCreated: ParkhausFileCreated | undefined;
        await prismaClient.$transaction(async (tx) => {
            // Parkhaus ermitteln, falls vorhanden
            const parkhaus = await tx.parkhaus.findUnique({
                where: { id: parkhausId },
            });
            if (parkhaus === null) {
                this.#logger.debug(
                    'Es gibt kein Parkhaus mit der ID %d',
                    parkhausId,
                );
                throw new NotFoundError(
                    `Es gibt kein Parkhaus mit der ID ${parkhausId}.`,
                );
            }

            // evtl. vorhandene Datei löschen
            await tx.parkhausFile.deleteMany({ where: { parkhausId } });

            const parkhausFile: ParkhausFileCreate = {
                filename: name,
                data: data as Uint8Array<ArrayBuffer>,
                mimetype: type,
                parkhausId,
            };
            parkhausFileCreated = await tx.parkhausFile.create({
                data: parkhausFile,
            });
        });

        this.#logger.debug(
            'addFile: id=%s, byteLength=%s, filename=%s, mimetype=%s',
            parkhausFileCreated?.id,
            parkhausFileCreated?.data.byteLength,
            parkhausFileCreated?.filename,
            parkhausFileCreated?.mimetype,
        );
        return parkhausFileCreated;
    }

    /**
     * Ein vorhandenes Parkhaus soll aktualisiert werden. "Destructured" Argument
     * mit id (ID des zu aktualisierenden Parkhauses), parkhaus (zu aktualisierendes Parkhaus)
     * und version (Versionsnummer für optimistische Synchronisation).
     * @returns Die neue Versionsnummer gemäß optimistischer Synchronisation
     * @throws NotFoundException falls kein Parkhaus zur ID vorhanden ist
     * @throws VersionInvalidException falls die Versionsnummer ungültig ist
     * @throws VersionOutdatedException falls die Versionsnummer veraltet ist
     */
    async update({ id, parkhaus, version }: UpdateParams) {
        this.#logger.debug(
            'update: id=%s, parkhaus=%o, version=%s',
            id,
            parkhaus,
            version,
        );
        if (id === undefined) {
            this.#logger.debug('update: Keine gueltige ID');
            throw new NotFoundError(`Es gibt kein Parkhaus mit der ID ${id}.`);
        }

        await this.#validateUpdate(id, version);

        parkhaus.version = { increment: 1 };
        let parkhausUpdated: ParkhausUpdated | undefined;
        await prismaClient.$transaction(async (tx) => {
            parkhausUpdated = await tx.parkhaus.update({
                data: parkhaus,
                where: { id },
            });
        });
        this.#logger.debug(
            'update: parkhausUpdated=%s',
            JSON.stringify(parkhausUpdated),
        );

        return parkhausUpdated?.version ?? Number.NaN;
    }

    /**
     * Ein Parkhaus wird asynchron anhand seiner ID gelöscht.
     *
     * @param id ID des zu löschenden Parkhauses
     * @returns true, falls das Parkhaus vorhanden war und gelöscht wurde. Sonst false.
     */
    async delete(id: number) {
        this.#logger.debug('delete: id=%d', id);

        const parkhaus = await prismaClient.parkhaus.findUnique({
            where: { id },
        });
        if (parkhaus === null) {
            this.#logger.debug('delete: not found');
            return false;
        }

        await prismaClient.$transaction(async (tx) => {
            await tx.parkhaus.delete({ where: { id } });
        });

        this.#logger.debug('delete');
        return true;
    }

    async #validateCreate({
        name,
    }: Prisma.ParkhausCreateInput): Promise<undefined> {
        // FIX: name statt parkhausId verwenden
        this.#logger.debug('#validateCreate: name=%s', name);
        if (name === undefined) {
            this.#logger.debug('#validateCreate: ok');
            return;
        }

        const anzahl = await prismaClient.parkhaus.count({ where: { name } });
        if (anzahl > 0) {
            this.#logger.debug('#validateCreate: name existiert: %s', name);
            throw new ParkhausExistsError(name);
        }
        this.#logger.debug('#validateCreate: ok');
    }

    static async #sendmail({
        id,
        titel,
    }: {
        id: number | 'N/A';
        titel: string;
    }) {
        const subject = `Neues Parkhaus ${id}`;
        const body = `Das Parkhaus mit dem Titel <strong>${titel}</strong> ist angelegt`;
        await sendmail({ subject, body });
    }

    async #validateUpdate(id: number, versionStr: string) {
        this.#logger.debug(
            '#validateUpdate: id=%d, versionStr=%s',
            id,
            versionStr,
        );
        if (!ParkhausWriteService.VERSION_PATTERN.test(versionStr)) {
            throw new VersionInvalidError(versionStr);
        }

        const version = Number.parseInt(versionStr.slice(1, -1), 10);
        const parkhausDb = await this.#readService.findById({ id });

        if (version < parkhausDb.version) {
            this.#logger.debug('#validateUpdate: versionDb=%d', version);
            throw new VersionOutdatedError(version);
        }
    }
}
