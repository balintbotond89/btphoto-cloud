package hu.btphoto.registration.dto;

import hu.btphoto.profile.dto.AddressRequest;
import hu.btphoto.profile.dto.BusinessRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegistrationRequest(
        @NotBlank @Size(max = 100) String lastName,
        @NotBlank @Size(max = 100) String firstName,
        @Size(max = 24) String salutation,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(max = 72) String password,
        @NotBlank @Size(max = 72) String passwordConfirmation,
        @Size(max = 32) String phone,
        @Size(max = 32) String mobile,
        @Valid AddressRequest homeAddress,
        @Valid AddressRequest siteAddress,
        boolean hasBusiness,
        @Valid BusinessRequest business
) {
    @Override
    public String toString() {
        return "RegistrationRequest[redacted]";
    }
}
