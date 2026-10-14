package hu.btphoto.auth.dto;

public record CsrfTokenResponse(String headerName, String parameterName, String token) {
}
