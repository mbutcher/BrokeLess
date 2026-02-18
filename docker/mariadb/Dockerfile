FROM mariadb:11.2

# Copy custom configuration
COPY my.cnf /etc/mysql/conf.d/custom.cnf

# Copy initialization scripts
COPY init/*.sql /docker-entrypoint-initdb.d/

# Set proper permissions
RUN chmod 644 /etc/mysql/conf.d/custom.cnf

EXPOSE 3306
