-- A belső admin felhasználó hitelesítési adatainak sémája.
CREATE TABLE admin_user (
    id UUID PRIMARY KEY,
    username VARCHAR(64) NOT NULL,
    email VARCHAR(254),
    password_hash VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT current_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT current_timestamp(),
    CONSTRAINT uq_admin_user_username UNIQUE (username),
    CONSTRAINT uq_admin_user_email UNIQUE (email),
    CONSTRAINT ck_admin_user_username_normalized CHECK (username = lower(username)),
    CONSTRAINT ck_admin_user_email_normalized CHECK (email IS NULL OR email = lower(email))
);
