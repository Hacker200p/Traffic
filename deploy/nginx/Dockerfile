FROM nginx:1.27-alpine

# Remove default config
RUN rm -rf /etc/nginx/conf.d/* /etc/nginx/nginx.conf

# Copy gateway config
COPY nginx.conf /etc/nginx/nginx.conf
COPY 50x.html   /usr/share/nginx/html/50x.html

# Create required directories and adjust permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx

EXPOSE 80 443 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost/ || exit 1

LABEL org.opencontainers.image.title="traffic-gateway" \
      org.opencontainers.image.description="Nginx reverse proxy gateway"

CMD ["nginx", "-g", "daemon off;"]
