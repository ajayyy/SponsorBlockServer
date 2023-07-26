FROM alpine as builder
WORKDIR /scripts
COPY ./backup.sh ./backup.sh
COPY ./forget.sh ./forget.sh

FROM alpine
RUN apk add --no-cache postgresql-client restic
COPY --from=builder --chmod=755 /scripts /usr/src/app/

RUN echo '30  *  *  *  *    /usr/src/app/backup.sh' >> /etc/crontabs/root
RUN echo '10  0  *  *  1    /usr/src/app/forget.sh' >> /etc/crontabs/root

CMD crond -l 2 -f
