package hu.btphoto.account;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

import hu.btphoto.TestTransactions;
import hu.btphoto.account.model.AppUser;
import hu.btphoto.account.model.SystemAdmin;
import hu.btphoto.account.repository.AppUserRepository;
import hu.btphoto.account.repository.SystemAdminRepository;
import hu.btphoto.profile.model.PhotographerProfile;
import hu.btphoto.profile.repository.PhotographerBusinessRepository;
import hu.btphoto.profile.repository.PhotographerProfileRepository;
import hu.btphoto.storage.AvatarStorageService;
import hu.btphoto.workspace.model.PhotographerWorkspace;
import hu.btphoto.workspace.repository.PhotographerWorkspaceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "btphoto.registration.enabled=true")
@AutoConfigureMockMvc
@ActiveProfiles("no-database")
@Import(TestTransactions.class)
class AccountFlowIntegrationTest {
    private static final String PASSWORD = "fixture-long-password";
    private static final String NEW_PASSWORD = "fixture-changed-password";
    @Autowired
    MockMvc mvc;
    @Autowired
    PasswordEncoder encoder;
    @MockitoBean
    AppUserRepository users;
    @MockitoBean
    SystemAdminRepository operators;
    @MockitoBean
    PhotographerWorkspaceRepository workspaces;
    @MockitoBean
    PhotographerProfileRepository profiles;
    @MockitoBean
    PhotographerBusinessRepository businesses;
    @MockitoBean
    AvatarStorageService avatars;
    @MockitoBean
    hu.btphoto.registration.service.RegistrationLimiter limiter;
    @MockitoBean
    hu.btphoto.registration.service.RecaptchaVerifier captcha;
    private final Map<UUID, AppUser> accounts = new HashMap<>();
    private final Map<UUID, PhotographerWorkspace> spaces = new HashMap<>();
    private final Map<UUID, PhotographerProfile> details = new HashMap<>();
    private SystemAdmin operator;
    private UUID photographer;
    private UUID otherPhotographer;
    private UUID pending;

    @BeforeEach
    void fixtures() {
        accounts.clear();
        spaces.clear();
        details.clear();
        UUID admin = addUser("admin", true, false);
        operator = new SystemAdmin(admin, false);
        photographer = addUser("first", true, true);
        otherPhotographer = addUser("second", true, true);
        pending = addUser("pending", false, true);
        when(users.findById(any(UUID.class)))
                .thenAnswer(call -> Optional.ofNullable(accounts.get(call.getArgument(0))));
        when(users.findByUsernameIgnoreCase(anyString())).thenAnswer(call -> accounts.values().stream()
                .filter(user -> user.getUsername().equals(call.getArgument(0))).findFirst());
        when(users.findByEmailIgnoreCase(anyString())).thenAnswer(call -> accounts.values().stream()
                .filter(user -> call.getArgument(0).equals(user.getEmail())).findFirst());
        when(operators.findById((short) 1)).thenAnswer(call -> Optional.of(operator));
        when(workspaces.findByPhotographerUserId(any(UUID.class)))
                .thenAnswer(call -> Optional.ofNullable(spaces.get(call.getArgument(0))));
        when(profiles.findByUserIdAndWorkspaceId(any(UUID.class), any(UUID.class))).thenAnswer(call -> {
            var profile = details.get(call.getArgument(0));
            return profile != null && profile.getWorkspaceId().equals(call.getArgument(1))
                    ? Optional.of(profile) : Optional.empty();
        });
        when(users.saveAndFlush(any(AppUser.class))).thenAnswer(call -> {
            AppUser user = call.getArgument(0);
            accounts.put(user.getId(), user);
            return user;
        });
        when(workspaces.saveAndFlush(any(PhotographerWorkspace.class))).thenAnswer(call -> {
            PhotographerWorkspace workspace = call.getArgument(0);
            spaces.put(workspace.getPhotographerUserId(), workspace);
            return workspace;
        });
        when(profiles.saveAndFlush(any(PhotographerProfile.class))).thenAnswer(call -> {
            PhotographerProfile profile = call.getArgument(0);
            details.put(profile.getUserId(), profile);
            return profile;
        });
        when(users.findTop100ByApprovalStatusOrderByCreatedAtAsc(any())).thenAnswer(call ->
                accounts.values().stream().filter(user -> user.getApprovalStatus() == call.getArgument(0)).toList());
        when(users.decidePending(any(), any(), any(Boolean.class), any(), any(), any())).thenAnswer(call -> {
            var user = accounts.get(call.getArgument(0));
            if (user == null || user.isActive()
                    || user.getApprovalStatus() != hu.btphoto.account.model.ApprovalStatus.PENDING) {
                return 0;
            }
            ReflectionTestUtils.setField(user, "approvalStatus", call.getArgument(1));
            ReflectionTestUtils.setField(user, "active", call.getArgument(2));
            return 1;
        });
    }

