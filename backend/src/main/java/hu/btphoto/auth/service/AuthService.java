package hu.btphoto.auth.service;

import hu.btphoto.auth.dto.AuthenticatedAdminResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;

    public AuthService(AuthenticationManager authenticationManager) {
        this.authenticationManager = authenticationManager;
    }

    public Authentication authenticate(String identifier, String password) {
        var authenticationRequest = UsernamePasswordAuthenticationToken.unauthenticated(identifier, password);
        return authenticationManager.authenticate(authenticationRequest);
    }

    public AuthenticatedAdminResponse describe(Authentication authentication) {
        return new AuthenticatedAdminResponse(authentication.getName());
    }
}
