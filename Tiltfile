# -*- mode: Python -*-

# MCTrack Tiltfile for local Kubernetes development (Rancher Desktop / RKE Desktop)

# Deploy Kubernetes manifests
k8s_yaml([
    'k8s/dev/namespace.yaml',
    'k8s/dev/databases.yaml',
    'k8s/dev/configmap.yaml',
    'k8s/dev/apps.yaml',
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

# Manual triggers for database setup
local_resource(
    'db-migrate',
    cmd='kubectl exec -n mctrack-dev deployment/postgres -- psql -U mctrack -d mctrack -c "SELECT 1"',
    labels=['setup'],
    resource_deps=['postgres'],
    trigger_mode=TRIGGER_MODE_MANUAL,
)

local_resource(
    'clickhouse-setup',
    cmd='kubectl exec -n mctrack-dev deployment/clickhouse -- clickhouse-client --query "CREATE DATABASE IF NOT EXISTS mctrack"',
    labels=['setup'],
    resource_deps=['clickhouse'],
    trigger_mode=TRIGGER_MODE_MANUAL,
)

# Resource grouping
config.define_string_list("to-run", args=True)
cfg = config.parse()
groups = {
    'databases': ['postgres', 'clickhouse', 'redis'],
    'apps': ['api', 'ingestion', 'web'],
    'setup': ['db-migrate', 'clickhouse-setup'],
}

resources = []
for arg in cfg.get('to-run', []):
    if arg in groups:
        resources += groups[arg]
    else:
        resources.append(arg)

if resources:
    config.set_enabled_resources(resources)
