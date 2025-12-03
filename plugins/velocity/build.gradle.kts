plugins {
    java
    id("com.github.johnrengelman.shadow")
}

repositories {
    maven("https://repo.papermc.io/repository/maven-public/")
}

dependencies {
    implementation(project(":common"))

    // Velocity API
    compileOnly("com.velocitypowered:velocity-api:3.3.0-SNAPSHOT")
    annotationProcessor("com.velocitypowered:velocity-api:3.3.0-SNAPSHOT")
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
}
