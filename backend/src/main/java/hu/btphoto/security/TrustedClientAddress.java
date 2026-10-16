package hu.btphoto.security;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Arrays;

import hu.btphoto.exception.ApiProblem;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class TrustedClientAddress {
    private final String gateway;

    public TrustedClientAddress(@Value("${btphoto.registration.trusted-gateway:}") String gateway) {
        this.gateway = gateway;
    }

    public String resolve(HttpServletRequest request) {
        String remote = request.getRemoteAddr();
        if (gateway.isBlank()) {
            return remote;
        }
        try {
            var peer = InetAddress.getByName(remote);
            boolean trusted = Arrays.asList(InetAddress.getAllByName(gateway)).contains(peer);
            if (!trusted) {
                return remote;
            }
            String forwarded = request.getHeader("X-BTPhoto-Client-IP");
            if (forwarded == null || !forwarded.matches("[0-9a-fA-F:.]{3,64}")) {
                throw unavailable();
            }
            return InetAddress.getByName(forwarded).getHostAddress();
        } catch (UnknownHostException exception) {
            throw unavailable();
        }
    }

    private ApiProblem unavailable() {
        return new ApiProblem(HttpStatus.SERVICE_UNAVAILABLE, "PROXY_UNAVAILABLE",
                "A regisztráció átmenetileg nem érhető el.");
    }
}
