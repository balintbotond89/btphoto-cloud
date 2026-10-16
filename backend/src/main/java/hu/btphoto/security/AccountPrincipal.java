package hu.btphoto.security;

import java.io.Serializable;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.security.core.CredentialsContainer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public final class AccountPrincipal implements UserDetails, CredentialsContainer, Serializable {
    private static final long serialVersionUID = 1L;
    private final UUID userId;
    private final String username;
    private String password;
    private final String role;
    private final UUID workspaceId;
    private final boolean passwordChangeRequired;
    private final long sessionVersion;

    public AccountPrincipal(UUID userId, String username, String hash, String role,
            UUID workspaceId, boolean passwordChangeRequired, long sessionVersion) {
        this.userId = userId;
        this.username = username;
        this.password = hash;
        this.role = role;
        this.workspaceId = workspaceId;
        this.passwordChangeRequired = passwordChangeRequired;
        this.sessionVersion = sessionVersion;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(passwordChangeRequired ? "ROLE_PASSWORD_CHANGE" : "ROLE_" + role));
    }
    @Override
    public String getUsername() { return username; }
    @Override
    public String getPassword() { return password; }
    @Override
    public void eraseCredentials() { password = null; }
    public UUID getUserId() { return userId; }
    public String getRole() { return role; }
    public UUID getWorkspaceId() { return workspaceId; }
    public boolean isPasswordChangeRequired() { return passwordChangeRequired; }
    public long getSessionVersion() { return sessionVersion; }

    @Override
    public boolean equals(Object other) {
        return other instanceof AccountPrincipal principal && userId.equals(principal.userId)
                && role.equals(principal.role) && Objects.equals(workspaceId, principal.workspaceId)
                && passwordChangeRequired == principal.passwordChangeRequired
                && sessionVersion == principal.sessionVersion;
    }
    @Override
    public int hashCode() {
        return Objects.hash(userId, role, workspaceId, passwordChangeRequired, sessionVersion);
    }
}
