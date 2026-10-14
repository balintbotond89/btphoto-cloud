package hu.btphoto.security;

import java.util.Locale;

import hu.btphoto.admin.model.AdminUser;
import hu.btphoto.admin.repository.AdminUserRepository;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AdminUserDetailsService implements UserDetailsService {

    private static final String INVALID_CREDENTIALS = "Érvénytelen hitelesítési adatok.";

    private final ObjectProvider<AdminUserRepository> repositoryProvider;

    public AdminUserDetailsService(ObjectProvider<AdminUserRepository> repositoryProvider) {
        this.repositoryProvider = repositoryProvider;
    }

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        var repository = repositoryProvider.getIfAvailable();
        if (repository == null) {
            throw new UsernameNotFoundException(INVALID_CREDENTIALS);
        }

        var normalizedIdentifier = identifier.trim().toLowerCase(Locale.ROOT);
        var adminUser = repository.findByUsernameIgnoreCase(normalizedIdentifier)
                .or(() -> repository.findByEmailIgnoreCase(normalizedIdentifier))
                .orElseThrow(() -> new UsernameNotFoundException(INVALID_CREDENTIALS));

        return toUserDetails(adminUser);
    }

    private UserDetails toUserDetails(AdminUser adminUser) {
        return User.withUsername(adminUser.getUsername())
                .password(adminUser.getPasswordHash())
                .roles("ADMIN")
                .disabled(!adminUser.isActive())
                .build();
    }
}
