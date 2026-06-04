// Copyright (C) 2016 - present Juergen Zimmermann, Hochschule Karlsruhe
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

/**
 * Das Modul besteht aus der asynchronen Funktion {@linkcode sendmail} für das
 * Verschicken von Emails.
 * @packageDocumentation
 */

import { type SendMailOptions, createTransport } from 'nodemailer';
import { getLogger } from '../logger/logger.mts';
import { mailConfig } from '../config/mail.mts';

/** Typdefinition für das Senden einer Email. */
export type SendMailParams = {
    /** Subject für die Email. */
    readonly subject: string;
    /** Body für die Email. */
    readonly body: string;
};

const logger = getLogger('sendmail', 'func');

const { activated, from, to } = mailConfig;
/**
 * Email mit Subject und Inhalt asynchron senden.
 * @param subject Subject vom Typ string.
 * @param body Inhalt vom Typ string.
 * @returns Promise mit void
 *
 * @author [Jürgen Zimmermann](mailto:Juergen.Zimmermann@h-ka.de)
 */
export const sendmail = async ({ subject, body }: SendMailParams) => {
    if (!activated) {
        logger.warn('Mail deaktiviert');
        return;
    }

    const mailOptions: SendMailOptions = { from, to, subject, html: body };
    logger.info('sendmail: Sende Mail "%s" an %s', subject, to);
    logger.debug('mailOptions=%o', mailOptions);

    const transport = createTransport(mailConfig.options);

    try {
        // Verbindung zum SMTP-Server vorab pruefen, damit Fehler sichtbar werden
        await transport.verify();
        const info = await transport.sendMail(mailOptions); // NOSONAR
        logger.info(
            'sendmail: Mail gesendet, messageId=%s, response=%s',
            info.messageId,
            info.response,
        );
    } catch (err) {
        const error = err as Error;
        logger.error(
            'sendmail: Fehler beim Senden der Mail an %s: %s',
            to,
            error.message,
        );
        logger.error(error);
    }
};
