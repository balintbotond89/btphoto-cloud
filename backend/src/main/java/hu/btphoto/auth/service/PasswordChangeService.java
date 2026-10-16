package hu.btphoto.auth.service;

import java.time.Instant;

import hu.btphoto.account.service.AccountStore;
import hu.btphoto.auth.dto.PasswordChangeRequest;
import hu.btphoto.exception.ApiProblem;
import hu.btphoto.security.AccountPrincipal;
import hu.btphoto.security.PasswordPolicy;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordChangeService {
    private final AccountStore store;
    private final PasswordEncoder encoder;
    private final PasswordPolicy policy;

    public PasswordChangeService(AccountStore store, PasswordEncoder encoder, PasswordPolicy policy) {
        this.store = store;
        this.encoder = encoder;
        this.policy = policy;
    }

    @Transactional
    public void change(AccountPrincipal principal, PasswordChangeRequest request) {
        var admin = store.operators().findById((short) 1).orElseThrow(this::denied);
        if (!"ADMIN".equals(principal.getRole()) || !admin.getUserId().equals(principal.getUserId())
                || admin.getSessionVersion() != principal.getSessionVersion()
                || admin.isRequiresPasswordChange() != principal.isPasswordChangeRequired()
                || (admin.isRequiresPasswordChange() && admin.getInitialPasswordUsedAt() == null)) {
            throw denied();
        }
        var user = store.users().findById(principal.getUserId()).orElseThrow(this::denied);
        policy.validate(request.newPassword(), request.confirmation());
        if ((!admin.isRequiresPasswordChange() && (request.currentPassword() == null
                || !encoder.matches(request.currentPassword(), user.getPasswordHash())))
                || encoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new ApiProblem(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD_CHANGE",
                    "A jelenlegi jelszó hibás, vagy az új jelszó nem különbözik.");
        }
        user.changePassword(encoder.encode(request.newPassword()), Instant.now());
        admin.passwordChanged();
        store.users().saveAndFlush(user);
        store.operators().saveAndFlush(admin);
    }

    private ApiProblem denied() {
        return new ApiProblem(HttpStatus.FORBIDDEN, "ACCESS_DENIED", "A jelszócsere nem engedélyezett.");
    }
}
