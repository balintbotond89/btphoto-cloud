package hu.btphoto.storage;

import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.util.Set;
import java.util.UUID;

import javax.imageio.ImageIO;

import hu.btphoto.exception.ApiProblem;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class NfsAvatarStorageService implements AvatarStorageService {
    private final String configuredRoot;
    private final boolean requireNfs;

    public NfsAvatarStorageService(@Value("${btphoto.avatar.root:}") String root,
            @Value("${btphoto.avatar.require-nfs:true}") boolean requireNfs) {
        this.configuredRoot = root;
        this.requireNfs = requireNfs;
    }

    @Override
    public void verifyReady() {
        try {
            Path root = root();
            String type = Files.getFileStore(root).type().toLowerCase(java.util.Locale.ROOT);
            if (!Files.isWritable(root) || (requireNfs && !Set.of("nfs", "nfs4").contains(type))) {
                throw unavailable();
            }
        } catch (IOException exception) {
            throw unavailable();
        }
    }

    private Path root() throws IOException {
        if (configuredRoot.isBlank()) {
            throw unavailable();
        }
        Path root = Path.of(configuredRoot).toAbsolutePath().normalize();
        assertNoSymlink(root);
        if (!Files.isDirectory(root, LinkOption.NOFOLLOW_LINKS)) {
            throw unavailable();
        }
        return root.toRealPath(LinkOption.NOFOLLOW_LINKS);
    }

    private void assertNoSymlink(Path path) {
        Path current = path.getRoot();
        for (Path part : path) {
            current = current.resolve(part);
            if (Files.isSymbolicLink(current)) {
                throw unavailable();
            }
        }
    }

    private String prefix(UUID workspaceId, UUID accountId) {
        return "tenants/" + workspaceId + "/avatars/" + accountId + "/";
    }

    private Path safePath(UUID workspaceId, UUID accountId, String relativePath) throws IOException {
        if (relativePath == null || !relativePath.startsWith(prefix(workspaceId, accountId))) {
            throw notFound();
        }
        String filename = relativePath.substring(prefix(workspaceId, accountId).length());
        if (!filename.matches("[0-9a-f-]{36}\\.png")) {
            throw notFound();
        }
        try {
            UUID.fromString(filename.substring(0, 36));
        } catch (IllegalArgumentException exception) {
            throw notFound();
        }
        Path root = root();
        Path target = root.resolve(relativePath).normalize();
        if (!target.startsWith(root)) {
            throw notFound();
        }
        assertNoSymlink(target);
        return target;
    }

    @Override
    public String store(UUID workspaceId, UUID accountId, MultipartFile avatar) {
        verifyReady();
        byte[] normalized = normalize(avatar);
        String relative = prefix(workspaceId, accountId) + UUID.randomUUID() + ".png";
        Path staging = null;
        Path target = null;
        boolean targetOwned = false;
        try {
            target = safePath(workspaceId, accountId, relative);
            Path parent = java.util.Objects.requireNonNull(target.getParent());
            Files.createDirectories(parent);
            assertNoSymlink(parent);
            staging = Files.createTempFile(parent, ".staging-", ".png");
            Files.write(staging, normalized, StandardOpenOption.TRUNCATE_EXISTING);
            Files.createFile(target);
            targetOwned = true;
            Files.move(staging, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            return relative;
        } catch (IOException exception) {
            if (staging != null) {
                deleteOwnFile(staging);
            }
            if (targetOwned) {
                deleteOwnFile(target);
            }
            throw unavailable();
        }
    }

    private byte[] normalize(MultipartFile avatar) {
        if (avatar == null || avatar.isEmpty() || avatar.getSize() > 2L * 1024 * 1024) {
            throw invalidImage();
        }
        try {
            byte[] upload = avatar.getBytes();
            rejectAnimatedPng(upload);
            return normalizeBytes(upload);
        } catch (IOException exception) {
            throw invalidImage();
        }
    }

    private byte[] normalizeBytes(byte[] upload) {
        try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(upload))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw invalidImage();
            }
            var reader = readers.next();
            try {
                reader.setInput(input, true, true);
                String format = reader.getFormatName().toUpperCase(java.util.Locale.ROOT);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (!Set.of("PNG", "JPEG").contains(format) || width < 1 || height < 1
                        || width > 4096 || height > 4096 || (long) width * height > 4_000_000) {
                    throw invalidImage();
                }
                BufferedImage source = reader.read(0);
                var output = new BufferedImage(256, 256, BufferedImage.TYPE_INT_ARGB);
                var graphics = output.createGraphics();
                try {
                    graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                            RenderingHints.VALUE_INTERPOLATION_BILINEAR);
                    int side = Math.min(width, height);
                    int left = (width - side) / 2;
                    int top = (height - side) / 2;
                    graphics.drawImage(source, 0, 0, 256, 256, left, top, left + side, top + side, null);
                } finally {
                    graphics.dispose();
                }
                var bytes = new ByteArrayOutputStream();
                if (!ImageIO.write(output, "PNG", bytes)) {
                    throw unavailable();
                }
                return bytes.toByteArray();
            } finally {
                reader.dispose();
            }
        } catch (IOException | IllegalArgumentException exception) {
            throw invalidImage();
        }
    }

    private void rejectAnimatedPng(byte[] upload) {
        if (upload.length < 8 || upload[0] != (byte) 137 || upload[1] != 'P'
                || upload[2] != 'N' || upload[3] != 'G') {
            return;
        }
        int offset = 8;
        while (offset + 12 <= upload.length) {
            int length = java.nio.ByteBuffer.wrap(upload, offset, 4).getInt();
            if (length < 0 || length > upload.length - offset - 12) {
                throw invalidImage();
            }
            if (upload[offset + 4] == 'a' && upload[offset + 5] == 'c'
                    && upload[offset + 6] == 'T' && upload[offset + 7] == 'L') {
                throw invalidImage();
            }
            offset += length + 12;
        }
    }

    @Override
    public byte[] read(UUID workspaceId, UUID accountId, String relativePath) {
        try {
            Path path = safePath(workspaceId, accountId, relativePath);
            if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS) || Files.size(path) > 2L * 1024 * 1024) {
                throw notFound();
            }
            return Files.readAllBytes(path);
        } catch (IOException exception) {
            throw notFound();
        }
    }

    @Override
    public void compensate(UUID workspaceId, UUID accountId, String relativePath) {
        if (relativePath != null) {
            try {
                deleteOwnFile(safePath(workspaceId, accountId, relativePath));
            } catch (IOException exception) {
                throw unavailable();
            }
        }
    }

    private void deleteOwnFile(Path path) {
        try {
            Files.deleteIfExists(path);
        } catch (IOException exception) {
            throw unavailable();
        }
    }

    private ApiProblem invalidImage() {
        return new ApiProblem(HttpStatus.BAD_REQUEST, "INVALID_AVATAR",
                "Az avatar legfeljebb 2 MiB méretű JPEG vagy PNG, legfeljebb 4096 pixel és 4 megapixel lehet.");
    }

    private ApiProblem unavailable() {
        return new ApiProblem(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_UNAVAILABLE",
                "A képtároló átmenetileg nem érhető el.");
    }

    private ApiProblem notFound() {
        return new ApiProblem(HttpStatus.NOT_FOUND, "NOT_FOUND", "A kép nem található.");
    }
}
