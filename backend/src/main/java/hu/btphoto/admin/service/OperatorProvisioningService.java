package hu.btphoto.admin.service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

import hu.btphoto.account.model.AppUser;
import hu.btphoto.account.model.SystemAdmin;
import hu.btphoto.account.service.AccountStore;
import hu.btphoto.exception.ApiProblem;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OperatorProvisioningService {
    private final AccountStore store;
    private final PasswordEncoder encoder;

    public OperatorProvisioningService(AccountStore store, PasswordEncoder encoder) {
        this.store = store;
        this.encoder = encoder;
    }

    private void validateTemporary(String temporaryPassword) {
        if (temporaryPassword == null || temporaryPassword.isEmpty()
                || !StandardCharsets.UTF_8.newEncoder().canEncode(temporaryPassword)
                || temporaryPassword.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiProblem(HttpStatus.BAD_REQUEST, "INVALID_BOOTSTRAP", "Hibás ideiglenes hitelesítő adat.");
        }
    }

    @Transactional
    public void create(String temporaryPassword) {
        validateTemporary(temporaryPassword);
        if (store.operators().existsById((short) 1)
                || store.users().findByUsernameIgnoreCase("admin").isPresent()) {
            throw new ApiProblem(HttpStatus.CONFLICT, "OPERATOR_EXISTS",
                    "Az inicializálás nem írhat felül meglévő fiókot. Külön audit szükséges.");
        }
        var now = Instant.now();
        var id = UUID.randomUUID();
        store.users().saveAndFlush(new AppUser(id, "admin", null, encoder.encode(temporaryPassword),
                true, now, now));
        store.operators().saveAndFlush(new SystemAdmin(id, true));
    }

    @Transactional
    public void adopt(UUID confirmedLegacyId) {
        if (store.operators().existsById((short) 1)) {
            throw new ApiProblem(HttpStatus.CONFLICT, "OPERATOR_EXISTS", "Az üzemeltető már beállított.");
        }
        var user = store.users().findById(confirmedLegacyId).orElseThrow(() ->
                new ApiProblem(HttpStatus.CONFLICT, "OPERATOR_MISSING", "Az auditált fiók hiányzik."));
        if (!"admin".equals(user.getUsername()) || !user.isActive()
                || user.getApprovalStatus() != hu.btphoto.account.model.ApprovalStatus.APPROVED
                || store.workspaces().findByPhotographerUserId(confirmedLegacyId).isPresent()) {
            throw new ApiProblem(HttpStatus.CONFLICT, "OPERATOR_MISMATCH", "Az auditált fiók nem vehető át.");
        }
        // Meglévő jelszóhash és hitelesítési rekord változtatás nélkül marad.
        store.operators().saveAndFlush(new SystemAdmin(confirmedLegacyId, true));
    }

    @Transactional
    public void recover(UUID confirmedOperatorId, String temporaryPassword) {
        validateTemporary(temporaryPassword);
        var operator = store.operators().findById((short) 1).orElseThrow(() ->
                new ApiProblem(HttpStatus.CONFLICT, "OPERATOR_MISSING", "Az üzemeltetői binding hiányzik."));
        if (!operator.getUserId().equals(confirmedOperatorId)
                || store.workspaces().findByPhotographerUserId(confirmedOperatorId).isPresent()) {
            throw new ApiProblem(HttpStatus.CONFLICT, "OPERATOR_MISMATCH", "Az üzemeltetői azonosító nem egyezik.");
        }
        var user = store.users().findById(confirmedOperatorId).orElseThrow(() ->
                new ApiProblem(HttpStatus.CONFLICT, "OPERATOR_MISSING", "Az üzemeltetői fiók hiányzik."));
        if (!"admin".equals(user.getUsername()) || !user.isActive()
                || user.getApprovalStatus() != hu.btphoto.account.model.ApprovalStatus.APPROVED) {
            throw new ApiProblem(HttpStatus.CONFLICT, "OPERATOR_MISMATCH", "Külön fiókaudit szükséges.");
        }
        user.changePassword(encoder.encode(temporaryPassword), Instant.now());
        operator.requireNewInitialPassword();
        store.users().saveAndFlush(user);
        store.operators().saveAndFlush(operator);
    }
}
