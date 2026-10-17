package hu.btphoto.registration.service;

import java.time.Instant;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;
import hu.btphoto.account.model.AppUser;
import hu.btphoto.account.model.ApprovalStatus;
import hu.btphoto.account.service.AccountStore;
import hu.btphoto.exception.ApiProblem;
import hu.btphoto.profile.model.PhotographerBusiness;
import hu.btphoto.profile.model.PhotographerProfile;
import hu.btphoto.registration.dto.RegistrationRequest;
import hu.btphoto.security.PasswordPolicy;
import hu.btphoto.storage.AvatarStorageService;
import hu.btphoto.workspace.model.PhotographerWorkspace;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
public class RegistrationService {
    private final AccountStore store;
    private final PasswordEncoder encoder;
    private final PasswordPolicy passwords;
    private final AvatarStorageService avatars;
    private final ObjectWriter jsonWriter;
    private final boolean enabled;

    public RegistrationService(AccountStore store, PasswordEncoder encoder, PasswordPolicy passwords,
            AvatarStorageService avatars, ObjectMapper mapper,
            @Value("${btphoto.registration.enabled:false}") boolean enabled) {
        this.store = store;
        this.encoder = encoder;
        this.passwords = passwords;
        this.avatars = avatars;
        this.jsonWriter = mapper.writer();
        this.enabled = enabled;
    }

    @Transactional
    public void register(RegistrationRequest request, MultipartFile avatar) {
        if (!enabled) {
            throw unavailable();
        }
        var admin = store.operators().findById((short) 1).orElseThrow(this::unavailable);
        var operator = store.users().findById(admin.getUserId()).orElseThrow(this::unavailable);
        if (admin.isRequiresPasswordChange() || !operator.isActive()
                || operator.getApprovalStatus() != ApprovalStatus.APPROVED
                || store.workspaces().findByPhotographerUserId(admin.getUserId()).isPresent()) {
            throw unavailable();
        }
        avatars.verifyReady();
        passwords.validate(request.password(), request.passwordConfirmation());
        if (request.salutation() != null && !Set.of("", "Id.", "Ifj.", "Özv.", "Dr.", "PhD.", "Prof.",
                "Dr. habil.").contains(request.salutation())) {
            throw invalid("salutation");
        }
        if (request.hasBusiness() != (request.business() != null)
                || (request.business() != null && !Set.of("Kft.", "Bt.", "Kkt.", "Zrt.", "Nyrt.",
                        "egyéni vállalkozó", "egyéb").contains(request.business().type()))) {
            throw invalid("business");
        }
        String email = request.email().strip().toLowerCase(Locale.ROOT);
        if (store.users().findByEmailIgnoreCase(email).isPresent()) {
            throw new ApiProblem(HttpStatus.CONFLICT, "REGISTRATION_CONFLICT",
                    "A regisztráció ezekkel az adatokkal nem rögzíthető.");
        }
        var accountId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var now = Instant.now();
        String avatarPath = avatar == null ? null : avatars.store(workspaceId, accountId, avatar);
        // A fájlrendszer nem része az SQL-tranzakciónak; csak a kérés saját fájlja kompenzálható.
        if (avatarPath != null) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status == STATUS_ROLLED_BACK) {
                        avatars.compensate(workspaceId, accountId, avatarPath);
                    } else if (status == STATUS_UNKNOWN) {
                        org.slf4j.LoggerFactory.getLogger(RegistrationService.class).warn(
                                "registration_commit_unknown account={} workspace={}", accountId, workspaceId);
                    }
                }
            });
        }
        store.users().saveAndFlush(new AppUser(accountId, "photographer-" + accountId, email,
                encoder.encode(request.password()), false, now, now));
        store.workspaces().saveAndFlush(new PhotographerWorkspace(workspaceId, accountId, now));
        store.profiles().saveAndFlush(new PhotographerProfile(accountId, workspaceId,
                name(request.lastName()), name(request.firstName()), request.salutation(), request.phone(),
                request.mobile(), json(request.homeAddress()), json(request.siteAddress()), avatarPath));
        if (request.business() != null) {
            var business = request.business();
            store.businesses().saveAndFlush(new PhotographerBusiness(accountId, business.type(),
                    business.name().strip(), business.taxNumber(), business.registrationNumber(),
                    json(business.address())));
        }
    }

    private String name(String value) {
        String result = value.strip().replaceAll("\\s+", " ");
        if (result.isEmpty()) {
            throw invalid("name");
        }
        return result;
    }

    private String json(Object value) {
        try {
            return value == null ? null : jsonWriter.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw invalid("address");
        }
    }

    private ApiProblem invalid(String field) {
        return new ApiProblem(HttpStatus.BAD_REQUEST, "INVALID_" + field.toUpperCase(Locale.ROOT),
                "A mező értéke érvénytelen: " + field + ".");
    }

    private ApiProblem unavailable() {
        return new ApiProblem(HttpStatus.SERVICE_UNAVAILABLE, "REGISTRATION_DISABLED",
                "A regisztráció még nem engedélyezett.");
    }
}
