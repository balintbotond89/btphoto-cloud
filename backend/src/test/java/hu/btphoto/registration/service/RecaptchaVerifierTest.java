package hu.btphoto.registration.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

import com.fasterxml.jackson.databind.ObjectMapper;
import hu.btphoto.exception.ApiProblem;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class RecaptchaVerifierTest {
    private final HttpClient client = mock(HttpClient.class);
    private final RecaptchaVerifier verifier = new RecaptchaVerifier("fixture-public", "fixture-secret",
            "localhost,www.btphoto.hu", new ObjectMapper(), client);

    @SuppressWarnings("unchecked")
    private void reply(int status, String body) throws Exception {
        HttpResponse<InputStream> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(status);
        when(response.body()).thenReturn(new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)));
        when(client.send(any(HttpRequest.class),
                org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<InputStream>>any())).thenReturn(response);
    }

    @Test
    void acceptsOnlyGoogleSuccessForConfiguredHostnameAndNeverPutsSecretInUrl() throws Exception {
        reply(200, "{\"success\":true,\"hostname\":\"www.btphoto.hu\"}");
        verifier.verify("fixture-token");
        var request = ArgumentCaptor.forClass(HttpRequest.class);
        verify(client).send(request.capture(),
                org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<InputStream>>any());
        assertEquals("https://www.google.com/recaptcha/api/siteverify", request.getValue().uri().toString());
        assertEquals("POST", request.getValue().method());
        assertNull(request.getValue().uri().getQuery());
        assertEquals("fixture-public", verifier.publicSiteKey());
    }

    @Test
    void missingOrOversizedTokenAndMissingConfigurationFailWithoutOutboundRequest() {
        assertEquals(400, assertThrows(ApiProblem.class, () -> verifier.verify(null)).getStatus().value());
        assertThrows(ApiProblem.class, () -> verifier.verify(" "));
        assertThrows(ApiProblem.class, () -> verifier.verify("x".repeat(4097)));
        var unconfigured = new RecaptchaVerifier("fixture-public", "", "localhost", new ObjectMapper(), client);
        assertEquals("", unconfigured.publicSiteKey());
        assertEquals(503, assertThrows(ApiProblem.class, () -> unconfigured.verify("fixture")).getStatus().value());
        verifyNoInteractions(client);
    }

    @Test
    void rejectsFalseExpiredDuplicateAndForeignHostnameResponses() throws Exception {
        for (String json : new String[]{"{\"success\":false,\"error-codes\":[\"timeout-or-duplicate\"]}",
                "{\"success\":true,\"hostname\":\"foreign.example\"}", "{\"success\":true}"}) {
            reply(200, json);
            assertEquals(400, assertThrows(ApiProblem.class, () -> verifier.verify("fixture")).getStatus().value());
        }
    }

    @Test
    void providerErrorMalformedAndOversizedResponseFailClosed() throws Exception {
        for (String json : new String[]{"not-json", "{}", "null", "x".repeat(8193)}) {
            reply(200, json);
            assertEquals(503, assertThrows(ApiProblem.class, () -> verifier.verify("fixture")).getStatus().value());
        }
        reply(502, "{}");
        assertEquals(503, assertThrows(ApiProblem.class, () -> verifier.verify("fixture")).getStatus().value());
    }

    @Test
    void networkFailureDoesNotExposeProviderException() throws Exception {
        when(client.send(any(HttpRequest.class),
                org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<InputStream>>any()))
                .thenThrow(new IOException("fixture-private-provider-detail"));
        var problem = assertThrows(ApiProblem.class, () -> verifier.verify("fixture"));
        assertEquals(503, problem.getStatus().value());
        assertFalse(problem.getMessage().contains("fixture-private"));
    }

    @Test
    void interruptionPreservesThreadFlagAndNeverAllowsRegistration() throws Exception {
        when(client.send(any(HttpRequest.class),
                org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<InputStream>>any()))
                .thenThrow(new InterruptedException("fixture"));
        try {
            assertThrows(ApiProblem.class, () -> verifier.verify("fixture"));
            assertTrue(Thread.currentThread().isInterrupted());
        } finally {
            Thread.interrupted();
        }
    }
}
