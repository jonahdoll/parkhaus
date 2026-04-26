SET search_path TO parkhaus;

COPY parkhaus FROM '/init/parkhaus/csv/parkhaus.csv' (FORMAT csv, DELIMITER ';', HEADER true);
COPY adresse FROM '/init/parkhaus/csv/adresse.csv' (FORMAT csv, DELIMITER ';', HEADER true);
COPY auto FROM '/init/parkhaus/csv/auto.csv' (FORMAT csv, DELIMITER ';', HEADER true);
