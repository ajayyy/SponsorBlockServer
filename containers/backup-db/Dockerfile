FROM alpine
RUN apk add postgresql-client
RUN apk add restic --repository http://dl-cdn.alpinelinux.org/alpine/latest-stable/community/

COPY ./backup.sh /usr/src/app/backup.sh
RUN chmod +x /usr/src/app/backup.sh
COPY ./forget.sh /usr/src/app/forget.sh
RUN chmod +x /usr/src/app/forget.sh

RUN echo '30  *  *  *  *    /usr/src/app/backup.sh' >> /etc/crontabs/root
RUN echo '10  0  *  *  1    /usr/src/app/forget.sh' >> /etc/crontabs/root

CMD crond -l 2 -f
