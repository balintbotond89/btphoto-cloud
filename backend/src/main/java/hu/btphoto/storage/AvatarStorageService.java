package hu.btphoto.storage;

import java.util.UUID;

import org.springframework.web.multipart.MultipartFile;

public interface AvatarStorageService {
    void verifyReady();
    String store(UUID workspaceId, UUID accountId, MultipartFile avatar);
    byte[] read(UUID workspaceId, UUID accountId, String relativePath);
    void compensate(UUID workspaceId, UUID accountId, String relativePath);
}