    private UUID addUser(String name, boolean active, boolean workspace) {
        UUID id = UUID.randomUUID();
        var now = Instant.now();
        accounts.put(id, new AppUser(id, name, name + "@fixture.test", encoder.encode(PASSWORD), active, now, now));
        if (workspace) {
            UUID space = UUID.randomUUID();
            spaces.put(id, new PhotographerWorkspace(space, id, now));
            details.put(id, new PhotographerProfile(id, space, name, "Fotós", "", "", "",
                    null, null, null));
        }
        return id;
    }

    @Test
    void registersInactivePendingAccountWithOwnWorkspaceAndHashWithoutSession() throws Exception {
        int before = accounts.size();
        var result = mvc.perform(multipart("/api/auth/register").file(data(registrationJson())).with(csrf()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("PENDING")).andReturn();
        assertEquals(before + 1, accounts.size());
        var created = accounts.values().stream().filter(user -> "new@fixture.test".equals(user.getEmail()))
                .findFirst().orElseThrow();
        assertTrue(!created.isActive());
        assertTrue(encoder.matches(PASSWORD, created.getPasswordHash()));
        assertTrue(details.get(created.getId()).getWorkspaceId().equals(spaces.get(created.getId()).getId()));
        assertTrue(result.getRequest().getSession(false) == null
                || result.getRequest().getSession(false).getAttribute("SPRING_SECURITY_CONTEXT") == null);
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("new@fixture.test", PASSWORD))).andExpect(status().isUnauthorized());
    }

    @Test
    void captchaFailureCannotCreateAnAccountAndConfigurationNeverContainsSecret() throws Exception {
        int before = accounts.size();
        when(captcha.publicSiteKey()).thenReturn("public-fixture-site-key");
        mvc.perform(get("/api/auth/registration-config")).andExpect(status().isOk())
                .andExpect(jsonPath("$.siteKey").value("public-fixture-site-key"))
                .andExpect(jsonPath("$.secret").doesNotExist());
        doThrow(new hu.btphoto.exception.ApiProblem(org.springframework.http.HttpStatus.BAD_REQUEST,
                "CAPTCHA_INVALID", "Érvénytelen CAPTCHA."))
                .when(captcha).verify(org.mockito.ArgumentMatchers.nullable(String.class));
        mvc.perform(multipart("/api/auth/register").file(data(registrationJson())).with(csrf()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("CAPTCHA_INVALID"));
        assertEquals(before, accounts.size());
        org.mockito.Mockito.verifyNoInteractions(avatars);
    }

    @Test
    void validBusinessPreservesTaxTextAndStructuredAddress() throws Exception {
        String company = """
                "hasBusiness":true,"business":{"type":"Kft.","name":"Fixture Cég","taxNumber":"00123456-1-11",
                "registrationNumber":null,"address":{"country":"HU","postalCode":"0001","city":"Fixture",
                "line1":"Teszt utca 1.","line2":null}}
                """.strip();
        String json = registrationJson().replace("\"hasBusiness\":false,\"business\":null", company);
        mvc.perform(multipart("/api/auth/register").file(data(json)).with(csrf())).andExpect(status().isCreated());
        var business = org.mockito.ArgumentCaptor.forClass(hu.btphoto.profile.model.PhotographerBusiness.class);
        org.mockito.Mockito.verify(businesses).saveAndFlush(business.capture());
        assertEquals("00123456-1-11", business.getValue().getTaxNumber());
        assertTrue(business.getValue().getAddressJson().contains("\"postalCode\":\"0001\""));
    }

    @Test
    void approvalActivatesPhotographerAndRejectionKeepsLoginDisabled() throws Exception {
        var admin = login("admin", PASSWORD);
        mvc.perform(get("/api/admin/registrations").session(admin)).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].accountId").value(pending.toString()));
        mvc.perform(post("/api/admin/registrations/" + pending + "/approve").session(admin).with(csrf()))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/me").session(login("pending", PASSWORD))).andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("PHOTOGRAPHER"));
        UUID rejected = addUser("rejected", false, true);
        mvc.perform(post("/api/admin/registrations/" + rejected + "/reject").session(admin).with(csrf()))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("rejected", PASSWORD))).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsDuplicateInvalidBusinessAndForgedRoleRequests() throws Exception {
        int before = accounts.size();
        mvc.perform(multipart("/api/auth/register").file(data(registrationJson().replace(
                "new@fixture.test", "first@fixture.test"))).with(csrf())).andExpect(status().isConflict());
        mvc.perform(multipart("/api/auth/register").file(data(registrationJson().replace(
                "\"hasBusiness\":false", "\"hasBusiness\":true"))).with(csrf()))
                .andExpect(status().isBadRequest());
        mvc.perform(multipart("/api/auth/register").file(data(registrationJson().replace(
                "\"lastName\"", "\"role\":\"ADMIN\",\"lastName\""))).with(csrf()))
                .andExpect(status().isBadRequest());
        assertEquals(before, accounts.size());
    }

    @Test
    void storageFailureCannotCreateHalfRegistrationAndCsrfIsRequired() throws Exception {
        int before = accounts.size();
        doThrow(new hu.btphoto.exception.ApiProblem(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
                "STORAGE_UNAVAILABLE", "Nem elérhető")).when(avatars).verifyReady();
        mvc.perform(multipart("/api/auth/register").file(data(registrationJson())).with(csrf()))
                .andExpect(status().isServiceUnavailable());
        assertEquals(before, accounts.size());
        mvc.perform(multipart("/api/auth/register").file(data(registrationJson()))).andExpect(status().isForbidden());
    }

    @Test
    void twoPhotographersSeeOnlyOwnProfilesAndNeverOperatorFunctions() throws Exception {
        var first = login("first", PASSWORD);
        var second = login("second", PASSWORD);
        mvc.perform(get("/api/photographer/profile").session(first)
                .param("workspaceId", spaces.get(otherPhotographer).getId().toString())
                .header("X-Workspace-Id", spaces.get(otherPhotographer).getId().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accountId").value(photographer.toString()))
                .andExpect(jsonPath("$.lastName").value("first"))
                .andExpect(content().string(not(containsString("second@fixture.test"))));
        mvc.perform(get("/api/photographer/profile").session(second))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accountId").value(otherPhotographer.toString()));
        mvc.perform(get("/api/photographer/profile/" + otherPhotographer).session(first))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/admin/registrations").session(first)).andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/registrations/" + pending + "/approve").session(first).with(csrf()))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/photographer/profile").session(login("admin", PASSWORD)))
                .andExpect(status().isForbidden());
    }

    @Test
    void operatorApprovesExactlyOnePendingTransition() throws Exception {
        var admin = login("admin", PASSWORD);
        var changed = new AtomicBoolean();
        when(users.decidePending(any(), any(), any(Boolean.class), any(), any(), any())).thenAnswer(
                call -> changed.compareAndSet(false, true) ? 1 : 0);
        mvc.perform(post("/api/admin/registrations/" + pending + "/approve").session(admin).with(csrf()))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/admin/registrations/" + pending + "/approve").session(admin).with(csrf()))
                .andExpect(status().isConflict());
    }

    @Test
    void bootstrapSessionOnlyChangesPasswordAndCannotBeReused() throws Exception {
        operator = new SystemAdmin(operator.getUserId(), true);
        var consumed = new AtomicBoolean();
        when(operators.consumeInitialPassword(any(), any())).thenAnswer(call -> {
            if (!consumed.compareAndSet(false, true)) { return 0; }
            ReflectionTestUtils.setField(operator, "initialPasswordUsedAt", Instant.now());
            return 1;
        });
        var restricted = login("admin", PASSWORD);
        mvc.perform(get("/api/auth/me").session(restricted)).andExpect(status().isOk())
                .andExpect(jsonPath("$.requiresPasswordChange").value(true));
        mvc.perform(get("/api/admin/registrations").session(restricted)).andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/registrations/" + pending + "/approve").session(restricted).with(csrf()))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("admin", PASSWORD))).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/change-password").session(restricted).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(passwordJson("", NEW_PASSWORD)))
                .andExpect(status().isNoContent()).andExpect(cookie().maxAge("BTPHOTO_SESSION", 0));
        assertTrue(restricted.isInvalid());
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("admin", PASSWORD))).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").session(login("admin", NEW_PASSWORD))).andExpect(status().isOk())
                .andExpect(jsonPath("$.requiresPasswordChange").value(false));
    }

    @Test
    void normalPasswordChangeRequiresCurrentPasswordCsrfAndRevokesAllOldSessions() throws Exception {
        var first = login("admin", PASSWORD);
        var other = login("admin", PASSWORD);
        mvc.perform(post("/api/auth/change-password").session(first).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(passwordJson("wrong", NEW_PASSWORD)))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/change-password").session(first)
                .contentType(MediaType.APPLICATION_JSON).content(passwordJson(PASSWORD, NEW_PASSWORD)))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/change-password").session(first).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(passwordJson(PASSWORD, NEW_PASSWORD)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/me").session(other)).andExpect(status().isUnauthorized());
        assertTrue(other.isInvalid());
    }

    @Test
    void legacyUnboundAndPendingAccountsNeverBecomeAdminsAndInactiveSessionIsRevoked() throws Exception {
        addUser("legacy", true, false);
        for (String name : new String[] {"legacy", "pending"}) {
            mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                    .content(loginJson(name, PASSWORD))).andExpect(status().isUnauthorized());
        }
        var session = login("first", PASSWORD);
        var now = Instant.now();
        accounts.put(photographer, new AppUser(photographer, "first", "first@fixture.test",
                encoder.encode(PASSWORD), false, now, now));
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isUnauthorized());
    }

    @Test
    void rateLimitRejectsBeforeRegistrationBusinessLogic() throws Exception {
        int before = accounts.size();
        doThrow(new hu.btphoto.exception.ApiProblem(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,
                "RATE_LIMITED", "Korlátozott")).when(limiter).check(anyString());
        mvc.perform(multipart("/api/auth/register").file(data(registrationJson())).with(csrf()))
                .andExpect(status().isTooManyRequests()).andExpect(jsonPath("$.code").value("RATE_LIMITED"));
        assertEquals(before, accounts.size());
    }

    private MockHttpSession login(String name, String password) throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/auth/login").with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(loginJson(name, password)))
                .andExpect(status().isOk()).andReturn().getRequest().getSession(false);
    }

    private String loginJson(String name, String password) {
        return "{\"identifier\":\"" + name + "\",\"password\":\"" + password + "\"}";
    }

    private String passwordJson(String current, String password) {
        return "{\"currentPassword\":\"" + current + "\",\"newPassword\":\"" + password
                + "\",\"confirmation\":\"" + password + "\"}";
    }

    private MockMultipartFile data(String json) {
        return new MockMultipartFile("data", "", "application/json", json.getBytes(StandardCharsets.UTF_8));
    }

    private String registrationJson() {
        return """
                {"lastName":" Új ","firstName":"Fotós","salutation":"Dr.","email":"new@fixture.test",
                 "password":"fixture-long-password","passwordConfirmation":"fixture-long-password",
                 "phone":"","mobile":"","homeAddress":null,"siteAddress":null,"hasBusiness":false,"business":null}
                """;
    }
}
