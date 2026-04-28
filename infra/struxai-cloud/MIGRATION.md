# Migrar STRUXAI Cloud a otro VPS

Cuando quieras pasar el storage a un VPS más potente (más RAM, más SSD,
mejor red), sigue este runbook. Está diseñado para ser **online**:
los usuarios pueden seguir subiendo durante casi todo el proceso, y
solo hay un downtime de segundos al hacer el switch DNS final.

## Resumen de qué hay que mover

Solo **dos cosas**, todo lo demás vive fuera del VPS:

1. **Datos**: `/srv/struxai-cloud/` (todos los archivos de los usuarios).
2. **Servicio**: `/opt/struxai-cloud/server.mjs` + `systemd` unit + env vars.

NO necesitas migrar:
- Base de datos → vive en Supabase, no toca.
- Auth/sesiones → Supabase, no toca.
- App Next.js → Vercel, no toca.
- Metadatos de archivos (`files.storage_path`, `files.external_url`) →
  vive en Supabase. Pero sí debe seguir apuntando al endpoint correcto
  (DNS, no IP), por eso usamos `cloud.struxai.nexusfinlabs.com` y
  cambiamos solo el DNS al final.

## Estrategia (zero-downtime)

Aprovechamos que la app usa **DNS** (`STRUXAI_CLOUD_ENDPOINT`) y no IP.
El plan:

1. Levantar el nuevo VPS con la misma config y servicio.
2. **Sync inicial** con `rsync` mientras el viejo sigue activo.
3. **Sync delta** repetido cada pocos minutos hasta que estemos listos.
4. **Pausa breve** (≤30 s): bloquear writes en el viejo, último rsync,
   cambiar DNS, los nuevos uploads van al nuevo VPS.
5. Verificar y apagar el viejo a las 24-48h.

## Paso a paso

### 1. Preparar el nuevo VPS

```bash
ssh <nuevo-vps>
sudo useradd -r -s /usr/sbin/nologin struxai
sudo mkdir -p /srv/struxai-cloud /opt/struxai-cloud
sudo chown struxai:struxai /srv/struxai-cloud
sudo chmod 750 /srv/struxai-cloud
sudo apt update && sudo apt install -y nodejs nginx certbot python3-certbot-nginx rsync
```

Copia el servicio:

```bash
scp infra/struxai-cloud/server.mjs <nuevo-vps>:/tmp/server.mjs
ssh <nuevo-vps> "sudo mv /tmp/server.mjs /opt/struxai-cloud/ && sudo chown root:root /opt/struxai-cloud/server.mjs"
scp infra/struxai-cloud/struxai-cloud.service <nuevo-vps>:/tmp/
ssh <nuevo-vps> "sudo mv /tmp/struxai-cloud.service /etc/systemd/system/"
```

Crea el env file con el **mismo** signing secret que el viejo (importante:
si lo cambias, los tokens emitidos por la app dejarán de validar):

```bash
ssh <nuevo-vps>
sudo tee /etc/struxai-cloud.env > /dev/null <<EOF
STRUXAI_CLOUD_PORT=8443
STRUXAI_CLOUD_BASE_DIR=/srv/struxai-cloud
STRUXAI_CLOUD_SIGNING_SECRET=<el-mismo-de-siempre>
EOF
sudo chmod 600 /etc/struxai-cloud.env
```

NO arranques el servicio aún.

### 2. Sync inicial

Desde el viejo (o desde tu Mac vía SSH ProxyCommand):

```bash
ssh openclawd-vps
sudo rsync -avhP --delete \
  /srv/struxai-cloud/ \
  <nuevo-vps>:/srv/struxai-cloud/
```

Si tienes muchos GB, lánzalo en `tmux`/`screen` y deja que corra.

### 3. Sync delta repetido

Mientras los usuarios siguen usando el viejo:

```bash
while true; do
  sudo rsync -avhP --delete /srv/struxai-cloud/ <nuevo-vps>:/srv/struxai-cloud/
  sleep 120
done
```

Cuando los deltas son pequeños y rápidos, estás listo para el switch.

### 4. Switch (≤30 s downtime de uploads)

a. **Bloquear writes en el viejo** (lo más simple: parar el servicio):

```bash
ssh openclawd-vps "sudo systemctl stop struxai-cloud"
```

A partir de aquí los uploads de nuevos archivos fallan con 502/503
durante segundos, pero la app sigue mostrando metadatos y los
downloads de archivos ya en R2/Supabase funcionan.

b. **Último rsync** (debería ser muy rápido):

```bash
sudo rsync -avhP --delete /srv/struxai-cloud/ <nuevo-vps>:/srv/struxai-cloud/
```

c. **Arrancar el servicio en el nuevo VPS**:

```bash
ssh <nuevo-vps>
sudo systemctl daemon-reload
sudo systemctl enable --now struxai-cloud
sudo systemctl status struxai-cloud
```

d. **Cambiar DNS** `cloud.struxai.nexusfinlabs.com` para apuntar al
nuevo VPS. TTL bajo (60-300 s) hace que la propagación sea rápida.

e. **Re-emitir TLS** (si certbot todavía no corrió):

```bash
ssh <nuevo-vps>
sudo certbot --nginx -d cloud.struxai.nexusfinlabs.com
```

(o reusa el mismo certificado copiándolo de `/etc/letsencrypt`).

### 5. Verificar

Desde la app:

1. Abre `/app/projects`, sube un archivo >50 MB.
2. Comprueba que aparece con provider = `struxai_cloud`.
3. Bajalo y verifica integridad.

Desde el VPS:

```bash
ssh <nuevo-vps>
ls -la /srv/struxai-cloud/users/<tu-user-id>/projects/
sudo journalctl -u struxai-cloud -n 50
```

### 6. Apagar el viejo

Espera 24-48h (por si surgen sorpresas) y entonces:

```bash
ssh openclawd-vps "sudo systemctl disable --now struxai-cloud"
```

Mantén los datos en `/srv/struxai-cloud` por una semana más antes
de borrar/redimensionar el viejo VPS.

## Por qué este diseño es seguro

- **DNS abstrae el host**: la app no codifica IPs ni hostnames de VPS
  específicos, sólo `cloud.struxai.<dominio>`.
- **Same signing secret**: tokens emitidos por la app son válidos en
  cualquier VPS que comparta el secret. No hace falta invalidar sesiones.
- **Storage layout estable**: `/srv/struxai-cloud/users/{user_id}/projects/{project_id}/{file_id}.{ext}`
  funciona idéntico en cualquier filesystem que soporte Linux.
- **Datos cliente sin tocar**: Supabase (auth, metadatos) sigue en su
  proveedor managed. Nada que migrar ahí.
- **Fallback R2**: si algo va mal con el VPS nuevo y los uploads fallan,
  el tier-decision automáticamente cae a R2 (si está configurado).

## Si quieres añadir redundancia activa-activa

Para no depender de un solo VPS:

1. Levanta **2 VPS** detrás de un load balancer (`nginx`, Caddy, o
   Cloudflare Tunnel con healthchecks).
2. Replica con `lsyncd` (real-time) o `rclone sync` cada N minutos.
3. La app no tiene que cambiar nada — sigue llamando a un único endpoint.

Para cuando crezcas más, el siguiente salto sería pasar a un object
store gestionado (R2, MinIO en Kubernetes, Backblaze B2). El código
tier-decision ya soporta R2 sin tocar nada.
