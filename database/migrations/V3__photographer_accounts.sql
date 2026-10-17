-- Fotósfiókok, egyetlen üzemeltető és tenant-elkülönített profilok.
ALTER TABLE admin_user ADD COLUMN approval_status VARCHAR(16) NOT NULL DEFAULT 'APPROVED';
ALTER TABLE admin_user ADD COLUMN approved_at TIMESTAMPTZ;
ALTER TABLE admin_user ADD COLUMN approved_by UUID REFERENCES admin_user(id);
ALTER TABLE admin_user ADD CONSTRAINT ck_account_approval
    CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED'));

CREATE TABLE system_admin (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    user_id UUID NOT NULL UNIQUE REFERENCES admin_user(id),
    requires_password_change BOOLEAN NOT NULL,
    initial_password_used_at TIMESTAMPTZ,
    session_version BIGINT NOT NULL DEFAULT 0,
    row_version BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE photographer_workspace (
    id UUID PRIMARY KEY,
    photographer_user_id UUID NOT NULL UNIQUE REFERENCES admin_user(id),
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (id, photographer_user_id)
);
CREATE TABLE photographer_profile (
    user_id UUID PRIMARY KEY REFERENCES admin_user(id),
    workspace_id UUID NOT NULL UNIQUE REFERENCES photographer_workspace(id),
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    salutation VARCHAR(24),
    phone VARCHAR(32),
    mobile VARCHAR(32),
    home_address_json TEXT,
    site_address_json TEXT,
    avatar_path VARCHAR(255),
    FOREIGN KEY (workspace_id, user_id) REFERENCES photographer_workspace(id, photographer_user_id)
);
CREATE TABLE photographer_business (
    user_id UUID PRIMARY KEY REFERENCES photographer_profile(user_id),
    business_type VARCHAR(32) NOT NULL,
    business_name VARCHAR(200) NOT NULL,
    tax_number VARCHAR(32) NOT NULL,
    registration_number VARCHAR(32),
    address_json TEXT NOT NULL
);
-- Az avatar csak a saját workspace UUID-prefixében lehet.
ALTER TABLE photographer_profile ADD CONSTRAINT ck_avatar_tenant_path
    CHECK (avatar_path IS NULL OR
           avatar_path LIKE 'tenants/' || workspace_id::STRING || '/avatars/' || user_id::STRING || '/%');
