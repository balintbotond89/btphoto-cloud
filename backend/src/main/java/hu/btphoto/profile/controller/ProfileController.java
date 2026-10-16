package hu.btphoto.profile.controller;

import hu.btphoto.auth.service.AuthService;
import hu.btphoto.profile.dto.ProfileResponse;
import hu.btphoto.profile.service.ProfileService;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ProfileController {
    private final ProfileService profiles;
    private final AuthService auth;

    public ProfileController(ProfileService profiles, AuthService auth) {
        this.profiles = profiles;
        this.auth = auth;
    }

    @GetMapping("/api/photographer/profile")
    public ProfileResponse profile(Authentication authentication) {
        return profiles.own(auth.principal(authentication));
    }

    @GetMapping("/api/photographer/profile/avatar")
    public ResponseEntity<byte[]> avatar(Authentication authentication) {
        var profile = profiles.owned(auth.principal(authentication));
        return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff").body(profiles.avatar(profile));
    }
}
