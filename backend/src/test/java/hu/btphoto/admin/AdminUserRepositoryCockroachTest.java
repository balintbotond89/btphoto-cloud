package hu.btphoto.admin;

import java.time.Instant;
import java.util.UUID;

import hu.btphoto.admin.model.AdminUser;
import hu.btphoto.admin.repository.AdminUserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest(properties = "spring.jpa.hibernate.ddl-auto=validate")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EnabledIfEnvironmentVariable(named = "BTPHOTO_TEST_JDBC_URL", matches = ".+")
class AdminUserRepositoryCockroachTest {

    @Autowired
    private AdminUserRepository adminUserRepository;

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getenv("BTPHOTO_TEST_JDBC_URL"));
        registry.add("spring.datasource.username", () -> System.getenv("BTPHOTO_TEST_DB_USERNAME"));
        registry.add("spring.datasource.password", () -> System.getenv("BTPHOTO_TEST_DB_PASSWORD"));
    }

    @Test
    void persistsAndFindsAdminByUsernameAndEmail() {
        var now = Instant.now();
        var adminUser = new AdminUser(
                UUID.randomUUID(),
                "integration-admin",
                "integration-admin@btphoto.test",
                "repository-test-hash-not-used-for-authentication",
                true,
                now,
                now
        );

        adminUserRepository.saveAndFlush(adminUser);

        var byUsername = adminUserRepository.findByUsernameIgnoreCase("INTEGRATION-ADMIN");
        var byEmail = adminUserRepository.findByEmailIgnoreCase("INTEGRATION-ADMIN@BTPHOTO.TEST");

        assertTrue(byUsername.isPresent());
        assertTrue(byEmail.isPresent());
        assertEquals(adminUser.getId(), byUsername.orElseThrow().getId());
        assertEquals(adminUser.getId(), byEmail.orElseThrow().getId());
    }
}
