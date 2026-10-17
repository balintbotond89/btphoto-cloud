package hu.btphoto.profile.service;

import java.util.UUID;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectReader;
import hu.btphoto.account.service.AccountStore;
import hu.btphoto.exception.ApiProblem;
import hu.btphoto.profile.dto.AddressRequest;
import hu.btphoto.profile.dto.BusinessRequest;
import hu.btphoto.profile.dto.ProfileResponse;
import hu.btphoto.profile.model.PhotographerProfile;
import hu.btphoto.security.AccountPrincipal;
import hu.btphoto.storage.AvatarStorageService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {
    private final AccountStore store;
    private final ObjectReader addressReader;
    private final AvatarStorageService avatars;

    public ProfileService(AccountStore store, ObjectMapper mapper, AvatarStorageService avatars) {
        this.store = store;
        this.addressReader = mapper.readerFor(AddressRequest.class);
        this.avatars = avatars;
    }

    @Transactional(readOnly = true)
    public ProfileResponse own(AccountPrincipal principal) {
        return describe(owned(principal), "/api/photographer/profile/avatar");
    }

    public PhotographerProfile owned(AccountPrincipal principal) {
        if (!"PHOTOGRAPHER".equals(principal.getRole()) || principal.getWorkspaceId() == null) {
            throw notFound();
        }
        return store.profiles().findByUserIdAndWorkspaceId(principal.getUserId(), principal.getWorkspaceId())
                .orElseThrow(this::notFound);
    }

    public ProfileResponse describe(PhotographerProfile profile, String avatarUrl) {
        UUID userId = profile.getUserId();
        var user = store.users().findById(userId).orElseThrow(this::notFound);
        var business = store.businesses().findById(userId).map(value -> new BusinessRequest(
                value.getBusinessType(), value.getBusinessName(), value.getTaxNumber(),
                value.getRegistrationNumber(), address(value.getAddressJson()))).orElse(null);
        return new ProfileResponse(userId, profile.getWorkspaceId(), profile.getLastName(), profile.getFirstName(),
                profile.getSalutation(), user.getEmail(), profile.getPhone(), profile.getMobile(),
                address(profile.getHomeAddressJson()), address(profile.getSiteAddressJson()), business,
                profile.getAvatarPath() == null ? null : avatarUrl);
    }

    public byte[] avatar(PhotographerProfile profile) {
        return avatars.read(profile.getWorkspaceId(), profile.getUserId(), profile.getAvatarPath());
    }

    private AddressRequest address(String json) {
        try {
            return json == null ? null : addressReader.readValue(json);
        } catch (JsonProcessingException exception) {
            throw new ApiProblem(HttpStatus.SERVICE_UNAVAILABLE, "PROFILE_UNAVAILABLE",
                    "A profil átmenetileg nem érhető el.");
        }
    }

    private ApiProblem notFound() {
        return new ApiProblem(HttpStatus.NOT_FOUND, "NOT_FOUND", "A profil nem található.");
    }
}
