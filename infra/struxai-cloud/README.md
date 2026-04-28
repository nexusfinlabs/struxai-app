# STRUXAI Cloud (servicio VPS)

Servicio Node ligero que expone HTTP para almacenar archivos grandes
en el VPS propio (`openclawd-vps`) en lugar de Cloudflare R2, cuando el
usuario activa el opt-in en `/app/settings`.

## Ubicación en disco

```
/srv/struxai-cloud/
└── users/
    └── {user_id}/
        └── projects/
            └── {project_id}/
                └── {file_id}.{ext}
```

`/srv/struxai-cloud` es la ubicación recomendada (FHS-conformant para
servicios self-hosted). Crear con permisos `750` y owner del usuario
del servicio (ej. `struxai`).

## Endpoints

- `POST /upload?filename=<safe>` — sube un archivo. Header
  `Authorization: Bearer <token>` con HMAC firmado por el backend Next.
  Body: bytes del archivo.
- `GET /download/{file_id}` — descarga; mismo esquema de bearer.
- `DELETE /file/{file_id}` — borrado.
- `GET /quota` — devuelve `{used_bytes, free_bytes, quota_gb}` (con bearer).

El bearer token contiene `{user_id, project_id, file_id, ext, exp}` y
debe verificarse con HMAC-SHA256 usando `STRUXAI_CLOUD_SIGNING_SECRET`.

## Variables de entorno

```
STRUXAI_CLOUD_PORT=8443
STRUXAI_CLOUD_BASE_DIR=/srv/struxai-cloud
STRUXAI_CLOUD_SIGNING_SECRET=<mismo secret que en la app Next>
STRUXAI_CLOUD_TLS_CERT=/etc/letsencrypt/live/cloud.struxai.nexusfinlabs.com/fullchain.pem
STRUXAI_CLOUD_TLS_KEY=/etc/letsencrypt/live/cloud.struxai.nexusfinlabs.com/privkey.pem
```

## Despliegue (resumen)

1. Crear usuario y carpeta:
   ```bash
   sudo useradd -r -s /usr/sbin/nologin struxai
   sudo mkdir -p /srv/struxai-cloud
   sudo chown struxai:struxai /srv/struxai-cloud
   sudo chmod 750 /srv/struxai-cloud
   ```
2. Copiar `server.mjs` a `/opt/struxai-cloud/server.mjs`.
3. Instalar systemd unit (`struxai-cloud.service`).
4. DNS: apuntar `cloud.struxai.nexusfinlabs.com` al VPS.
5. Certbot para TLS.
6. Añadir las env vars en la app Next (Vercel Project Settings).

Ver `server.mjs` y `struxai-cloud.service` en este directorio.
