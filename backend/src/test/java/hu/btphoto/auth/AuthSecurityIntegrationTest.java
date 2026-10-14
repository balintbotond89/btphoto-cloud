package hu.btphoto.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import hu.btphoto.admin.model.AdminUser;
import hu.btphoto.admin.repository.AdminUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("no-database")
@Import(AuthSecurityIntegrationTest.AdminEndpointTestConfiguration.class)
class AuthSecurityIntegrationTest {

    private static final String USERNAME = "admin";
    private static final String EMAIL = "admin@btphoto.hu";
    private static final String PASSWORD = "correct-horse-battery-staple";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private AdminUserRepository adminUserRepository;

    @BeforeEach
    void setUpAdminUser() {
        var now = Instant.now();
        var adminUser = new AdminUser(
                UUID.randomUUID(),
                USERNAME,
                EMAIL,
                passwordEncoder.encode(PASSWORD),
                true,
                now,
                now
        );
        when(adminUserRepository.findByUsernameIgnoreCase(USERNAME)).thenReturn(Optional.of(adminUser));
        when(adminUserRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(adminUser));
    }

    @Test
    void exposesCsrfTokenForTheSameOriginClient() throws Exception {
        mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headerName").value("X-CSRF-TOKEN"))
                .andExpect(jsonPath("$.parameterName").value("_csrf"))
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void createsAuthenticatedSessionForValidCredentials() throws Exception {
        var loginResult = performSuccessfulLogin();
        var session = loginResult.getRequest().getSession(false);
        assertNotNull(session);

        mockMvc.perform(get("/api/auth/me").session((org.springframework.mock.web.MockHttpSession) session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(USERNAME));

        mockMvc.perform(get("/api/admin/test").session((org.springframework.mock.web.MockHttpSession) session))
                .andExpect(status().isOk())
                .andExpect(content().string("protected"));
    }

    @Test
    void acceptsEmailAsAdminIdentifier() throws Exception {
        performSuccessfulLogin(EMAIL)
                .getResponse();
    }

    @Test
    void changesSessionIdentifierAfterSuccessfulAuthentication() throws Exception {
        var anonymousSession = new org.springframework.mock.web.MockHttpSession();
        var anonymousSessionId = anonymousSession.getId();

        var loginResult = mockMvc.perform(post("/api/auth/login")
                        .session(anonymousSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(USERNAME, PASSWORD)))
                .andExpect(status().isOk())
                .andReturn();

        var authenticatedSession = loginResult.getRequest().getSession(false);
        assertNotNull(authenticatedSession);
        assertNotEquals(anonymousSessionId, authenticatedSession.getId());
    }

    @Test
    void rejectsInvalidPasswordWithGenericErrorAndWithoutSecretEcho() throws Exception {
        var loginResult = mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(USERNAME, "incorrect-password")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_FAILED"))
                .andExpect(jsonPath("$.message")
                        .value("A megadott hitelesítési adatok érvénytelenek."))
                .andExpect(content().string(not(containsString("incorrect-password"))))
                .andReturn();

        var meRequest = get("/api/auth/me");
        var anonymousSession = loginResult.getRequest().getSession(false);
        if (anonymousSession != null) {
            meRequest.session((org.springframework.mock.web.MockHttpSession) anonymousSession);
        }
        mockMvc.perform(meRequest)
                .andExpect(status().isUnauthorized());
    }

    @Test
    void returnsTheSameGenericErrorForUnknownIdentifier() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("missing-admin", PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_FAILED"))
                .andExpect(jsonPath("$.message")
                        .value("A megadott hitelesítési adatok érvénytelenek."))
                .andExpect(content().string(not(containsString("missing-admin"))));
    }

    @Test
    void rejectsInactiveAdminWithTheGenericAuthenticationError() throws Exception {
        var now = Instant.now();
        var inactiveAdmin = new AdminUser(
                UUID.randomUUID(),
                USERNAME,
                EMAIL,
                passwordEncoder.encode(PASSWORD),
                false,
                now,
                now
        );
        when(adminUserRepository.findByUsernameIgnoreCase(USERNAME)).thenReturn(Optional.of(inactiveAdmin));

        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(USERNAME, PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_FAILED"));
    }

    @Test
    void rejectsIncompleteLoginRequestWithValidationError() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("", "")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void rejectsProtectedAdminEndpointWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/test"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    void rejectsLoginWithoutCsrfToken() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(USERNAME, PASSWORD)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    void invalidatesSessionAndClearsCookieOnLogout() throws Exception {
        var loginResult = performSuccessfulLogin();
        var session = (org.springframework.mock.web.MockHttpSession) loginResult.getRequest().getSession(false);
        assertNotNull(session);

        mockMvc.perform(post("/api/auth/logout").session(session).with(csrf()))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge("BTPHOTO_SESSION", 0));

        assertTrue(session.isInvalid());
    }

    private MvcResult performSuccessfulLogin() throws Exception {
        return performSuccessfulLogin(USERNAME);
    }

    private MvcResult performSuccessfulLogin(String identifier) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(identifier, PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(USERNAME))
                .andReturn();
    }

    private String loginJson(String identifier, String password) {
        return """
                {"identifier":"%s","password":"%s"}
                """.formatted(identifier, password);
    }

    @TestConfiguration
    static class AdminEndpointTestConfiguration {

        @Bean
        TestAdminController testAdminController() {
            return new TestAdminController();
        }
    }

    @RestController
    static class TestAdminController {

        @GetMapping("/api/admin/test")
        String protectedEndpoint() {
            return "protected";
        }
    }
}
