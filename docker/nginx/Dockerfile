FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/*.conf /etc/nginx/conf.d/

# Create directories for SSL certificates
RUN mkdir -p /etc/nginx/ssl

# Generate DH parameters (this will be replaced by mounted volume in production)
RUN openssl dhparam -out /etc/nginx/ssl/dhparam.pem 2048

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
