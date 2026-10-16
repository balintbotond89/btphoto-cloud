package hu.btphoto.registration;

import com.fasterxml.jackson.databind.ObjectMapper;
import hu.btphoto.exception.ApiProblem;
import hu.btphoto.registration.service.RegistrationLimiter;
import hu.btphoto.registration.service.RegistrationRateFilter;
import hu.btphoto.security.SecurityErrorWriter;
import hu.btphoto.security.TrustedClientAddress;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.fail;

class RegistrationLimiterTest {
    @Test
    void sixthAttemptIsLimitedButDifferentClientStillAllowed() {
        var limiter = new RegistrationLimiter();
        for (int attempt = 0; attempt < 5; attempt++) { limiter.check("192.0.2.1"); }
        var error = assertThrows(ApiProblem.class, () -> limiter.check("192.0.2.1"));
        assertEquals(429, error.getStatus().value());
        limiter.check("192.0.2.2");
    }

    @Test
    void forwardedAddressIsIgnoredOutsideTrustedGateway() {
        var request = new MockHttpServletRequest();
        request.setRemoteAddr("192.0.2.1");
        request.addHeader("X-BTPhoto-Client-IP", "198.51.100.5");
        request.addHeader("X-Forwarded-For", "198.51.100.6");
        assertEquals("192.0.2.1", new TrustedClientAddress("127.0.0.1").resolve(request));
    }

    @Test
    void trustedGatewayUsesOnlyOverwrittenSingleAddressHeader() {
        var request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        request.addHeader("X-BTPhoto-Client-IP", "198.51.100.5");
        request.addHeader("X-Forwarded-For", "203.0.113.1");
        assertEquals("198.51.100.5", new TrustedClientAddress("localhost").resolve(request));
        request.removeHeader("X-BTPhoto-Client-IP");
        assertThrows(ApiProblem.class, () -> new TrustedClientAddress("localhost").resolve(request));
    }

    @Test
    void encodedRegistrationPathCannotBypassTheAttemptLimit() throws Exception {
        var limiter = new RegistrationLimiter();
        for (int attempt = 0; attempt < 5; attempt++) { limiter.check("192.0.2.1"); }
        var filter = new RegistrationRateFilter(limiter, new TrustedClientAddress("127.0.0.1"),
                new SecurityErrorWriter(new ObjectMapper()));
        for (String path : new String[]{"/api/auth/register", "/api/auth/%72egister"}) {
            var request = new MockHttpServletRequest("POST", path);
            request.setRemoteAddr("192.0.2.1");
            var response = new MockHttpServletResponse();
            filter.doFilter(request, response, (incoming, outgoing) -> fail("A limitált kérés továbbjutott."));
            assertEquals(429, response.getStatus());
        }
    }
}
