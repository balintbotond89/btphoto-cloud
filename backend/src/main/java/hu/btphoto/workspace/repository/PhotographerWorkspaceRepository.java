package hu.btphoto.workspace.repository;

import java.util.Optional;
import java.util.UUID;

import hu.btphoto.workspace.model.PhotographerWorkspace;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotographerWorkspaceRepository extends JpaRepository<PhotographerWorkspace, UUID> {
    Optional<PhotographerWorkspace> findByPhotographerUserId(UUID userId);
}
