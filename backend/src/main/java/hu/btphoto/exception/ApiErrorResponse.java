package hu.btphoto.exception;

import java.util.Map;

public record ApiErrorResponse(String code, String message, Map<String, String> fields) {
    public ApiErrorResponse {
        fields = fields == null ? Map.of() : Map.copyOf(fields);
    }

    public ApiErrorResponse(String code, String message) {
        this(code, message, Map.of());
    }
}
