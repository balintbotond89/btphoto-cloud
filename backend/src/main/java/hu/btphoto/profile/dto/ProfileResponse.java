package hu.btphoto.profile.dto;

import java.util.UUID;

public record ProfileResponse(UUID accountId, UUID workspaceId, String lastName, String firstName,
        String salutation, String email, String phone, String mobile, AddressRequest homeAddress,
        AddressRequest siteAddress, BusinessRequest business, String avatarUrl) {
    @Override
    public String toString() { return "ProfileResponse[redacted]"; }
}
