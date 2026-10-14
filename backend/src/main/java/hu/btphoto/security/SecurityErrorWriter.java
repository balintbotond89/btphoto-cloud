package hu.btphoto.security;

import java.io.IOException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;
import hu.btphoto.exception.ApiErrorResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

@Component
public class SecurityErrorWriter {

    private final ObjectWriter errorWriter;

    public SecurityErrorWriter(ObjectMapper objectMapper) {
        this.errorWriter = objectMapper.writerFor(ApiErrorResponse.class);
    }

    public void write(
            HttpServletResponse response,
            HttpStatus status,
            String code,
            String message
    ) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        errorWriter.writeValue(response.getOutputStream(), new ApiErrorResponse(code, message));
    }
}
