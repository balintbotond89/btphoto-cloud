# syntax=docker/dockerfile:1.7

FROM eclipse-temurin:21.0.12.1_1-jdk-jammy@sha256:e0c60c487345d1dc9d0fc7b6f0496f3cc941e5132e09296cc17a6decc71b902b AS build

WORKDIR /workspace

# A Maven Wrapper ZIP-kibontását a JDK saját `jar` eszköze biztosítja.
RUN <<'EOF'
cat > /usr/local/bin/unzip <<'SCRIPT'
#!/bin/sh
set -eu

archive=""
destination="."

while [ "$#" -gt 0 ]; do
    case "$1" in
        -q)
            shift
            ;;
        -d)
            destination="$2"
            shift 2
            ;;
        *)
            archive="$1"
            shift
            ;;
    esac
done

mkdir -p "$destination"
cd "$destination"
jar xf "$archive"
find . -type f \( \
    -path '*/bin/mvn' -o \
    -path '*/bin/mvnDebug' -o \
    -path '*/bin/mvnyjp' \
\) -exec chmod 0755 {} +
SCRIPT
chmod 0755 /usr/local/bin/unzip
EOF

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x ./mvnw \
    && ./mvnw -B -ntp dependency:go-offline

COPY config/ config/
COPY src/ src/

RUN ./mvnw -B -ntp -DskipTests \
      -Dproject.build.outputTimestamp=1980-01-01T00:00:02Z package \
    && cp target/btphoto-backend-*.jar /tmp/btphoto-backend.jar

# A JRE beépített HTTP-kliensére épülő, külön csomagot nem igénylő healthcheck.
RUN <<'EOF'
cat > /tmp/HealthCheck.java <<'JAVA'
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public final class HealthCheck {
    private HealthCheck() {
    }

    public static void main(String[] args) throws Exception {
        var client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .build();
        var request = HttpRequest.newBuilder(URI.create(args[0]))
                .timeout(Duration.ofSeconds(3))
                .GET()
                .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200 || !response.body().contains("\"status\":\"UP\"")) {
            System.exit(1);
        }
    }
}
JAVA
javac -d /tmp/healthcheck /tmp/HealthCheck.java
EOF

FROM eclipse-temurin:21.0.12.1_1-jre-jammy@sha256:f04fb34e053148344e83317976114ec3f37e4b830ec8bdab5a2fe3cecd7d010b AS runtime

ARG OCI_SOURCE
ARG OCI_REVISION

LABEL org.opencontainers.image.source="${OCI_SOURCE}" \
      org.opencontainers.image.revision="${OCI_REVISION}"

RUN groupadd --system --gid 10001 btphoto \
    && useradd --system --uid 10001 --gid btphoto \
      --home-dir /nonexistent --shell /usr/sbin/nologin btphoto

WORKDIR /app

COPY --from=build --chown=10001:10001 /tmp/btphoto-backend.jar /app/btphoto-backend.jar
COPY --from=build --chown=10001:10001 /tmp/healthcheck/ /app/healthcheck/

USER 10001:10001

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["java", "-cp", "/app/healthcheck", "HealthCheck", "http://127.0.0.1:8080/api/health"]

ENTRYPOINT ["java", "-jar", "/app/btphoto-backend.jar"]
