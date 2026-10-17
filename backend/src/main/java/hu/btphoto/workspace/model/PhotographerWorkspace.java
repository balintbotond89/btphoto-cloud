package hu.btphoto.workspace.model;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "photographer_workspace")
public class PhotographerWorkspace {
    @Id
    private UUID id;
    @Column(name = "photographer_user_id", nullable = false, unique = true)
    private UUID photographerUserId;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected PhotographerWorkspace() {
    }

    public PhotographerWorkspace(UUID id, UUID userId, Instant createdAt) {
        this.id = id;
        this.photographerUserId = userId;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public UUID getPhotographerUserId() { return photographerUserId; }
}
