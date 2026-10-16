package hu.btphoto.account.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import hu.btphoto.account.model.AppUser;
import hu.btphoto.account.model.ApprovalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
    Optional<AppUser> findByUsernameIgnoreCase(String username);
    Optional<AppUser> findByEmailIgnoreCase(String email);
    List<AppUser> findTop100ByApprovalStatusOrderByCreatedAtAsc(ApprovalStatus status);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update AppUser u set u.approvalStatus = :status, u.active = :active, "
            + "u.approvedAt = :now, u.approvedBy = :operator, u.updatedAt = :now "
            + "where u.id = :id and u.approvalStatus = :pending and u.active = false")
    int decidePending(@Param("id") UUID id, @Param("status") ApprovalStatus status,
            @Param("active") boolean active, @Param("now") Instant now,
            @Param("operator") UUID operator, @Param("pending") ApprovalStatus pending);
}
