-- Egyszeri, kézzel jóváhagyott provisionálás; nem Flyway üzleti migráció.
-- A két, külön erős jelszóval ellátott LOGIN usert előzetesen, biztonságos operátori csatornán kell létrehozni.
-- Meglévő btphoto_staging adatbázis esetén a CREATE hibával megáll: nincs automatikus felülírás/törlés.
CREATE DATABASE btphoto_staging OWNER btphoto_staging_migrator;
REVOKE ALL ON DATABASE btphoto_staging FROM public;
GRANT CONNECT ON DATABASE btphoto_staging TO btphoto_staging_app;
USE btphoto_staging;
REVOKE CREATE ON SCHEMA public FROM public;
GRANT ALL ON SCHEMA public TO btphoto_staging_migrator;
GRANT USAGE ON SCHEMA public TO btphoto_staging_app;
ALTER DEFAULT PRIVILEGES FOR ROLE btphoto_staging_migrator IN SCHEMA public
    GRANT SELECT ON TABLES TO btphoto_staging_app;
-- Az üzleti DML-jogokat az afterMigrate callback adja, a Flyway-history írása nélkül.
-- Flyway futása után ellenőrizni kell a tényleges, nem csak a default jogosultságokat.
-- A production adatbázis, meglévő felhasználó vagy globális szerepkör nem módosul.
