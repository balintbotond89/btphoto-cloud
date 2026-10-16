package hu.btphoto.admin;

import hu.btphoto.TestTransactions;
import hu.btphoto.account.model.AppUser;
import hu.btphoto.account.model.SystemAdmin;
import hu.btphoto.account.repository.AppUserRepository;
import hu.btphoto.account.repository.SystemAdminRepository;
import hu.btphoto.admin.service.OperatorProvisioningService;
import hu.btphoto.exception.ApiProblem;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("no-database")
@Import(TestTransactions.class)
class OperatorProvisioningTest {
    @Autowired
    OperatorProvisioningService provisioning;
    @Autowired
    PasswordEncoder encoder;
    @MockitoBean
    AppUserRepository users;
    @MockitoBean
    SystemAdminRepository operators;
    @MockitoBean
    hu.btphoto.workspace.repository.PhotographerWorkspaceRepository workspaces;

    @Test
    void headlessSetupUsesHashAndNeverReinitializesExistingOperator() {
        String temporary = "setup-only";
        provisioning.create(temporary);
        var user = ArgumentCaptor.forClass(AppUser.class);
        var admin = ArgumentCaptor.forClass(SystemAdmin.class);
        verify(users).saveAndFlush(user.capture());
        verify(operators).saveAndFlush(admin.capture());
        assertEquals("admin", user.getValue().getUsername());
        assertTrue(encoder.matches(temporary, user.getValue().getPasswordHash()));
        assertTrue(admin.getValue().isRequiresPasswordChange());
        assertEquals(user.getValue().getId(), admin.getValue().getUserId());
        when(operators.existsById((short) 1)).thenReturn(true);
        assertThrows(ApiProblem.class, () -> provisioning.create("different-fixture"));
        verify(users, times(1)).saveAndFlush(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void explicitRecoveryRequiresConfirmedBindingAndRevokesPreviousSessions() {
        var id = java.util.UUID.randomUUID();
        var now = java.time.Instant.now();
        var user = new AppUser(id, "admin", null, encoder.encode("fixture-current"), true, now, now);
        var admin = new SystemAdmin(id, true);
        org.springframework.test.util.ReflectionTestUtils.setField(admin, "initialPasswordUsedAt", now);
        when(operators.findById((short) 1)).thenReturn(java.util.Optional.of(admin));
        when(users.findById(id)).thenReturn(java.util.Optional.of(user));
        assertThrows(ApiProblem.class, () -> provisioning.recover(java.util.UUID.randomUUID(), "fixture-reset"));
        provisioning.recover(id, "fixture-reset");
        assertTrue(encoder.matches("fixture-reset", user.getPasswordHash()));
        assertTrue(admin.isRequiresPasswordChange());
        org.junit.jupiter.api.Assertions.assertNull(admin.getInitialPasswordUsedAt());
        assertEquals(1, admin.getSessionVersion());
    }

    @Test
    void auditedLegacyBindingPreservesHashAndCannotAdoptPhotographer() {
        var id = java.util.UUID.randomUUID();
        var now = java.time.Instant.now();
        var user = new AppUser(id, "admin", null, "preserved-fixture", true, now, now);
        when(users.findById(id)).thenReturn(java.util.Optional.of(user));
        provisioning.adopt(id);
        assertEquals("preserved-fixture", user.getPasswordHash());
        verify(users, org.mockito.Mockito.never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
        when(workspaces.findByPhotographerUserId(id)).thenReturn(java.util.Optional.of(
                new hu.btphoto.workspace.model.PhotographerWorkspace(java.util.UUID.randomUUID(), id, now)));
        assertThrows(ApiProblem.class, () -> provisioning.adopt(id));
    }

    @Test
    void existingLegacyAdminIsNeverOverwrittenByCreate() {
        var now = java.time.Instant.now();
        when(users.findByUsernameIgnoreCase("admin")).thenReturn(java.util.Optional.of(
                new AppUser(java.util.UUID.randomUUID(), "admin", null, "preserved-fixture", true, now, now)));
        assertThrows(ApiProblem.class, () -> provisioning.create("fixture-initial"));
        verify(users, org.mockito.Mockito.never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void emptyBootstrapSecretIsRejected() {
        assertThrows(ApiProblem.class, () -> provisioning.create(""));
    }
}
