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
}
