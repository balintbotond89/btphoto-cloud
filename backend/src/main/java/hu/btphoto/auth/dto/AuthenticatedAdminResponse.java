package hu.btphoto.auth.dto;

import java.util.UUID;

public record AuthenticatedAdminResponse(String username, String role, String displayName,
        boolean requiresPasswordChange, UUID workspaceId, String avatarUrl) {
    @Override
    public String toString() { return "AuthenticatedAdminResponse[redacted]"; }
}
