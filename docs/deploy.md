# Deploy del backend (staging)

Cómo se publica el backend de VaquitaApp en la nube. Complementa
[`ambientes.md`](./ambientes.md) (qué es cada ambiente) describiendo **cómo** se
despliega: el método manual (siempre disponible) y el automático (push a `develop`).

## Modelo

| | |
|---|---|
| **Rama** | `develop` (staging). `main` se reserva para producción, aún no levantada. |
| **Frontend** | Amplify, auto-build nativo al mergear a `develop` (fuera del pipeline de Actions). |
| **Backend** | ECS Express Mode, servicio `vaquitaapp-api-staging`. Imagen en ECR. |
| **Región** | `us-east-1` |

Recursos AWS (cuenta `414061811062`):

- **ECR:** `414061811062.dkr.ecr.us-east-1.amazonaws.com/vaquitaapp-api`
- **Servicio ECS:** `arn:aws:ecs:us-east-1:414061811062:service/default/vaquitaapp-api-staging`
- **URL:** `https://va-e3512a79ac0e46b3b080c1c914857691.ecs.us-east-1.on.aws` · health: `/api/health`
- **Puerto del contenedor:** `3001`

> **Las variables de entorno (MONGO_URI, JWT_SECRET, SMTP_*) viven en la configuración
> del servicio ECS**, no en el repo ni en GitHub. Tanto el deploy manual como el
> automático **solo cambian la imagen**; nunca tocan los secretos.

---

## 1. Deploy manual

Es el método base (y el fallback si el pipeline falla). Requiere Docker Desktop corriendo
y la CLI de AWS configurada con un usuario con permisos de ECR + ECS (`vaquita-deploy-cli`).

```bash
cd VaquitaApp

ECR=414061811062.dkr.ecr.us-east-1.amazonaws.com/vaquitaapp-api
ARN=arn:aws:ecs:us-east-1:414061811062:service/default/vaquitaapp-api-staging
TAG=$(git rev-parse --short HEAD)   # trazabilidad: qué commit está desplegado

# 1) Login a ECR
aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin 414061811062.dkr.ecr.us-east-1.amazonaws.com

# 2) Build + push de la imagen de producción.
#    --platform linux/amd64 es OBLIGATORIO desde un Mac ARM (la imagen corre en Fargate amd64).
docker buildx build --platform linux/amd64 --target prod \
  -t "$ECR:$TAG" -t "$ECR:latest" --push ./server

# 3) Apuntar el servicio a la nueva imagen, PRESERVANDO las env vars.
#    Se lee el primaryContainer actual y se cambia solo .image; así no se pierden
#    los secretos ni la config de logs.
PRIMARY=$(aws ecs describe-express-gateway-service --service-arn "$ARN" --region us-east-1 \
  --query 'service.activeConfigurations[0].primaryContainer' --output json \
  | jq -c --arg img "$ECR:$TAG" '{image:$img, containerPort, awsLogsConfiguration, environment}')

aws ecs update-express-gateway-service --service-arn "$ARN" --region us-east-1 \
  --primary-container "$PRIMARY"

# 4) Verificar el rollout (ECS hace despliegue rolling, zero-downtime)
curl -fsS https://va-e3512a79ac0e46b3b080c1c914857691.ecs.us-east-1.on.aws/api/health
```

**Por qué taggear por SHA y no solo `:latest`:** actualizar el servicio de `:latest` a
`:latest` puede no forzar una nueva descarga de la imagen (ECS no detecta cambio). Pasar
un tag inmutable (`$TAG`) garantiza una nueva revisión del servicio y un rollout real.

---

## 2. Deploy automático (push a `develop`)

El job `deploy-staging` en [`.github/workflows/node.js.yml`](../.github/workflows/node.js.yml)
hace exactamente lo de arriba, pero disparado por un push a `develop` y solo si pasan
`build-and-test` y `e2e`:

```
push a develop  →  build-and-test  →  e2e (Puppeteer)  →  deploy-staging
```

Pasos del job: OIDC → login ECR → `docker build`/`push` (`:<sha>` + `:latest`) →
`describe` + swap de imagen + `update-express-gateway-service` → poll de `/api/health` →
notificación a Slack. Corre en `ubuntu-latest` (amd64 nativo, sin emulación), por eso
usa `docker build` directo en vez de `buildx --platform`.

