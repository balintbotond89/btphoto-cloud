package hu.btphoto.auth.dto;

public record CsrfTokenResponse(String headerName, String parameterName, String token) {
    @Override
    public String toString() { return "CsrfTokenResponse[redacted]"; }
}
