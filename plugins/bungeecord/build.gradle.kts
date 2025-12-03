plugins {
    java
    id("com.github.johnrengelman.shadow")
}

configurations.all {
    resolutionStrategy {
        // Exclude problematic brigadier dependency from BungeeCord
        exclude(group = "net.md-5", module = "brigadier")
    }
}

dependencies {
    implementation(project(":common"))

    // BungeeCord API
    compileOnly("net.md-5:bungeecord-api:1.16-R0.3")
}

tasks {
    shadowJar {
        archiveClassifier.set("")
        relocate("okhttp3", "com.mctrack.libs.okhttp3")
        relocate("okio", "com.mctrack.libs.okio")
        relocate("com.google.gson", "com.mctrack.libs.gson")
        relocate("org.yaml.snakeyaml", "com.mctrack.libs.snakeyaml")
    }

    build {
        dependsOn(shadowJar)
    }

    processResources {
        filesMatching("bungee.yml") {
            expand("version" to project.version)
        }
    }
}
