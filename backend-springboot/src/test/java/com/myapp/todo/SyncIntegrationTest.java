package com.myapp.todo;

import static org.assertj.core.api.Assertions.assertThat;

import com.myapp.todo.dto.SyncPushRequest;
import com.myapp.todo.dto.SyncResponse;
import com.myapp.todo.dto.TodoOperationResult;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.util.UriComponentsBuilder;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class SyncIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private TodoItemRepository repository;

    private String baseUrl;

    @BeforeEach
    void setUp() {
        baseUrl = "http://127.0.0.1:" + port + "/todo";
        repository.deleteAll();
    }

    private TodoItem snapshot(String uuid, String name, long updatedAt) {
        TodoItem item = new TodoItem(LocalDate.of(2026, 10, 1), null, "Home", name);
        item.setUuid(uuid);
        item.setUpdatedAt(updatedAt);
        return item;
    }

    private SyncResponse push(TodoItem... items) {
        SyncPushRequest req = new SyncPushRequest();
        req.setItems(List.of(items));
        return restTemplate.postForObject(baseUrl + "/sync/push", req, SyncResponse.class);
    }

    private SyncResponse changes(long since) {
        return restTemplate.getForObject(baseUrl + "/sync/changes?since=" + since, SyncResponse.class);
    }

    @Test
    void pushInsertsAndPullReturnsChanges() {
        String uuid = UUID.randomUUID().toString();
        SyncResponse pushed = push(snapshot(uuid, "Offline task", 1000));

        assertThat(pushed.getItems()).hasSize(1);
        assertThat(pushed.getItems().get(0).getId()).isNotNull();
        assertThat(pushed.getItems().get(0).getDayOrder()).isEqualTo(1);

        SyncResponse pulled = changes(0);
        assertThat(pulled.getItems()).extracting(TodoItem::getUuid).contains(uuid);
        assertThat(changes(pulled.getServerTime()).getItems()).isEmpty();
    }

    @Test
    void lastWriteWins() {
        String uuid = UUID.randomUUID().toString();
        push(snapshot(uuid, "v2", 2000));
        push(snapshot(uuid, "stale v1", 1000));
        assertThat(repository.findByUuid(uuid).get().getName()).isEqualTo("v2");

        push(snapshot(uuid, "v3", 3000));
        assertThat(repository.findByUuid(uuid).get().getName()).isEqualTo("v3");
    }

    @Test
    void webEditsAndDeletesReachSyncClients() {
        TodoOperationResult added = restTemplate.postForObject(
                UriComponentsBuilder.fromUriString(baseUrl + "/add")
                        .queryParam("name", "From web").queryParam("category", "Work")
                        .queryParam("taskDate", "2026-10-01").queryParam("assignedTime", "09:00:00")
                        .queryParam("reminderMinutesBefore", 10).build().toUri(),
                null, TodoOperationResult.class);
        TodoItem item = added.getItem();
        assertThat(item.getUuid()).isNotBlank();
        assertThat(item.getReminderMinutesBefore()).isEqualTo(10);
        assertThat(item.getAssignedTime()).hasToString("09:00");

        long cursor = changes(0).getServerTime();
        restTemplate.delete(baseUrl + "/delete/" + item.getId());

        List<TodoItem> tombstones = changes(cursor).getItems();
        assertThat(tombstones).hasSize(1);
        assertThat(tombstones.get(0).isDeleted()).isTrue();
        // Deleted tasks disappear from the web views
        TodoItem[] all = restTemplate.getForObject(baseUrl + "/all", TodoItem[].class);
        assertThat(all).isEmpty();
    }

    @Test
    void completingRecurringTaskViaPushCreatesNextOccurrence() {
        String uuid = UUID.randomUUID().toString();
        TodoItem task = snapshot(uuid, "Gym", 1000);
        task.setRepeatType(TodoItem.RepeatPattern.EVERY_X_DAYS);
        task.setRepeatDuration(2);
        push(task);

        task.setComplete(true);
        task.setUpdatedAt(2000L);
        SyncResponse result = push(task);

        assertThat(result.getItems()).hasSize(2);
        TodoItem next = result.getItems().get(1);
        assertThat(next.getTaskDate()).isEqualTo(LocalDate.of(2026, 10, 3));
        assertThat(next.isComplete()).isFalse();
    }

    @Test
    void completingRecurringTaskViaUpdateReturnsNextItem() {
        TodoOperationResult added = restTemplate.postForObject(
                UriComponentsBuilder.fromUriString(baseUrl + "/add")
                        .queryParam("name", "Weekly review").queryParam("category", "Work")
                        .queryParam("taskDate", "2026-10-01").queryParam("repeatType", "EVERY_X_WEEKS")
                        .queryParam("repeatDuration", 1).build().toUri(),
                null, TodoOperationResult.class);

        TodoOperationResult done = restTemplate.postForObject(
                UriComponentsBuilder.fromUriString(baseUrl + "/update")
                        .queryParam("id", added.getItem().getId()).queryParam("field", "complete")
                        .queryParam("value", "true").build().toUri(),
                null, TodoOperationResult.class);

        assertThat(done.getNextItem()).isNotNull();
        assertThat(done.getNextItem().getTaskDate()).isEqualTo(LocalDate.of(2026, 10, 8));
    }

    @Test
    void webEditKeepsIdentityAndReachesSyncClients() {
        TodoOperationResult added = restTemplate.postForObject(
                UriComponentsBuilder.fromUriString(baseUrl + "/add")
                        .queryParam("name", "Draft").queryParam("category", "Work")
                        .queryParam("taskDate", "2026-10-01").build().toUri(),
                null, TodoOperationResult.class);
        TodoItem original = added.getItem();
        long cursor = changes(0).getServerTime();

        TodoOperationResult edited = restTemplate.postForObject(
                UriComponentsBuilder.fromUriString(baseUrl + "/edit")
                        .queryParam("id", original.getId()).queryParam("name", "Final")
                        .queryParam("category", "Home").queryParam("taskDate", "2026-10-02")
                        .queryParam("priority", 2).queryParam("assignedTime", "18:30:00")
                        .queryParam("reminderMinutesBefore", 15).build().toUri(),
                null, TodoOperationResult.class);

        assertThat(edited.getItem().getId()).isEqualTo(original.getId());
        assertThat(edited.getItem().getUuid()).isEqualTo(original.getUuid());

        // Sync clients see one updated row, not a tombstone plus a new task
        List<TodoItem> delta = changes(cursor).getItems();
        assertThat(delta).hasSize(1);
        TodoItem synced = delta.get(0);
        assertThat(synced.getUuid()).isEqualTo(original.getUuid());
        assertThat(synced.isDeleted()).isFalse();
        assertThat(synced.getName()).isEqualTo("Final");
        assertThat(synced.getTaskDate()).isEqualTo(LocalDate.of(2026, 10, 2));
        assertThat(synced.getReminderMinutesBefore()).isEqualTo(15);
    }

    @Test
    void repositoriesAreNotExposedOverRest() {
        // Spring Data REST would bypass soft delete and sync stamps
        assertThat(restTemplate.getForEntity("http://127.0.0.1:" + port + "/api/todoItems", String.class)
                .getStatusCode().is4xxClientError()).isTrue();
    }
}
