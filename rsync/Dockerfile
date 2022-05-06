FROM ghcr.io/ajayyy/sb-server:latest
EXPOSE 873/tcp
RUN apk add rsync>3.2.4-r0

CMD rsync --no-detach --daemon & ./entrypoint.sh