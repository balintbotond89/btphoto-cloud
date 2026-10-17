package hu.btphoto.security;

import java.io.IOException;

import hu.btphoto.account.model.ApprovalStatus;
import hu.btphoto.account.service.AccountStore;
import hu.btphoto.exception.ApiProblem;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class AccountSessionFilter extends OncePerRequestFilter {
    private final AccountStore store;
    private final SecurityErrorWriter errors;

    public AccountSessionFilter(AccountStore store, SecurityErrorWriter errors) {
        this.store = store;
        this.errors = errors;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)) {
            try {
                if (!(authentication.getPrincipal() instanceof AccountPrincipal principal) || !valid(principal)) {
                    var session = request.getSession(false);
                    if (session != null) {
                        session.invalidate();
                    }
                    SecurityContextHolder.clearContext();
                    errors.write(response, HttpStatus.UNAUTHORIZED, "SESSION_EXPIRED",
                            "Új bejelentkezés szükséges.");
                    return;
                }
            } catch (ApiProblem | org.springframework.dao.DataAccessException exception) {
                errors.write(response, HttpStatus.SERVICE_UNAVAILABLE, "DATABASE_UNAVAILABLE",
                        "A szolgáltatás átmenetileg nem érhető el.");
                return;
            }
        }
        chain.doFilter(request, response);
    }

    private boolean valid(AccountPrincipal principal) {
        var user = store.users().findById(principal.getUserId()).orElse(null);
        if (user == null || !user.isActive() || user.getApprovalStatus() != ApprovalStatus.APPROVED) {
            return false;
        }
        var admin = store.operators().findById((short) 1).orElse(null);
        if ("ADMIN".equals(principal.getRole())) {
            return admin != null && admin.getUserId().equals(principal.getUserId())
                    && admin.getSessionVersion() == principal.getSessionVersion()
                    && admin.isRequiresPasswordChange() == principal.isPasswordChangeRequired()
                    && store.workspaces().findByPhotographerUserId(principal.getUserId()).isEmpty();
        }
        return "PHOTOGRAPHER".equals(principal.getRole())
                && (admin == null || !admin.getUserId().equals(principal.getUserId()))
                && store.workspaces().findByPhotographerUserId(principal.getUserId())
                        .map(workspace -> workspace.getId().equals(principal.getWorkspaceId())).orElse(false);
    }
}
