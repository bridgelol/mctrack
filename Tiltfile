# -*- mode: Python -*-

# MCTrack Tiltfile for local Kubernetes development (Rancher Desktop / RKE Desktop)

# Prune old images periodically to prevent storage from filling up
# Runs every 10 minutes using serve_cmd with a loop
local_resource(
    'image-prune',
    serve_cmd='while true; do echo "Pruning old images..."; nerdctl --namespace k8s.io image prune -f --filter "until=30m" 2>/dev/null || true; echo "Next prune in 10 minutes"; sleep 600; done',
    labels=['setup'],
)

# Deploy Kubernetes manifests
k8s_yaml([
    'k8s/dev/namespace.yaml',
    'k8s/dev/databases.yaml',
    'k8s/dev/configmap.yaml',
    'k8s/dev/apps.yaml',
    'k8s/dev/minecraft.yaml',
])

# Build images using nerdctl (for Rancher Desktop with containerd)
# Note: live_update disabled as it requires Docker. Changes trigger full rebuild.
custom_build(
    'mctrack/api',
    'nerdctl build -t $EXPECTED_REF -f docker/api.dev.Dockerfile --namespace k8s.io .',
    deps=['apps/api/src', 'packages/shared/src', 'packages/db/src'],
    skips_local_docker=True,
)

custom_build(
    'mctrack/ingestion',
    'nerdctl build -t $EXPECTED_REF -f docker/ingestion.dev.Dockerfile --namespace k8s.io .',
    deps=['apps/ingestion/src', 'packages/shared/src', 'packages/db/src'],
    skips_local_docker=True,
)

custom_build(
    'mctrack/web',
    'nerdctl build -t $EXPECTED_REF -f docker/web.dev.Dockerfile --namespace k8s.io .',
    deps=['apps/web/src', 'packages/shared/src'],
    skips_local_docker=True,
)

# Build Minecraft plugins
local_resource(
    'build-plugins',
    cmd='cd plugins && ./gradlew shadowJar --no-daemon',
    deps=[
        'plugins/common/src',
        'plugins/spigot/src',
        'plugins/velocity/src',
        'plugins/bungeecord/src',
        'plugins/common/build.gradle.kts',
        'plugins/spigot/build.gradle.kts',
        'plugins/velocity/build.gradle.kts',
        'plugins/bungeecord/build.gradle.kts',
    ],
    labels=['minecraft'],
)

# Build Velocity image with MCTrack plugin
custom_build(
    'mctrack/velocity',
    'nerdctl build -t $EXPECTED_REF -f plugins/docker/Dockerfile.velocity --namespace k8s.io plugins',
    deps=[
        'plugins/velocity/build/libs',
        'plugins/docker/Dockerfile.velocity',
        'plugins/docker/velocity',
    ],
    skips_local_docker=True,
)

# Build PaperMC image with MCTrack plugin
custom_build(
    'mctrack/paper',
    'nerdctl build -t $EXPECTED_REF -f plugins/docker/Dockerfile.paper --namespace k8s.io plugins',
    deps=[
        'plugins/spigot/build/libs',
        'plugins/docker/Dockerfile.paper',
        'plugins/docker/paper',
    ],
    skips_local_docker=True,
)

# Configure Kubernetes resources
k8s_resource(
    'postgres',
    labels=['databases'],
    port_forwards=['5432:5432'],
)

k8s_resource(
    'clickhouse',
    labels=['databases'],
    port_forwards=['8123:8123', '9000:9000'],
)

k8s_resource(
    'redis',
    labels=['databases'],
    port_forwards=['6379:6379'],
)

k8s_resource(
    'api',
    labels=['apps'],
    port_forwards=['4000:4000'],
    resource_deps=['postgres', 'clickhouse', 'redis'],
    links=['http://localhost:4000/docs'],
)

k8s_resource(
    'ingestion',
    labels=['apps'],
    port_forwards=['4001:4001'],
    resource_deps=['postgres', 'clickhouse', 'redis'],
    links=['http://localhost:4001/health'],
)

k8s_resource(
    'web',
    labels=['apps'],
    port_forwards=['3000:3000'],
    resource_deps=['api'],
    links=['http://localhost:3000'],
)

# Minecraft servers
k8s_resource(
    'velocity',
    labels=['minecraft'],
    port_forwards=['25565:25577'],
    resource_deps=['build-plugins', 'ingestion'],
    links=['minecraft://localhost:25565'],
)

k8s_resource(
    'paper',
    labels=['minecraft'],
    port_forwards=['25566:25565'],
    resource_deps=['build-plugins', 'velocity'],
)

# Database migration and setup resources
# These run locally but connect to the k8s-forwarded ports
local_resource(
    'db-migrate',
    cmd='DATABASE_URL="postgresql://mctrack:mctrack@localhost:5432/mctrack" pnpm run db:migrate',
    labels=['setup'],
    resource_deps=['postgres'],
    trigger_mode=TRIGGER_MODE_MANUAL,
)

local_resource(
    'db-migrate-ch',
    cmd='CLICKHOUSE_URL="http://localhost:8123" CLICKHOUSE_DATABASE="mctrack" pnpm run db:migrate:ch',
    labels=['setup'],
    resource_deps=['clickhouse'],
    trigger_mode=TRIGGER_MODE_MANUAL,
)

local_resource(
    'db-seed',
    cmd='DATABASE_URL="postgresql://mctrack:mctrack@localhost:5432/mctrack" pnpm run db:seed',
    labels=['setup'],
    resource_deps=['postgres', 'db-migrate'],
    trigger_mode=TRIGGER_MODE_MANUAL,
)

local_resource(
    'db-setup',
    cmd='''
        DATABASE_URL="postgresql://mctrack:mctrack@localhost:5432/mctrack" \
        CLICKHOUSE_URL="http://localhost:8123" \
        CLICKHOUSE_DATABASE="mctrack" \
        pnpm run db:setup
    ''',
    labels=['setup'],
    resource_deps=['postgres', 'clickhouse'],
    trigger_mode=TRIGGER_MODE_MANUAL,
)

# Resource grouping
config.define_string_list("to-run", args=True)
cfg = config.parse()
groups = {
    'databases': ['postgres', 'clickhouse', 'redis'],
    'apps': ['api', 'ingestion', 'web'],
    'minecraft': ['build-plugins', 'velocity', 'paper'],
    'setup': ['image-prune', 'db-migrate', 'db-migrate-ch', 'db-seed', 'db-setup'],
}

resources = []
for arg in cfg.get('to-run', []):
    if arg in groups:
        resources += groups[arg]
    else:
        resources.append(arg)

if resources:
    config.set_enabled_resources(resources)
