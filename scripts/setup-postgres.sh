#!/usr/bin/env bash
set -e

echo "[pg-setup] Starting PostgreSQL service..."
service postgresql start

echo "[pg-setup] Configuring agaate user and database..."
su - postgres << 'EOF'
psql -v ON_ERROR_STOP=1 <<-EOSQL
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'agaate') THEN
      CREATE ROLE agaate WITH LOGIN SUPERUSER CREATEDB PASSWORD 'local-development-only';
    ELSE
      ALTER ROLE agaate WITH LOGIN SUPERUSER CREATEDB PASSWORD 'local-development-only';
    END IF;
  END
  \$\$;

  SELECT 'CREATE DATABASE agaate OWNER agaate'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'agaate')\gexec

  GRANT ALL PRIVILEGES ON DATABASE agaate TO agaate;
EOSQL
EOF

# Ensure pg_hba.conf allows local password auth
CONF_DIR=$(ls -d /etc/postgresql/*/main | head -n 1)
if [ -d "$CONF_DIR" ]; then
  sed -i 's/local   all             all                                     peer/local   all             all                                     trust/g' "$CONF_DIR/pg_hba.conf"
  sed -i 's/host    all             all             127.0.0.1\/32            scram-sha-256/host    all             all             127.0.0.1\/32            trust/g' "$CONF_DIR/pg_hba.conf"
  sed -i 's/host    all             all             ::1\/128                 scram-sha-256/host    all             all             ::1\/128                 trust/g' "$CONF_DIR/pg_hba.conf"
  service postgresql reload
fi

echo "[pg-setup] PostgreSQL is configured and ready on 127.0.0.1:5432!"
