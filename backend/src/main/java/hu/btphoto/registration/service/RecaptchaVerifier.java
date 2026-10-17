package hu.btphoto.registration.service;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectReader;
import hu.btphoto.exception.ApiProblem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class RecaptchaVerifier {
    private final String siteKey;
    private final String secret;
    private final Set<String> hostnames;
    private final HttpClient client;
    private final ObjectReader reader;

    @Autowired
    public RecaptchaVerifier(@Value("${btphoto.recaptcha.site-key:}") String siteKey,
            @Value("${btphoto.recaptcha.secret:}") String secret,
            @Value("${btphoto.recaptcha.hostnames:}") String hostnames, ObjectMapper mapper) {
        this(siteKey, secret, hostnames, mapper, HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3)).followRedirects(HttpClient.Redirect.NEVER).build());
    }

    RecaptchaVerifier(String siteKey, String secret, String hostnames, ObjectMapper mapper, HttpClient client) {
        this.siteKey = siteKey.strip();
        this.secret = secret.strip();
        this.hostnames = Arrays.stream(hostnames.split(",")).map(String::strip)
                .map(value -> value.toLowerCase(Locale.ROOT)).filter(value -> !value.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
        this.reader = mapper.readerFor(JsonNode.class);
        this.client = client;
    }

    public String publicSiteKey() {
        return !siteKey.isEmpty() && !secret.isEmpty() && !hostnames.isEmpty() ? siteKey : "";
    }

    public void verify(String token) {
        if (publicSiteKey().isEmpty()) { throw unavailable(); }
        if (token == null || token.isBlank() || token.length() > 4096) { throw invalid(); }
        String body = "secret=" + URLEncoder.encode(secret, StandardCharsets.UTF_8)
                + "&response=" + URLEncoder.encode(token, StandardCharsets.UTF_8);
        // A secret és a token kizárólag HTTPS POST bodyba kerül; nincs redirect, URL-paraméter vagy naplózás.
        var request = HttpRequest.newBuilder(URI.create("https://www.google.com/recaptcha/api/siteverify"))
                .timeout(Duration.ofSeconds(5)).header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8)).build();
        try {
            var response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
            try (InputStream stream = response.body()) {
                if (response.statusCode() != 200 || stream == null) { throw unavailable(); }
                byte[] bytes = stream.readNBytes(8193);
                if (bytes.length > 8192) { throw unavailable(); }
                JsonNode result = reader.readValue(bytes);
                if (result == null || !result.isObject() || !result.path("success").isBoolean()) {
                    throw unavailable();
                }
                if (!result.path("success").booleanValue()
                        || !result.path("hostname").isTextual()
                        || !hostnames.contains(result.path("hostname").textValue().toLowerCase(Locale.ROOT))) {
                    throw invalid();
                }
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (IOException exception) {
            throw unavailable();
        }
    }

    private ApiProblem unavailable() {
        return new ApiProblem(HttpStatus.SERVICE_UNAVAILABLE, "CAPTCHA_UNAVAILABLE",
                "A CAPTCHA ellenőrzés jelenleg nem érhető el.");
    }

    private ApiProblem invalid() {
        return new ApiProblem(HttpStatus.BAD_REQUEST, "CAPTCHA_INVALID",
                "Kérjük végezze el újra a CAPTCHA ellenőrzést.");
    }
}
