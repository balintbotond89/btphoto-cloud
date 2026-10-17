package hu.btphoto.registration;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import javax.imageio.ImageIO;

import com.fasterxml.jackson.databind.ObjectMapper;
import hu.btphoto.account.model.AppUser;
import hu.btphoto.account.model.SystemAdmin;
import hu.btphoto.account.repository.AppUserRepository;
import hu.btphoto.account.repository.SystemAdminRepository;
import hu.btphoto.account.service.AccountStore;
import hu.btphoto.registration.dto.RegistrationRequest;
import hu.btphoto.registration.service.RegistrationService;
import hu.btphoto.security.PasswordPolicy;
import hu.btphoto.storage.NfsAvatarStorageService;
import hu.btphoto.workspace.repository.PhotographerWorkspaceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class RegistrationCompensationTest {
    @TempDir
    Path root;

    @Test
    void databaseFailureCompensatesOnlyTheRequestsFile() throws Exception {
        var store = mock(AccountStore.class);
        var users = mock(AppUserRepository.class);
        var operators = mock(SystemAdminRepository.class);
        var spaces = mock(PhotographerWorkspaceRepository.class);
        when(store.users()).thenReturn(users);
        when(store.operators()).thenReturn(operators);
        when(store.workspaces()).thenReturn(spaces);
        var id = UUID.randomUUID();
        var now = Instant.now();
        when(operators.findById((short) 1)).thenReturn(Optional.of(new SystemAdmin(id, false)));
        when(users.findById(id)).thenReturn(Optional.of(new AppUser(id, "admin", null, "fixture", true, now, now)));
        when(users.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("Fixture DB-hiba"));
        var storage = new NfsAvatarStorageService(root.toString(), false);
        var bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(100, 100, BufferedImage.TYPE_INT_RGB), "PNG", bytes);
        var file = new MockMultipartFile("avatar", bytes.toByteArray());
        var otherWorkspace = UUID.randomUUID();
        var otherAccount = UUID.randomUUID();
        String preserved = storage.store(otherWorkspace, otherAccount, file);
        var service = new RegistrationService(store, PasswordEncoderFactories.createDelegatingPasswordEncoder(),
                new PasswordPolicy(), storage, new ObjectMapper(), true);
        var request = new RegistrationRequest("Fotós", "Fixture", "", "new@fixture.test",
                "fixture-long-password", "fixture-long-password", "", "", null, null, false, null);
        var tx = new TransactionTemplate(new AbstractPlatformTransactionManager() {
            private static final long serialVersionUID = 1L;
            @Override
            protected Object doGetTransaction() { return new Object(); }
            @Override
            protected void doBegin(Object transaction, TransactionDefinition definition) { }
            @Override
            protected void doCommit(DefaultTransactionStatus status) { }
            @Override
            protected void doRollback(DefaultTransactionStatus status) { }
        });
        assertThrows(DataIntegrityViolationException.class,
                () -> tx.executeWithoutResult(status -> service.register(request, file)));
        assertEquals(256, ImageIO.read(new java.io.ByteArrayInputStream(
                storage.read(otherWorkspace, otherAccount, preserved))).getWidth());
        try (var paths = Files.walk(root)) {
            assertEquals(1, paths.filter(path -> path.toString().endsWith(".png")).count());
        }
    }

    @Test
    void registrationIsDisabledByDefaultWithoutDatabaseOrStorageSideEffects() {
        var store = mock(AccountStore.class);
        var storage = mock(hu.btphoto.storage.AvatarStorageService.class);
        var service = new RegistrationService(store, PasswordEncoderFactories.createDelegatingPasswordEncoder(),
                new PasswordPolicy(), storage, new ObjectMapper(), false);
        assertThrows(hu.btphoto.exception.ApiProblem.class, () -> service.register(null, null));
        verifyNoInteractions(store, storage);
    }
}
