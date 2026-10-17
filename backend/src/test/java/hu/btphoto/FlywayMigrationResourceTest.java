package hu.btphoto;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FlywayMigrationResourceTest {

    private static final String BASELINE_MIGRATION = "db/migration/V1__baseline.sql";
    private static final String ADMIN_USER_MIGRATION = "db/migration/V2__create_admin_user.sql";
    private static final Pattern VERSIONED_MIGRATION_NAME =
            Pattern.compile("^V[0-9]+__[a-z0-9_]+\\.sql$");

    @Test
    void packagesNonEmptyVersionedBaselineMigrationResource() throws IOException {
        var resource = new ClassPathResource(BASELINE_MIGRATION);
        assertTrue(resource.exists());

        var content = resource.getContentAsString(StandardCharsets.UTF_8);
        var filename = resource.getFilename();
        assertNotNull(filename);

        assertAll(
                () -> assertTrue(VERSIONED_MIGRATION_NAME.matcher(filename).matches()),
                () -> assertFalse(content.isBlank())
        );
    }

    @Test
    void packagesPhotographerMigrationWithoutBootstrapSecrets() throws IOException {
        var resource = new ClassPathResource("db/migration/V3__photographer_accounts.sql");
        var content = resource.getContentAsString(StandardCharsets.UTF_8);
        assertTrue(content.contains("CREATE TABLE system_admin"));
        assertTrue(content.contains("FOREIGN KEY (workspace_id, user_id)"));
        assertFalse(content.contains("INSERT INTO"));
    }

    @Test
    void packagesAdminUserMigrationResource() throws IOException {
        var resource = new ClassPathResource(ADMIN_USER_MIGRATION);
        assertTrue(resource.exists());

        var content = resource.getContentAsString(StandardCharsets.UTF_8);
        var filename = resource.getFilename();
        assertNotNull(filename);

        assertAll(
                () -> assertTrue(VERSIONED_MIGRATION_NAME.matcher(filename).matches()),
                () -> assertTrue(content.contains("CREATE TABLE admin_user")),
                () -> assertTrue(content.contains("password_hash")),
                () -> assertFalse(content.isBlank())
        );
    }
}
