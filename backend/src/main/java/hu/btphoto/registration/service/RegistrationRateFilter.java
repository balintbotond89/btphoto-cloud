package hu.btphoto.registration.service;

import java.io.IOException;

import hu.btphoto.exception.ApiProblem;
import hu.btphoto.security.SecurityErrorWriter;
import hu.btphoto.security.TrustedClientAddress;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.UrlPathHelper;

public class RegistrationRateFilter extends OncePerRequestFilter {
    private final RegistrationLimiter limiter;
    private final TrustedClientAddress clients;
    private final SecurityErrorWriter errors;

    public RegistrationRateFilter(RegistrationLimiter limiter, TrustedClientAddress clients,
            SecurityErrorWriter errors) {
        this.limiter = limiter;
        this.clients = clients;
        this.errors = errors;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if ("POST".equals(request.getMethod())
                && "/api/auth/register".equals(UrlPathHelper.defaultInstance.getPathWithinApplication(request))) {
            try {
                limiter.check(clients.resolve(request));
            } catch (ApiProblem problem) {
                errors.write(response, problem.getStatus(), problem.getCode(), problem.getMessage());
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
