package hu.btphoto.profile.repository;

import java.util.Optional;
import java.util.UUID;

import hu.btphoto.profile.model.PhotographerProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotographerProfileRepository extends JpaRepository<PhotographerProfile, UUID> {
    Optional<PhotographerProfile> findByUserIdAndWorkspaceId(UUID userId, UUID workspaceId);
}
