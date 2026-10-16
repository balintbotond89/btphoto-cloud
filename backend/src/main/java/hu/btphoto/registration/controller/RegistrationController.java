package hu.btphoto.registration.controller;

import java.util.Map;

import hu.btphoto.registration.dto.RegistrationRequest;
import hu.btphoto.registration.service.RegistrationService;
import hu.btphoto.registration.service.RecaptchaVerifier;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class RegistrationController {
    private final RegistrationService registrations;
    private final RecaptchaVerifier captcha;

    public RegistrationController(RegistrationService registrations, RecaptchaVerifier captcha) {
        this.registrations = registrations;
        this.captcha = captcha;
    }

    @GetMapping("/api/auth/registration-config")
    public ResponseEntity<Map<String, String>> configuration() {
        return ResponseEntity.ok().header("Cache-Control", "no-store")
                .body(Map.of("provider", "recaptcha-v2", "siteKey", captcha.publicSiteKey()));
    }

    @PostMapping(value = "/api/auth/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> register(@Valid @RequestPart("data") RegistrationRequest data,
            @RequestPart(value = "avatar", required = false) MultipartFile avatar,
            @RequestPart(value = "captcha", required = false) String token) {
        captcha.verify(token);
        registrations.register(data, avatar);
        return Map.of("status", "PENDING");
    }
}
