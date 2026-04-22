SET default_tablespace = parkhausspace;

CREATE SCHEMA IF NOT EXISTS AUTHORIZATION parkhaus;

ALTER ROLE parkhaus SET search_path = 'parkhaus';
set search_path to 'parkhaus';

CREATE TYPE kundentyp AS ENUM ('PREMIUM', 'BASIS', 'ANWOHNER');

CREATE TABLE IF NOT EXISTS parkhaus (
    id            integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    version       integer NOT NULL DEFAULT 0,
    name          text NOT NULL UNIQUE,
    kapazitaet    integer NOT NULL CHECK (kapazitaet >= 0),
    tarif_pro_stunde decimal(8,2) NOT NULL,
    erzeugt       timestamp NOT NULL DEFAULT NOW(),
    aktualisiert  timestamp NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adresse (
    id          integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    plz         text NOT NULL CHECK (plz ~ '\d{5}'),
    ort         text NOT NULL,
    strasse     text NOT NULL,
    hausnummer  text NOT NULL,
    parkhaus_id integer NOT NULL REFERENCES parkhaus ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS adresse_parkhaus_id_idx ON adresse(parkhaus_id);
CREATE INDEX IF NOT EXISTS adresse_plz_idx ON adresse(plz);

CREATE TABLE IF NOT EXISTS auto (
    id          integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    kennzeichen text NOT NULL,
    einfahrtszeit timestamp NOT NULL,
    kundentyp   kundentyp NOT NULL,
    parkhaus_id integer NOT NULL REFERENCES parkhaus ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS auto_parkhaus_id_idx ON auto(parkhaus_id);

CREATE TABLE IF NOT EXISTS parkhaus_file (
    id              integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    data            bytea NOT NULL,
    filename        text NOT NULL,
    mimetype        text,
    parkhaus_id         integer NOT NULL UNIQUE REFERENCES parkhaus ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS parkhaus_file_parkhaus_id_idx ON parkhaus_file(parkhaus_id);