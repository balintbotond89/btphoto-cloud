package hu.btphoto.profile.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record BusinessRequest(
        @NotBlank @Size(max = 32) String type,
        @NotBlank @Size(max = 200) String name,
        @NotBlank @Size(max = 32) String taxNumber,
        @Size(max = 32) String registrationNumber,
        @NotNull @Valid AddressRequest address
) {
    @Override
    public String toString() { return "BusinessRequest[redacted]"; }
}
