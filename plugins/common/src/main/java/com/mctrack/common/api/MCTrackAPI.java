package com.mctrack.common.api;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.mctrack.common.config.MCTrackConfig;
import com.mctrack.common.model.*;
import okhttp3.*;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.*;
import java.util.function.Consumer;

public class MCTrackAPI {
    private final MCTrackConfig config;
    private final Consumer<String> logger;
    private final OkHttpClient client;
    private final Gson gson;
    private final MediaType JSON_MEDIA_TYPE = MediaType.parse("application/json; charset=utf-8");
    private final ConcurrentLinkedQueue<Object> eventQueue = new ConcurrentLinkedQueue<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private ScheduledFuture<?> batchJob;

    public MCTrackAPI(MCTrackConfig config, Consumer<String> logger) {
        this.config = config;
        this.logger = logger;
        this.client = new OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build();
        this.gson = new GsonBuilder().create();
    }

    public void start() {
        if (!config.isConfigured()) {
            logger.accept("[MCTrack] Plugin not configured! Please edit config.yml");
            return;
        }

        // Fetch API key info (including gamemodeId) on startup
        fetchApiKeyInfo();

        batchJob = scheduler.scheduleAtFixedRate(
            this::flushEvents,
            config.getBatchInterval(),
            config.getBatchInterval(),
            TimeUnit.SECONDS
        );

        logger.accept("[MCTrack] API client started");
    }

    /**
     * Fetches API key information from the server, including the associated gamemodeId.
     */
    private void fetchApiKeyInfo() {
        Request request = new Request.Builder()
            .url(config.getApiUrl() + "/session/auth")
            .header("X-API-Key", config.getApiKey())
            .get()
            .build();

        try (Response response = client.newCall(request).execute()) {
            if (response.isSuccessful() && response.body() != null) {
                String body = response.body().string();
                ApiKeyInfoResponse info = gson.fromJson(body, ApiKeyInfoResponse.class);
                if (info != null && info.gamemodeId != null) {
                    config.setGamemodeId(info.gamemodeId);
                    logger.accept("[MCTrack] API key is scoped to gamemode: " + info.gamemodeName);
                } else {
                    logger.accept("[MCTrack] API key is network-wide (no gamemode)");
                }
            } else {
                logger.accept("[MCTrack] Failed to fetch API key info: " + response.code());
            }
        } catch (Exception e) {
            logger.accept("[MCTrack] Failed to fetch API key info: " + e.getMessage());
        }
    }

    private static class ApiKeyInfoResponse {
        String gamemodeId;
        String gamemodeName;
        String networkId;
    }

    public void stop() {
        flushEvents();
        if (batchJob != null) {
            batchJob.cancel(false);
        }
        scheduler.shutdown();
        client.dispatcher().executorService().shutdown();
        logger.accept("[MCTrack] API client stopped");
    }

    public void trackSessionStart(SessionStartEvent event) {
        queueEvent(event);
        if (config.isDebug()) {
            logger.accept("[MCTrack] Queued session start for " + event.getPlayerName());
        }
    }

    public void trackSessionEnd(SessionEndEvent event) {
        queueEvent(event);
        if (config.isDebug()) {
            logger.accept("[MCTrack] Queued session end for " + event.getPlayerUuid());
        }
    }

    public void trackHeartbeat(SessionHeartbeatEvent event) {
        queueEvent(event);
        if (config.isDebug()) {
            logger.accept("[MCTrack] Queued heartbeat for " + event.getPlayerUuid());
        }
    }

    public void trackServerSwitch(ServerSwitchEvent event) {
        queueEvent(event);
        if (config.isDebug()) {
            logger.accept("[MCTrack] Queued server switch for " + event.getPlayerUuid());
        }
    }

    public void trackGamemodeChange(GamemodeChangeEvent event) {
        queueEvent(event);
        if (config.isDebug()) {
            logger.accept("[MCTrack] Queued gamemode change for " + event.getPlayerUuid());
        }
    }

    public void trackPayment(PaymentEvent event) {
        queueEvent(event);
        if (config.isDebug()) {
            logger.accept("[MCTrack] Queued payment for " + event.getPlayerName());
        }
    }

    public void trackGamemodeSessionStart(GamemodeSessionStartEvent event) {
        queueEvent(event);
        if (config.isDebug()) {
            logger.accept("[MCTrack] Queued gamemode session start for " + event.getPlayerName());
        }
    }

    public void trackGamemodeSessionEnd(GamemodeSessionEndEvent event) {
        queueEvent(event);
        if (config.isDebug()) {
            logger.accept("[MCTrack] Queued gamemode session end for " + event.getPlayerUuid());
        }
    }

