FROM redgate/flyway:12.6.2@sha256:6209df83961fb670fdd621db5afd134f8f427dfe9665487e9f48e04fb02fd7f6

ARG OCI_SOURCE
ARG OCI_REVISION

LABEL org.opencontainers.image.source="${OCI_SOURCE}" \
      org.opencontainers.image.revision="${OCI_REVISION}"

ENV HOME=/tmp

COPY --chown=10001:10001 migrations/ /flyway/sql/

USER 10001:10001

ENTRYPOINT ["flyway"]
CMD ["migrate"]
