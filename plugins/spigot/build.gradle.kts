plugins {
    java
    id("com.github.johnrengelman.shadow")
}

repositories {
    maven("https://hub.spigotmc.org/nexus/content/repositories/snapshots/")
}

dependencies {
    implementation(project(":common"))

    // Spigot API
    compileOnly("org.spigotmc:spigot-api:1.20.4-R0.1-SNAPSHOT")
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
        filesMatching("plugin.yml") {
            expand("version" to project.version)
        }
    }
}
