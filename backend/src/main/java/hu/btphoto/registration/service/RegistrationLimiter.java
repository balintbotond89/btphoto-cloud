package hu.btphoto.registration.service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import hu.btphoto.exception.ApiProblem;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class RegistrationLimiter {
    private record Window(long start, int count) { }
    private final Map<String, Window> windows = new HashMap<>();

    public synchronized void check(String client) {
        long now = Instant.now().getEpochSecond();
        windows.entrySet().removeIf(entry -> now - entry.getValue().start() >= 600);
        Window window = windows.get(client);
        if (window == null) {
            if (windows.size() >= 10_000) {
                throw limited();
            }
            windows.put(client, new Window(now, 1));
        } else if (window.count() >= 5) {
            throw limited();
        } else {
            windows.put(client, new Window(window.start(), window.count() + 1));
        }
    }

    private ApiProblem limited() {
        return new ApiProblem(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED",
                "Túl sok regisztrációs kísérlet. Próbáld újra 10 perc múlva.");
    }
}