    private void queueEvent(Object event) {
        eventQueue.add(event);
        if (eventQueue.size() >= config.getBatchSize()) {
            scheduler.execute(this::flushEvents);
        }
    }

    private synchronized void flushEvents() {
        if (eventQueue.isEmpty()) return;

        List<Object> events = new ArrayList<>();
        while (events.size() < config.getBatchSize()) {
            Object event = eventQueue.poll();
            if (event == null) break;
            events.add(event);
        }

        if (events.isEmpty()) return;

        BatchPayload payload = new BatchPayload(
            config.getNetworkId(),
            config.getServerName(),
            filterByType(events, SessionStartEvent.class),
            filterByType(events, SessionEndEvent.class),
            filterByType(events, SessionHeartbeatEvent.class),
            filterByType(events, ServerSwitchEvent.class),
            filterByType(events, GamemodeChangeEvent.class),
            filterByType(events, PaymentEvent.class),
            filterByType(events, GamemodeSessionStartEvent.class),
            filterByType(events, GamemodeSessionEndEvent.class)
        );

        try {
            sendBatch(payload);
            if (config.isDebug()) {
                logger.accept("[MCTrack] Sent batch of " + events.size() + " events");
            }
        } catch (Exception e) {
            // Re-queue events on failure
            eventQueue.addAll(events);
            logger.accept("[MCTrack] Failed to send events: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private <T> List<T> filterByType(List<Object> events, Class<T> type) {
        List<T> result = new ArrayList<>();
        for (Object event : events) {
            if (type.isInstance(event)) {
                result.add((T) event);
            }
        }
        return result;
    }

    private void sendBatch(BatchPayload payload) throws IOException {
        String json = gson.toJson(payload);
        RequestBody body = RequestBody.create(json, JSON_MEDIA_TYPE);

        Request request = new Request.Builder()
            .url(config.getApiUrl() + "/session/batch")
            .header("X-API-Key", config.getApiKey())
            .header("Content-Type", "application/json")
            .post(body)
            .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String responseBody = response.body() != null ? response.body().string() : "";
                throw new IOException("API error: " + response.code() + " - " + responseBody);
            }
        }
    }

    public boolean trackPaymentSync(PaymentEvent event) {
        BatchPayload payload = new BatchPayload(
            config.getNetworkId(),
            config.getServerName(),
            Collections.emptyList(),
            Collections.emptyList(),
            Collections.emptyList(),
            Collections.emptyList(),
            Collections.emptyList(),
            Collections.singletonList(event),
            Collections.emptyList(),
            Collections.emptyList()
        );

        String json = gson.toJson(payload);
        RequestBody body = RequestBody.create(json, JSON_MEDIA_TYPE);

        Request request = new Request.Builder()
            .url(config.getApiUrl() + "/session/batch")
            .header("X-API-Key", config.getApiKey())
            .header("Content-Type", "application/json")
            .post(body)
            .build();

        try (Response response = client.newCall(request).execute()) {
            return response.isSuccessful();
        } catch (Exception e) {
            logger.accept("[MCTrack] Failed to track payment: " + e.getMessage());
            return false;
        }
    }

    private static class BatchPayload {
        private final String networkId;
        private final String serverName;
        private final List<SessionStartEvent> sessionStarts;
        private final List<SessionEndEvent> sessionEnds;
        private final List<SessionHeartbeatEvent> heartbeats;
        private final List<ServerSwitchEvent> serverSwitches;
        private final List<GamemodeChangeEvent> gamemodeChanges;
        private final List<PaymentEvent> payments;
        private final List<GamemodeSessionStartEvent> gamemodeSessionStarts;
        private final List<GamemodeSessionEndEvent> gamemodeSessionEnds;

        public BatchPayload(String networkId, String serverName,
                           List<SessionStartEvent> sessionStarts,
                           List<SessionEndEvent> sessionEnds,
                           List<SessionHeartbeatEvent> heartbeats,
                           List<ServerSwitchEvent> serverSwitches,
                           List<GamemodeChangeEvent> gamemodeChanges,
                           List<PaymentEvent> payments,
                           List<GamemodeSessionStartEvent> gamemodeSessionStarts,
                           List<GamemodeSessionEndEvent> gamemodeSessionEnds) {
            this.networkId = networkId;
            this.serverName = serverName;
            this.sessionStarts = sessionStarts;
            this.sessionEnds = sessionEnds;
            this.heartbeats = heartbeats;
            this.serverSwitches = serverSwitches;
            this.gamemodeChanges = gamemodeChanges;
            this.payments = payments;
            this.gamemodeSessionStarts = gamemodeSessionStarts;
            this.gamemodeSessionEnds = gamemodeSessionEnds;
        }
    }
}
