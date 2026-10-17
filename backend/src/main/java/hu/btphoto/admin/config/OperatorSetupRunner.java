package hu.btphoto.admin.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.util.Arrays;
import java.util.Set;
import java.util.UUID;

import hu.btphoto.admin.service.OperatorProvisioningService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("operator-setup")
public class OperatorSetupRunner implements ApplicationRunner {
    private final OperatorProvisioningService provisioning;
    private final ConfigurableApplicationContext context;
    private final String passwordFile;
    private final String recoveryId;
    private final String adoptionId;

    public OperatorSetupRunner(OperatorProvisioningService provisioning, ConfigurableApplicationContext context,
            @Value("${BTPHOTO_BOOTSTRAP_PASSWORD_FILE:}") String passwordFile,
            @Value("${BTPHOTO_OPERATOR_RECOVERY_USER_ID:}") String recoveryId,
            @Value("${BTPHOTO_OPERATOR_ADOPT_USER_ID:}") String adoptionId) {
        this.provisioning = provisioning;
        this.context = context;
        this.passwordFile = passwordFile;
        this.recoveryId = recoveryId;
        this.adoptionId = adoptionId;
    }

    @Override
    public void run(ApplicationArguments arguments) throws IOException {
        if (!context.getEnvironment().getProperty("spring.main.web-application-type", "").equals("none")) {
            throw new IllegalStateException("Az inicializálás csak HTTP-kiszolgálás nélkül engedélyezett.");
        }
        try {
            if (!adoptionId.isBlank()) {
                if (!recoveryId.isBlank()) {
                    throw new IllegalStateException("Az auditált átvétel és a helyreállítás külön művelet.");
                }
                provisioning.adopt(UUID.fromString(adoptionId));
            } else {
                char[] secret = readSecret();
                try {
                    if (recoveryId.isBlank()) {
                        provisioning.create(new String(secret));
                    } else {
                        provisioning.recover(UUID.fromString(recoveryId), new String(secret));
                    }
                } finally {
                    Arrays.fill(secret, '\0');
                }
            }
            System.out.println("Az üzemeltetői beállítás sikeres; egyszeri belépés és jelszócsere kötelező.");
        } finally {
            context.close();
        }
    }

    private char[] readSecret() throws IOException {
        if (passwordFile.isBlank()) {
            var console = System.console();
            if (console == null) {
                throw new IllegalStateException("Rejtett terminál vagy root-only secretfájl szükséges.");
            }
            char[] value = console.readPassword("Ideiglenes üzemeltetői jelszó: ");
            if (value == null) {
                throw new IllegalStateException("A hitelesítő adat megadása megszakadt.");
            }
            return value;
        }
        Path path = Path.of(passwordFile);
        if (Files.isSymbolicLink(path) || !Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)
                || Files.size(path) > 256) {
            throw new IllegalStateException("Hibás secretfájl.");
        }
        var permissions = Files.getPosixFilePermissions(path, LinkOption.NOFOLLOW_LINKS);
        if (!Set.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE).containsAll(permissions)) {
            throw new IllegalStateException("A secretfájl nem lehet csoport vagy más felhasználó által olvasható.");
        }
        String value = Files.readString(path, StandardCharsets.UTF_8);
        if (value.endsWith("\n")) {
            value = value.substring(0, value.length() - 1);
            if (value.endsWith("\r")) {
                value = value.substring(0, value.length() - 1);
            }
        }
        return value.toCharArray();
    }
}
