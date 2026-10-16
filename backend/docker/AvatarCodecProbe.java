import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

import javax.imageio.ImageIO;

public final class AvatarCodecProbe {
    private AvatarCodecProbe() {
    }

    public static void main(String[] args) throws Exception {
        // A végleges nem root JRE-ben valódi PNG- és JPEG-kódolást/dekódolást ellenőriz.
        for (String format : new String[] {"PNG", "JPEG"}) {
            var bytes = new ByteArrayOutputStream();
            if (!ImageIO.write(new BufferedImage(256, 256, BufferedImage.TYPE_INT_RGB), format, bytes)) {
                throw new IllegalStateException("Hiányzó képkódoló.");
            }
            var decoded = ImageIO.read(new ByteArrayInputStream(bytes.toByteArray()));
            if (decoded == null || decoded.getWidth() != 256 || decoded.getHeight() != 256) {
                throw new IllegalStateException("Hibás képfeldolgozási runtime.");
            }
        }
        System.out.println("Avatar codec runtime OK");
    }
}
