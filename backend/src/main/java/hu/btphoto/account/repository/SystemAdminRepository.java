package hu.btphoto.account.repository;

import java.time.Instant;
import java.util.UUID;

import hu.btphoto.account.model.SystemAdmin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SystemAdminRepository extends JpaRepository<SystemAdmin, Short> {
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update SystemAdmin a set a.initialPasswordUsedAt = :now, a.rowVersion = a.rowVersion + 1 "
            + "where a.id = 1 and a.userId = :userId and a.requiresPasswordChange = true "
            + "and a.initialPasswordUsedAt is null")
    int consumeInitialPassword(@Param("userId") UUID userId, @Param("now") Instant now);
}
