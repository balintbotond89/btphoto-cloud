package hu.btphoto.security;

import java.nio.charset.StandardCharsets;

import hu.btphoto.exception.ApiProblem;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class PasswordPolicy {
    public void validate(String password, String confirmation) {
        if (password == null || password.codePointCount(0, password.length()) < 12
                || !StandardCharsets.UTF_8.newEncoder().canEncode(password)
                || password.getBytes(StandardCharsets.UTF_8).length > 72
                || !password.equals(confirmation)) {
            throw new ApiProblem(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD",
                    "A jelszavak egyezzenek, legalább 12 karakterrel és legfeljebb 72 UTF-8 bájttal.");
        }
    }
}
