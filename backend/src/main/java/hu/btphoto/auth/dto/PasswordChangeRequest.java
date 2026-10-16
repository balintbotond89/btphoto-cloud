package hu.btphoto.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordChangeRequest(@Size(max = 72) String currentPassword,
        @NotBlank @Size(max = 72) String newPassword, @NotBlank @Size(max = 72) String confirmation) {
    @Override
    public String toString() { return "PasswordChangeRequest[redacted]"; }
}
