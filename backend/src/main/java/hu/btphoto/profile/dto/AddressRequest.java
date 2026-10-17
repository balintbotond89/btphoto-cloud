package hu.btphoto.profile.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AddressRequest(
        @NotBlank @Pattern(regexp = "[A-Z]{2}") String country,
        @NotBlank @Size(max = 16) String postalCode,
        @NotBlank @Size(max = 100) String city,
        @NotBlank @Size(max = 200) String line1,
        @Size(max = 200) String line2
) {
    @Override
    public String toString() { return "AddressRequest[redacted]"; }
}
