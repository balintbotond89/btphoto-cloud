package hu.btphoto.security;

import hu.btphoto.account.service.AccountStore;
import hu.btphoto.exception.ApiProblem;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AccountUserDetailsServiceTest {
    @Test
    void rejectsAuthenticationWhenTheRepositoryIsUnavailable() {
        var store = mock(AccountStore.class);
        when(store.users()).thenThrow(new ApiProblem(
                HttpStatus.SERVICE_UNAVAILABLE, "DATABASE_UNAVAILABLE", "Nem elérhető"));
        var service = new AccountUserDetailsService(store);
        var exception = assertThrows(UsernameNotFoundException.class, () -> service.loadUserByUsername("admin"));
        assertEquals("Érvénytelen hitelesítési adatok.", exception.getMessage());
    }
}
