package com.myapp.todo;

import com.myapp.todo.dto.ProjectCount;
import com.myapp.todo.dto.TaskCounts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class TodoQueryIntegrationTest {

    private static final ParameterizedTypeReference<List<TodoItem>> TODO_ITEM_LIST_TYPE = new ParameterizedTypeReference<List<TodoItem>>() {
    };

    private static final ParameterizedTypeReference<List<ProjectCount>> PROJECT_COUNT_LIST_TYPE = new ParameterizedTypeReference<List<ProjectCount>>() {
    };

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

    private TodoItem saveTask(String name, String category, LocalDate date,
                              boolean complete, TodoItem.RepeatPattern repeat, int duration) {
        TodoItem item = new TodoItem(date, 1, category, name);
        item.setComplete(complete);
        item.setRepeatType(repeat);
        item.setRepeatDuration(duration);
        item.setPriority(0);
        item.setLongTerm(false);
        return repository.save(item);
    }

    private ResponseEntity<List<TodoItem>> query(String queryParams) {
        return restTemplate.exchange(
                baseUrl + "/query" + (queryParams.isEmpty() ? "" : "?" + queryParams),
                HttpMethod.GET,
                null,
                TODO_ITEM_LIST_TYPE);
    }

    @Test
    @DisplayName("querySubstringCaseInsensitive")
    void querySubstringCaseInsensitive() {
        saveTask("Take daily photo", "Personal", LocalDate.of(2026, 10, 28), false, null, 0);
        saveTask("Buy milk", "None", LocalDate.of(2026, 10, 28), false, null, 0);

        ResponseEntity<List<TodoItem>> response = query("q=PHOTO");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).getName()).isEqualTo("Take daily photo");
    }

    @Test
    @DisplayName("queryExactName")
    void queryExactName() {
        saveTask("Take daily photo", "Personal", LocalDate.of(2026, 10, 28), false, null, 0);
        saveTask("Take daily photo 2", "Personal", LocalDate.of(2026, 10, 28), false, null, 0);

        ResponseEntity<List<TodoItem>> response = query("exactName=Take daily photo");

        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).getName()).isEqualTo("Take daily photo");
    }

    @Test
    @DisplayName("queryProjectExactCaseInsensitive")
    void queryProjectExactCaseInsensitive() {
        saveTask("A", "Personal", LocalDate.of(2026, 10, 28), false, null, 0);
        saveTask("B", "Office", LocalDate.of(2026, 10, 28), false, null, 0);

        ResponseEntity<List<TodoItem>> personal = query("project=personal");
        assertThat(personal.getBody()).hasSize(1);
        assertThat(personal.getBody().get(0).getCategory()).isEqualTo("Personal");

        ResponseEntity<List<TodoItem>> pers = query("project=Pers");
        assertThat(pers.getBody()).isEmpty();
    }

    @Test
    @DisplayName("queryDateRangeInclusive")
    void queryDateRangeInclusive() {
        saveTask("A", "None", LocalDate.of(2026, 10, 25), false, null, 0);
        saveTask("B", "None", LocalDate.of(2026, 10, 26), false, null, 0);
        saveTask("C", "None", LocalDate.of(2026, 10, 27), false, null, 0);

        ResponseEntity<List<TodoItem>> response = query("start=2026-10-26&end=2026-10-27");

        assertThat(response.getBody()).hasSize(2);
    }

    @Test
    @DisplayName("queryStatusOpen")
    void queryStatusOpen() {
        saveTask("A", "None", LocalDate.of(2026, 10, 28), false, null, 0);
        saveTask("B", "None", LocalDate.of(2026, 10, 28), false, null, 0);
        saveTask("C", "None", LocalDate.of(2026, 10, 28), true, null, 0);

        ResponseEntity<List<TodoItem>> response = query("status=open");

        assertThat(response.getBody()).hasSize(2);
    }

    @Test
    @DisplayName("queryStatusCompleted")
    void queryStatusCompleted() {
        saveTask("A", "None", LocalDate.of(2026, 10, 28), false, null, 0);
        saveTask("B", "None", LocalDate.of(2026, 10, 28), false, null, 0);
        saveTask("C", "None", LocalDate.of(2026, 10, 28), true, null, 0);

        ResponseEntity<List<TodoItem>> response = query("status=completed");

        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).isComplete()).isTrue();
    }

    @Test
    @DisplayName("queryStatusAll")
    void queryStatusAll() {
        saveTask("A", "None", LocalDate.of(2026, 10, 28), false, null, 0);
        saveTask("B", "None", LocalDate.of(2026, 10, 28), false, null, 0);
        saveTask("C", "None", LocalDate.of(2026, 10, 28), true, null, 0);

        ResponseEntity<List<TodoItem>> response = query("status=all");

        assertThat(response.getBody()).hasSize(3);
    }

    @Test
    @DisplayName("queryRecurringTrue")
    void queryRecurringTrue() {
        saveTask("A", "None", LocalDate.of(2026, 10, 28), false, TodoItem.RepeatPattern.NONE, 0);
        saveTask("B", "None", LocalDate.of(2026, 10, 28), false, TodoItem.RepeatPattern.EVERY_X_DAYS, 1);

        ResponseEntity<List<TodoItem>> response = query("recurring=true");

        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).getName()).isEqualTo("B");
    }

    @Test
    @DisplayName("queryRecurringFalse")
    void queryRecurringFalse() {
        saveTask("A", "None", LocalDate.of(2026, 10, 28), false, TodoItem.RepeatPattern.NONE, 0);
        saveTask("B", "None", LocalDate.of(2026, 10, 28), false, TodoItem.RepeatPattern.NONE, 0);
        saveTask("C", "None", LocalDate.of(2026, 10, 28), false, TodoItem.RepeatPattern.EVERY_X_DAYS, 1);

        ResponseEntity<List<TodoItem>> response = query("recurring=false");

        assertThat(response.getBody()).hasSize(2);
    }

    @Test
    @DisplayName("queryOrderDescLimit")
    void queryOrderDescLimit() {
        saveTask("A", "None", LocalDate.of(2026, 10, 26), false, null, 0);
        saveTask("B", "None", LocalDate.of(2026, 10, 27), false, null, 0);
        saveTask("C", "None", LocalDate.of(2026, 10, 28), false, null, 0);

        ResponseEntity<List<TodoItem>> response = query("order=desc&limit=1");

        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).getTaskDate()).isEqualTo(LocalDate.of(2026, 10, 28));
    }

    @Test
    @DisplayName("queryOrderAscLimit")
    void queryOrderAscLimit() {
        saveTask("A", "None", LocalDate.of(2026, 10, 26), false, null, 0);
        saveTask("B", "None", LocalDate.of(2026, 10, 27), false, null, 0);
        saveTask("C", "None", LocalDate.of(2026, 10, 28), false, null, 0);

        ResponseEntity<List<TodoItem>> response = query("order=asc&limit=1");

        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).getTaskDate()).isEqualTo(LocalDate.of(2026, 10, 26));
    }

    @Test
    @DisplayName("queryTieBreakIdDesc")
    void queryTieBreakIdDesc() {
        TodoItem first = saveTask("A", "None", LocalDate.of(2026, 10, 28), false, null, 0);
        TodoItem second = saveTask("B", "None", LocalDate.of(2026, 10, 28), false, null, 0);

        ResponseEntity<List<TodoItem>> response = query("order=desc&limit=1");

        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).getId()).isEqualTo(second.getId());
        assertThat(second.getId()).isNotEqualTo(first.getId());
    }

    @Test
    @DisplayName("queryEmptyResult")
    void queryEmptyResult() {
        saveTask("A", "None", LocalDate.of(2026, 10, 28), false, null, 0);

        ResponseEntity<List<TodoItem>> response = query("q=zzzz");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEmpty();
    }

    @Test
    @DisplayName("queryInvalidStatus")
    void queryInvalidStatus() {
        ResponseEntity<String> response = restTemplate.getForEntity(
                baseUrl + "/query?status=bogus", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("queryStartAfterEnd")
    void queryStartAfterEnd() {
        ResponseEntity<String> response = restTemplate.getForEntity(
                baseUrl + "/query?start=2026-10-29&end=2026-10-28", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("countReturnsBreakdown")
    void countReturnsBreakdown() {
        saveTask("A", "None", LocalDate.of(2026, 10, 28), false, null, 0);
        saveTask("B", "None", LocalDate.of(2026, 10, 28), false, null, 0);
        saveTask("C", "None", LocalDate.of(2026, 10, 28), true, null, 0);

        ResponseEntity<TaskCounts> response = restTemplate.getForEntity(
                baseUrl + "/count", TaskCounts.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        TaskCounts counts = Objects.requireNonNull(response.getBody());
        assertThat(counts.getCount()).isEqualTo(3);
        assertThat(counts.getOpen()).isEqualTo(2);
        assertThat(counts.getCompleted()).isEqualTo(1);
    }

    @Test
    @DisplayName("countAppliesFilters")
    void countAppliesFilters() {
        saveTask("A", "Personal", LocalDate.of(2026, 10, 28), false, null, 0);
        saveTask("B", "Personal", LocalDate.of(2026, 10, 28), false, null, 0);
        saveTask("C", "Office", LocalDate.of(2026, 10, 28), false, null, 0);

        ResponseEntity<TaskCounts> response = restTemplate.getForEntity(
                baseUrl + "/count?project=Personal", TaskCounts.class);

        assertThat(Objects.requireNonNull(response.getBody()).getCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("itemByIdReturnsTask")
    void itemByIdReturnsTask() {
        TodoItem saved = saveTask("Find me", "Personal", LocalDate.of(2026, 10, 28), false, null, 0);

        ResponseEntity<TodoItem> response = restTemplate.getForEntity(
                baseUrl + "/item/" + saved.getId(), TodoItem.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(Objects.requireNonNull(response.getBody()).getId()).isEqualTo(saved.getId());
        assertThat(response.getBody().getName()).isEqualTo("Find me");
    }

    @Test
    @DisplayName("itemByIdMissingReturns404")
    void itemByIdMissingReturns404() {
        ResponseEntity<TodoItem> response = restTemplate.getForEntity(
                baseUrl + "/item/99999", TodoItem.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("projectsDistinctCounts")
    void projectsDistinctCounts() {
        saveTask("A", "Personal", LocalDate.of(2026, 10, 28), false, null, 0);
        saveTask("B", "Personal", LocalDate.of(2026, 10, 28), false, null, 0);
        saveTask("C", "Office", LocalDate.of(2026, 10, 28), false, null, 0);
        saveTask("D", null, LocalDate.of(2026, 10, 28), false, null, 0);

        ResponseEntity<List<ProjectCount>> response = restTemplate.exchange(
                baseUrl + "/projects",
                HttpMethod.GET,
                null,
                PROJECT_COUNT_LIST_TYPE);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<ProjectCount> projects = Objects.requireNonNull(response.getBody());
        assertThat(projects).hasSize(3);
        assertThat(projects.get(0).getName()).isEqualTo("Personal");
        assertThat(projects.get(0).getCount()).isEqualTo(2);
        assertThat(projects.get(1).getName()).isEqualTo("None");
        assertThat(projects.get(1).getCount()).isEqualTo(1);
        assertThat(projects.get(2).getName()).isEqualTo("Office");
        assertThat(projects.get(2).getCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("limitClampsLow")
    void limitClampsLow() {
        saveTask("A", "None", LocalDate.of(2026, 10, 26), false, null, 0);
        saveTask("B", "None", LocalDate.of(2026, 10, 27), false, null, 0);
        saveTask("C", "None", LocalDate.of(2026, 10, 28), false, null, 0);

        ResponseEntity<List<TodoItem>> response = query("limit=0");

        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    @DisplayName("limitClampsHigh")
    void limitClampsHigh() {
        saveTask("A", "None", LocalDate.of(2026, 10, 26), false, null, 0);
        saveTask("B", "None", LocalDate.of(2026, 10, 27), false, null, 0);
        saveTask("C", "None", LocalDate.of(2026, 10, 28), false, null, 0);

        ResponseEntity<List<TodoItem>> response = query("limit=9999");

        assertThat(response.getBody()).hasSize(3);
    }
}
