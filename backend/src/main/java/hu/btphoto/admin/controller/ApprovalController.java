package hu.btphoto.admin.controller;

import java.util.List;
import java.util.UUID;

import hu.btphoto.admin.service.ApprovalService;
import hu.btphoto.auth.service.AuthService;
import hu.btphoto.profile.dto.ProfileResponse;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ApprovalController {
    private final ApprovalService approvals;
    private final AuthService auth;

    public ApprovalController(ApprovalService approvals, AuthService auth) {
        this.approvals = approvals;
        this.auth = auth;
    }

    @GetMapping("/api/admin/registrations")
    public List<ProfileResponse> pending(Authentication authentication) {
        return approvals.pending(auth.principal(authentication));
    }

    @GetMapping("/api/admin/registrations/{id}/avatar")
    public ResponseEntity<byte[]> avatar(Authentication authentication, @PathVariable UUID id) {
        return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff").body(approvals.avatar(auth.principal(authentication), id));
    }

    @PostMapping("/api/admin/registrations/{id}/approve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void approve(Authentication authentication, @PathVariable UUID id) {
        approvals.decide(auth.principal(authentication), id, true);
    }

    @PostMapping("/api/admin/registrations/{id}/reject")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reject(Authentication authentication, @PathVariable UUID id) {
        approvals.decide(auth.principal(authentication), id, false);
    }
}
