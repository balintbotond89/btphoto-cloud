package hu.btphoto.storage;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import javax.imageio.ImageIO;

import hu.btphoto.exception.ApiProblem;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AvatarStorageTest {
    @TempDir
    Path root;

    @Test
    void normalizesAndIsolatesTwoPhotographersAndSurvivesNewStorageInstance() throws Exception {
        var storage = new NfsAvatarStorageService(root.toString(), false);
        var firstWorkspace = UUID.randomUUID();
        var firstAccount = UUID.randomUUID();
        var secondWorkspace = UUID.randomUUID();
        var secondAccount = UUID.randomUUID();
        String first = storage.store(firstWorkspace, firstAccount, image(500, 300));
        String second = storage.store(secondWorkspace, secondAccount, image(300, 500));
        assertTrue(first.startsWith("tenants/" + firstWorkspace + "/avatars/" + firstAccount + "/"));
        var restarted = new NfsAvatarStorageService(root.toString(), false);
        var decoded = ImageIO.read(new ByteArrayInputStream(restarted.read(firstWorkspace, firstAccount, first)));
        assertEquals(256, decoded.getWidth());
        assertEquals(256, decoded.getHeight());
        assertThrows(ApiProblem.class, () -> restarted.read(secondWorkspace, secondAccount, first));
        storage.compensate(firstWorkspace, firstAccount, first);
        assertFalse(Files.exists(root.resolve(first)));
        assertTrue(Files.exists(root.resolve(second)));
    }

    @Test
    void rejectsCorruptSvgOversizedAndPixelBombImages() throws Exception {
        var storage = new NfsAvatarStorageService(root.toString(), false);
        var workspace = UUID.randomUUID();
        var account = UUID.randomUUID();
        assertThrows(ApiProblem.class, () -> storage.store(workspace, account,
                new MockMultipartFile("avatar", "photo.png", "image/png", new byte[] {1, 2, 3})));
        assertThrows(ApiProblem.class, () -> storage.store(workspace, account,
                new MockMultipartFile("avatar", "photo.svg", "image/svg+xml", "<svg/>".getBytes())));
        assertThrows(ApiProblem.class, () -> storage.store(workspace, account,
                new MockMultipartFile("avatar", new byte[2 * 1024 * 1024 + 1])));
        var huge = image(2100, 2100);
        assertThrows(ApiProblem.class, () -> storage.store(workspace, account, huge));
        assertThrows(ApiProblem.class, () -> storage.read(workspace, account,
                "tenants/" + workspace + "/avatars/" + account + "/../../outside.png"));
    }

    @Test
    void rejectsAnimatedPngEvenWhenTheFirstFrameIsDecodable() throws Exception {
        byte[] original = image(100, 100).getBytes();
        var chunk = java.nio.ByteBuffer.allocate(20);
        chunk.putInt(8).put(new byte[] {'a', 'c', 'T', 'L'}).putInt(2).putInt(0);
        var crc = new java.util.zip.CRC32();
        crc.update(chunk.array(), 4, 12);
        chunk.putInt((int) crc.getValue());
        var bytes = new ByteArrayOutputStream();
        bytes.write(original, 0, 33);
        bytes.write(chunk.array());
        bytes.write(original, 33, original.length - 33);
        var avatar = new MockMultipartFile("avatar", bytes.toByteArray());
        var storage = new NfsAvatarStorageService(root.toString(), false);
        assertThrows(ApiProblem.class, () -> storage.store(UUID.randomUUID(), UUID.randomUUID(), avatar));
    }

    @Test
    void rejectsMissingRootAndNonNfsProductionRoot() {
        assertThrows(ApiProblem.class, () -> new NfsAvatarStorageService(root.resolve("missing").toString(),
                false).verifyReady());
        assertThrows(ApiProblem.class, () -> new NfsAvatarStorageService(root.toString(), true).verifyReady());
    }

    private MockMultipartFile image(int width, int height) throws Exception {
        var bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB), "PNG", bytes);
        return new MockMultipartFile("avatar", "ignored-name.jpg", "image/jpeg", bytes.toByteArray());
    }
}
