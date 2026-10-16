package hu.btphoto.admin.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import hu.btphoto.account.model.ApprovalStatus;
import hu.btphoto.account.service.AccountStore;
import hu.btphoto.exception.ApiProblem;
import hu.btphoto.profile.dto.ProfileResponse;
import hu.btphoto.profile.model.PhotographerProfile;
import hu.btphoto.profile.service.ProfileService;
import hu.btphoto.security.AccountPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApprovalService {
    private static final Logger LOG = LoggerFactory.getLogger(ApprovalService.class);
    private final AccountStore store;
    private final ProfileService profiles;

    public ApprovalService(AccountStore store, ProfileService profiles) {
        this.store = store;
        this.profiles = profiles;
    }

    private void requireOperator(AccountPrincipal principal) {
        var operator = store.operators().findById((short) 1).orElseThrow(this::denied);
        if (!"ADMIN".equals(principal.getRole()) || principal.isPasswordChangeRequired()
                || operator.isRequiresPasswordChange() || !operator.getUserId().equals(principal.getUserId())
                || operator.getSessionVersion() != principal.getSessionVersion()) {
            throw denied();
        }
    }

    @Transactional(readOnly = true)
    public List<ProfileResponse> pending(AccountPrincipal principal) {
        requireOperator(principal);
        return store.users().findTop100ByApprovalStatusOrderByCreatedAtAsc(ApprovalStatus.PENDING).stream()
                .filter(user -> !user.isActive())
                .map(user -> profiles.describe(pendingProfile(user.getId()),
                        "/api/admin/registrations/" + user.getId() + "/avatar")).toList();
    }

    @Transactional
    public void decide(AccountPrincipal principal, UUID accountId, boolean approve) {
        requireOperator(principal);
        pendingProfile(accountId);
        var status = approve ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
        int changed = store.users().decidePending(accountId, status, approve, Instant.now(),
                principal.getUserId(), ApprovalStatus.PENDING);
        if (changed != 1) {
            throw new ApiProblem(HttpStatus.CONFLICT, "REGISTRATION_DECIDED",
                    "A kérelem már nem vár elbírálásra.");
        }
        // Az audit csak azonosítókat tárol; név, e-mail, cím és jelszó nem kerül a naplóba.
        org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                new org.springframework.transaction.support.TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        LOG.info("registration_decision account={} operator={} result={}",
                                accountId, principal.getUserId(), status);
                    }
                });
    }

    @Transactional(readOnly = true)
    public byte[] avatar(AccountPrincipal principal, UUID accountId) {
        requireOperator(principal);
        return profiles.avatar(pendingProfile(accountId));
    }

    private PhotographerProfile pendingProfile(UUID accountId) {
        var user = store.users().findById(accountId).orElseThrow(this::notFound);
        if (user.isActive() || user.getApprovalStatus() != ApprovalStatus.PENDING
                || store.operators().findById((short) 1)
                        .map(admin -> admin.getUserId().equals(accountId)).orElse(false)) {
            throw notFound();
        }
        var workspace = store.workspaces().findByPhotographerUserId(accountId).orElseThrow(this::notFound);
        return store.profiles().findByUserIdAndWorkspaceId(accountId, workspace.getId()).orElseThrow(this::notFound);
    }

    private ApiProblem notFound() {
        return new ApiProblem(HttpStatus.NOT_FOUND, "NOT_FOUND", "A kérelem nem található.");
    }

    private ApiProblem denied() {
        return new ApiProblem(HttpStatus.FORBIDDEN, "ACCESS_DENIED", "Az elbírálás nem engedélyezett.");
    }
}
