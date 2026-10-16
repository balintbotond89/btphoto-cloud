package hu.btphoto.security;

import hu.btphoto.exception.ApiProblem;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PasswordPolicyTest {
    private final PasswordPolicy policy = new PasswordPolicy();

    @Test
    void acceptsLongMatchingPasswordWithoutTrimming() {
        assertDoesNotThrow(() -> policy.validate(" valid-password ", " valid-password "));
        assertDoesNotThrow(() -> policy.validate("📷".repeat(12), "📷".repeat(12)));
    }

    @Test
    void rejectsShortDifferentAndOverByteLimitPasswords() {
        assertThrows(ApiProblem.class, () -> policy.validate("short", "short"));
        assertThrows(ApiProblem.class, () -> policy.validate("valid-password", "other-password"));
        assertThrows(ApiProblem.class, () -> policy.validate("á".repeat(37), "á".repeat(37)));
        assertThrows(ApiProblem.class, () -> policy.validate("\uD800".repeat(12), "\uD800".repeat(12)));
    }
}
