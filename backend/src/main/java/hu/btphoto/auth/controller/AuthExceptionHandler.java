package hu.btphoto.auth.controller;

import hu.btphoto.exception.ApiErrorResponse;
import hu.btphoto.exception.ApiProblem;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class AuthExceptionHandler {

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiErrorResponse> handleAuthenticationFailure(AuthenticationException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiErrorResponse(
                        "AUTHENTICATION_FAILED",
                        "A megadott hitelesítési adatok érvénytelenek."
                ));
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class,
            MissingServletRequestPartException.class})
    public ResponseEntity<ApiErrorResponse> handleInvalidRequest(Exception exception) {
        var fields = new java.util.HashMap<String, String>();
        if (exception instanceof MethodArgumentNotValidException validation) {
            validation.getBindingResult().getFieldErrors().forEach(error ->
                    fields.put(error.getField(), "A mező hiányos vagy érvénytelen."));
        }
        return ResponseEntity.badRequest()
                .body(new ApiErrorResponse(
                        "INVALID_REQUEST",
                        "A kérés hiányos vagy érvénytelen.", fields
                ));
    }
    @ExceptionHandler(ApiProblem.class)
    public ResponseEntity<ApiErrorResponse> handleProblem(ApiProblem problem) {
        return ResponseEntity.status(problem.getStatus()).body(new ApiErrorResponse(problem.getCode(),
                problem.getMessage()));
    }

    @ExceptionHandler({DataIntegrityViolationException.class, OptimisticLockingFailureException.class})
    public ResponseEntity<ApiErrorResponse> handleConflict(Exception exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiErrorResponse("REGISTRATION_CONFLICT",
                "A művelet ezekkel az adatokkal nem rögzíthető."));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleUploadLimit(MaxUploadSizeExceededException exception) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(new ApiErrorResponse("UPLOAD_TOO_LARGE",
                "Az avatar legfeljebb 2 MiB méretű lehet."));
    }

    @ExceptionHandler({org.springframework.dao.DataAccessException.class,
            org.springframework.transaction.TransactionException.class})
    public ResponseEntity<ApiErrorResponse> handleDatabaseFailure(Exception exception) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(
                new ApiErrorResponse("DATABASE_UNAVAILABLE", "A szolgáltatás átmenetileg nem érhető el."));
    }
}
