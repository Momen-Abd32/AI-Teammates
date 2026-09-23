FROM docker:27-cli
WORKDIR /app
COPY server.sh /app/server.sh
RUN chmod +x /app/server.sh
EXPOSE 8010
CMD ["/app/server.sh"]
