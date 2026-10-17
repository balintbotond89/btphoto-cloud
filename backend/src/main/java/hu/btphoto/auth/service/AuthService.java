package hu.btphoto.auth.service;

import java.time.Instant;

import hu.btphoto.account.service.AccountStore;
import hu.btphoto.auth.dto.AuthenticatedAdminResponse;
import hu.btphoto.security.AccountPrincipal;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final AuthenticationManager authenticationManager;
    private final AccountStore store;

    public AuthService(AuthenticationManager authenticationManager, AccountStore store) {
        this.authenticationManager = authenticationManager;
        this.store = store;
    }

    @Transactional
    public Authentication authenticate(String identifier, String password) {
        if (password == null || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72
                || !java.nio.charset.StandardCharsets.UTF_8.newEncoder().canEncode(password)) {
            throw new BadCredentialsException("Érvénytelen hitelesítési adatok.");
        }
        var request = UsernamePasswordAuthenticationToken.unauthenticated(identifier, password);
        var authentication = authenticationManager.authenticate(request);
        var principal = principal(authentication);
        if (principal.isPasswordChangeRequired()
                && store.operators().consumeInitialPassword(principal.getUserId(), Instant.now()) != 1) {
            throw new BadCredentialsException("Érvénytelen hitelesítési adatok.");
        }
        return authentication;
    }

    public AccountPrincipal principal(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof AccountPrincipal principal)) {
            throw new BadCredentialsException("Érvénytelen hitelesítési adatok.");
        }
        return principal;
    }

    public AuthenticatedAdminResponse describe(Authentication authentication) {
        var principal = principal(authentication);
        String displayName = principal.getUsername();
        String avatarUrl = null;
        if ("PHOTOGRAPHER".equals(principal.getRole())) {
            var profile = store.profiles().findByUserIdAndWorkspaceId(
                    principal.getUserId(), principal.getWorkspaceId()).orElseThrow(
                            () -> new BadCredentialsException("Érvénytelen hitelesítési adatok."));
            displayName = profile.getLastName() + " " + profile.getFirstName();
            if (profile.getAvatarPath() != null) {
                avatarUrl = "/api/photographer/profile/avatar";
            }
        }
        return new AuthenticatedAdminResponse(principal.getUsername(), principal.getRole(), displayName,
                principal.isPasswordChangeRequired(), principal.getWorkspaceId(), avatarUrl);
    }
}
