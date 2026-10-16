package hu.btphoto.account.model;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "admin_user")
public class AppUser {
    @Id
    private UUID id;
    @Column(nullable = false, length = 64, unique = true)
    private String username;
    @Column(length = 254, unique = true)
    private String email;
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;
    @Column(nullable = false)
    private boolean active;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, length = 16)
    private ApprovalStatus approvalStatus;
    @Column(name = "approved_at")
    private Instant approvedAt;
    @Column(name = "approved_by")
    private UUID approvedBy;

    protected AppUser() {
    }

    public AppUser(UUID id, String username, String email, String hash, boolean active,
            Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.passwordHash = hash;
        this.active = active;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.approvalStatus = active ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING;
    }

    public UUID getId() { return id; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public ApprovalStatus getApprovalStatus() { return approvalStatus; }
    public Instant getApprovedAt() { return approvedAt; }
    public UUID getApprovedBy() { return approvedBy; }

    public void changePassword(String hash, Instant now) {
        passwordHash = hash;
        updatedAt = now;
    }
}
