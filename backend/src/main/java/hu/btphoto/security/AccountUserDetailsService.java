package hu.btphoto.security;

import java.util.Locale;

import hu.btphoto.account.model.ApprovalStatus;
import hu.btphoto.account.service.AccountStore;
import hu.btphoto.exception.ApiProblem;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AccountUserDetailsService implements UserDetailsService {
    private static final String INVALID = "Érvénytelen hitelesítési adatok.";
    private final AccountStore store;

    public AccountUserDetailsService(AccountStore store) {
        this.store = store;
    }

    @Override
    public UserDetails loadUserByUsername(String identifier) {
        try {
            var normalized = identifier.trim().toLowerCase(Locale.ROOT);
            var user = store.users().findByUsernameIgnoreCase(normalized)
                    .or(() -> store.users().findByEmailIgnoreCase(normalized))
                    .orElseThrow(() -> new UsernameNotFoundException(INVALID));
            if (!user.isActive() || user.getApprovalStatus() != ApprovalStatus.APPROVED) {
                throw new UsernameNotFoundException(INVALID);
            }
            var operator = store.operators().findById((short) 1);
            if (operator.isPresent() && operator.orElseThrow().getUserId().equals(user.getId())) {
                var admin = operator.orElseThrow();
                if (!"admin".equals(user.getUsername())
                        || store.workspaces().findByPhotographerUserId(user.getId()).isPresent()
                        || (admin.isRequiresPasswordChange() && admin.getInitialPasswordUsedAt() != null)) {
                    throw new UsernameNotFoundException(INVALID);
                }
                return new AccountPrincipal(user.getId(), user.getUsername(), user.getPasswordHash(),
                        "ADMIN", null, admin.isRequiresPasswordChange(), admin.getSessionVersion());
            }
            var workspace = store.workspaces().findByPhotographerUserId(user.getId())
                    .orElseThrow(() -> new UsernameNotFoundException(INVALID));
            if (store.profiles().findByUserIdAndWorkspaceId(user.getId(), workspace.getId()).isEmpty()) {
                throw new UsernameNotFoundException(INVALID);
            }
            return new AccountPrincipal(user.getId(), user.getUsername(), user.getPasswordHash(),
                    "PHOTOGRAPHER", workspace.getId(), false, 0);
        } catch (ApiProblem exception) {
            throw new UsernameNotFoundException(INVALID);
        }
    }
}
