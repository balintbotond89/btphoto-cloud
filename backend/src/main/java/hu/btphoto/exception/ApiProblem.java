package hu.btphoto.exception;

import org.springframework.http.HttpStatus;

public class ApiProblem extends RuntimeException {
    private static final long serialVersionUID = 1L;
    private final HttpStatus status;
    private final String code;

    public ApiProblem(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
}
