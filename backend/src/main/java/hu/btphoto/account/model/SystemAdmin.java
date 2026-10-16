package hu.btphoto.account.model;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "system_admin")
public class SystemAdmin {
    @Id
    private Short id;
    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;
    @Column(name = "requires_password_change", nullable = false)
    private boolean requiresPasswordChange;
    @Column(name = "initial_password_used_at")
    private Instant initialPasswordUsedAt;
    @Column(name = "session_version", nullable = false)
    private long sessionVersion;
    @Version
    @Column(name = "row_version", nullable = false)
    // A null objektumverzió új bindingnál INSERT-et kényszerít, nem meglévő singleton MERGE-et.
    private Long rowVersion;

    protected SystemAdmin() {
    }

    public SystemAdmin(UUID userId, boolean requiresPasswordChange) {
        this.id = 1;
        this.userId = userId;
        this.requiresPasswordChange = requiresPasswordChange;
    }

    public Short getId() { return id; }
    public UUID getUserId() { return userId; }
    public boolean isRequiresPasswordChange() { return requiresPasswordChange; }
    public Instant getInitialPasswordUsedAt() { return initialPasswordUsedAt; }
    public long getSessionVersion() { return sessionVersion; }

    public void passwordChanged() {
        requiresPasswordChange = false;
        sessionVersion++;
    }

    public void requireNewInitialPassword() {
        requiresPasswordChange = true;
        initialPasswordUsedAt = null;
        sessionVersion++;
    }
}