### 2.1 Autenticación: OIDC (sin llaves persistentes)

En vez de guardar un Access Key/Secret en GitHub Secrets, el pipeline usa **OIDC**:
GitHub Actions presenta un token efímero que AWS valida contra un rol IAM. Cero
credenciales de larga vida en GitHub.

**Bootstrap (una sola vez, requiere admin de la cuenta AWS — `diegovilloutafredes`,
no `vaquita-deploy-cli` que no tiene permisos de IAM):**

```bash
ACCOUNT_ID=414061811062

# 1) Identity provider de GitHub (idempotente: falla si ya existe, se ignora)
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com

# 2) Rol con trust policy acotada a ESTE repo + rama develop
cat > /tmp/trust.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike":   { "token.actions.githubusercontent.com:sub": "repo:VaquitaApp/VaquitaApp:ref:refs/heads/develop" }
    }
  }]
}
JSON
aws iam create-role --role-name github-actions-deploy \
  --assume-role-policy-document file:///tmp/trust.json

# 3) Permisos mínimos: push a ECR + describe/update del servicio Express +
#    iam:PassRole de los roles de la task (update crea una nueva revisión que
#    los referencia, lo que dispara el chequeo de PassRole).
aws iam attach-role-policy --role-name github-actions-deploy \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

cat > /tmp/ecs.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeExpressGatewayService",
        "ecs:UpdateExpressGatewayService"
      ],
      "Resource": "arn:aws:ecs:us-east-1:${ACCOUNT_ID}:service/default/vaquitaapp-api-staging"
    },
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": [
        "arn:aws:iam::${ACCOUNT_ID}:role/ecsTaskExecutionRole",
        "arn:aws:iam::${ACCOUNT_ID}:role/ecsInfrastructureRoleForExpressServices"
      ]
    }
  ]
}
JSON
aws iam put-role-policy --role-name github-actions-deploy \
  --policy-name deploy-ecs-express --policy-document file:///tmp/ecs.json
```

Luego guardar el ARN del rol como **repository variable** (no secreto):

```bash
gh variable set AWS_DEPLOY_ROLE_ARN \
  --body "arn:aws:iam::414061811062:role/github-actions-deploy" \
  --repo VaquitaApp/VaquitaApp
```

> La trust policy está acotada a `refs/heads/develop`, así que un push (o disparo
> manual) en cualquier otra rama no puede asumir el rol. La misma policy cubre el
> trigger `workflow_dispatch` sobre `develop` (mismo claim `sub`).

### 2.2 El servicio ECS no se queda sin env vars

`update-express-gateway-service --primary-container` **reemplaza el contenedor completo**.
Si se pasara solo `{image, containerPort}` se borrarían MONGO_URI, JWT_SECRET y SMTP_*. Por
eso el job hace `describe` → cambia solo `.image` → devuelve el `primaryContainer` íntegro.
Resultado: los secretos siguen viviendo en el servicio ECS y nunca aparecen en GitHub.

### 2.3 Cómo probarlo

- **Disparo real:** un push/merge a `develop` ejecuta `test → e2e → deploy-staging`.
- **`workflow_dispatch`:** el botón "Run workflow" en la UI de Actions solo aparece cuando
  el workflow está en la **rama por defecto (`main`)**. Mientras el job viva solo en
  `develop`, la primera prueba real es el propio push a `develop`.

### 2.4 Definition of Done

- [ ] Un push a `develop` corre `build-and-test → e2e → deploy-staging` en orden; el deploy
      solo si los anteriores pasan.
- [ ] La imagen en ECR queda etiquetada con el SHA del commit y el servicio corre esa imagen.
- [ ] `/api/health` responde `{"ok":true}` tras el deploy automático.
- [ ] Sin Access Key de larga vida en GitHub (solo el ARN del rol como variable + OIDC).
- [ ] Slack notifica el resultado.

---

## Notas

- **Promoción a producción** (segundo servicio ECS desde `main`, BD `vaquitaapp`, `main`
  en Amplify) está fuera de alcance hoy. Detalle en `Proyecto/aws-deploy-automatico-y-produccion.md`.
- **Deuda de endurecimiento prod-ready:** CORS abierto (`cors()`), Atlas Network Access en
  `0.0.0.0/0`, secretos en texto plano en la config del servicio (idealmente Secrets Manager/SSM).
</content>
</invoke>
