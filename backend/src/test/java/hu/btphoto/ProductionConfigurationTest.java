package hu.btphoto;

import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.io.ClassPathResource;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ProductionConfigurationTest {
    @Test
    void productionLoggingAndSchemaFlagsHaveCorrectYamlTypes() throws Exception {
        var properties = new YamlPropertySourceLoader()
                .load("production", new ClassPathResource("application-cockroachdb.yml")).getFirst();
        assertEquals("OFF", properties.getProperty("logging.level.org.hibernate.SQL"));
        assertEquals("OFF", properties.getProperty("logging.level.org.hibernate.orm.jdbc.bind"));
        assertEquals("OFF", properties.getProperty("logging.level.org.hibernate.engine.jdbc.spi.SqlExceptionHelper"));
        assertEquals("validate", properties.getProperty("spring.jpa.hibernate.ddl-auto"));
        assertEquals(Boolean.TRUE, properties.getProperty("server.servlet.session.cookie.secure"));
    }
}
