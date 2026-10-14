package hu.btphoto.security;

import hu.btphoto.admin.repository.AdminUserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminUserDetailsServiceTest {

    @Mock
    private ObjectProvider<AdminUserRepository> repositoryProvider;

    @Test
    void rejectsAuthenticationWhenTheRepositoryIsUnavailable() {
        when(repositoryProvider.getIfAvailable()).thenReturn(null);
        var service = new AdminUserDetailsService(repositoryProvider);

        var exception = assertThrows(
                UsernameNotFoundException.class,
                () -> service.loadUserByUsername("admin")
        );

        assertEquals("Érvénytelen hitelesítési adatok.", exception.getMessage());
    }
}
