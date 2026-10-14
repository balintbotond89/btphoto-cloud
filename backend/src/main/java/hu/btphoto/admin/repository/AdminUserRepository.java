package hu.btphoto.admin.repository;

import java.util.Optional;
import java.util.UUID;

import hu.btphoto.admin.model.AdminUser;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminUserRepository extends JpaRepository<AdminUser, UUID> {

    Optional<AdminUser> findByUsernameIgnoreCase(String username);

    Optional<AdminUser> findByEmailIgnoreCase(String email);
}
