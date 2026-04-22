CREATE USER parkhaus PASSWORD 'p';

CREATE DATABASE parkhaus;

GRANT ALL ON DATABASE parkhaus TO parkhaus;

CREATE TABLESPACE parkhausspace OWNER parkhaus LOCATION '/tablespace/parkhaus';
