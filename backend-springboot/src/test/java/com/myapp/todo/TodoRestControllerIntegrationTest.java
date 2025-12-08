package com.myapp.todo;

import com.myapp.todo.dto.TodoOperationResult;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for TodoRestController.
 * Tests the full HTTP request/response cycle with an embedded H2 database.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class TodoRestControllerIntegrationTest {

        /**
         * Static ParameterizedTypeReference for List<TodoItem> to avoid anonymous inner
         * classes
         */
        private static final ParameterizedTypeReference<List<TodoItem>> TODO_ITEM_LIST_TYPE = new ParameterizedTypeReference<List<TodoItem>>() {
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
                baseUrl = "http://localhost:" + port + "/todo";
                repository.deleteAll();
        }

        @Test
        @Order(1)
        @DisplayName("POST /todo/add - should create a new task")
        void testAddTask() {
                // Arrange
                String taskName = "Test Task";
                String category = "Work";
                LocalDate taskDate = LocalDate.now();

                java.net.URI url = UriComponentsBuilder.fromUriString(baseUrl + "/add")
                                .queryParam("name", taskName)
                                .queryParam("category", category)
                                .queryParam("taskDate", taskDate.toString())
                                .queryParam("priority", 1)
                                .build()
                                .toUri();

                // Act
                ResponseEntity<TodoOperationResult> response = restTemplate.postForEntity(
                                url, null, TodoOperationResult.class);

                // Assert
                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
                assertThat(response.getBody()).isNotNull();
                assertThat(response.getBody().getItem()).isNotNull();
                assertThat(response.getBody().getItem().getName()).isEqualTo(taskName);
                assertThat(response.getBody().getItem().getCategory()).isEqualTo(category);
                assertThat(response.getBody().getItem().getId()).isNotNull();
        }

        @Test
        @Order(2)
        @DisplayName("GET /todo/all - should return all tasks")
        void testGetAllTasks() {
                // Arrange - Create test tasks
                createTask("Task 1", "Category1");
                createTask("Task 2", "Category2");

                // Act
                ResponseEntity<List<TodoItem>> response = restTemplate.exchange(
                                baseUrl + "/all",
                                HttpMethod.GET,
                                null,
                                TODO_ITEM_LIST_TYPE);

                // Assert
                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
                assertThat(response.getBody()).isNotNull();
                assertThat(response.getBody()).hasSize(2);
        }

        @Test
        @Order(3)
        @DisplayName("POST /todo/update - should update task field")
        void testUpdateTask() {
                // Arrange - Create a task first
                TodoItem createdTask = createTask("Original Name", "Work");
                Long taskId = createdTask.getId();

                java.net.URI updateUrl = UriComponentsBuilder.fromUriString(baseUrl + "/update")
                                .queryParam("id", taskId)
                                .queryParam("field", "taskName")
                                .queryParam("value", "Updated Name")
                                .build()
                                .toUri();

                // Act
                ResponseEntity<TodoOperationResult> response = restTemplate.postForEntity(
                                updateUrl, null, TodoOperationResult.class);

                // Assert
                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
                assertThat(response.getBody()).isNotNull();
                assertThat(response.getBody().getItem().getName()).isEqualTo("Updated Name");
        }

        @Test
        @Order(4)
        @DisplayName("POST /todo/update - should mark task as complete")
        void testMarkTaskComplete() {
                // Arrange
                TodoItem createdTask = createTask("Task to complete", "Work");
                Long taskId = createdTask.getId();

                java.net.URI updateUrl = UriComponentsBuilder.fromUriString(baseUrl + "/update")
                                .queryParam("id", taskId)
                                .queryParam("field", "complete")
                                .queryParam("value", "true")
                                .build()
                                .toUri();

                // Act
                ResponseEntity<TodoOperationResult> response = restTemplate.postForEntity(
                                updateUrl, null, TodoOperationResult.class);

                // Assert
                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
                assertThat(response.getBody()).isNotNull();
                assertThat(response.getBody().getItem().isComplete()).isTrue();
        }

        @Test
        @Order(5)
        @DisplayName("DELETE /todo/delete/{id} - should delete task")
        void testDeleteTask() {
                // Arrange
                TodoItem createdTask = createTask("Task to delete", "Work");
                Long taskId = createdTask.getId();

                // Act
                restTemplate.delete(baseUrl + "/delete/" + taskId);

                // Assert - Verify task is deleted
                ResponseEntity<List<TodoItem>> response = restTemplate.exchange(
                                baseUrl + "/all",
                                HttpMethod.GET,
                                null,
                                TODO_ITEM_LIST_TYPE);

                assertThat(response.getBody()).isEmpty();
        }

        @Test
        @Order(6)
        @DisplayName("GET /todo/allbydate - should return tasks grouped by date")
        void testGetAllByDate() {
                // Arrange
                createTask("Today Task", "Work");

                // Act
                ResponseEntity<GroupedTodoItems> response = restTemplate.getForEntity(
                                baseUrl + "/allbydate", GroupedTodoItems.class);

                // Assert
                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
                assertThat(response.getBody()).isNotNull();
        }

        // ============================================
        // Bug Regression Tests
        // ============================================

        @Test
        @Order(7)
        @DisplayName("POST /todo/update - should update category without creating duplicate (Bug 417)")
        void testUpdateCategoryOfCompletedTask() {
                // Arrange - Create and complete a task
                TodoItem createdTask = createTask("Test Category Update", "OldProject");
                Long taskId = createdTask.getId();

                // Mark as complete
                java.net.URI completeUrl = UriComponentsBuilder.fromUriString(baseUrl + "/update")
                                .queryParam("id", taskId)
                                .queryParam("field", "complete")
                                .queryParam("value", "true")
                                .build()
                                .toUri();
                restTemplate.postForEntity(completeUrl, null, TodoOperationResult.class);

                // Act - Update category
                java.net.URI updateUrl = UriComponentsBuilder.fromUriString(baseUrl + "/update")
                                .queryParam("id", taskId)
                                .queryParam("field", "category")
                                .queryParam("value", "NewProject")
                                .build()
                                .toUri();

                ResponseEntity<TodoOperationResult> response = restTemplate.postForEntity(
                                updateUrl, null, TodoOperationResult.class);

                // Assert - Category updated, no duplicate
                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
                assertThat(response.getBody()).isNotNull();
                assertThat(response.getBody().getItem().getCategory()).isEqualTo("NewProject");
                assertThat(response.getBody().getItem().isComplete()).isTrue();

                // Verify only one task exists
                ResponseEntity<List<TodoItem>> allTasks = restTemplate.exchange(
                                baseUrl + "/all",
                                HttpMethod.GET,
                                null,
                                TODO_ITEM_LIST_TYPE);
                assertThat(allTasks.getBody()).hasSize(1);
        }

        @Test
        @Order(8)
        @DisplayName("POST /todo/update - should update recurring task fields correctly (Bug 652, 802)")
        void testUpdateRecurringTaskFields() {
                // Arrange - Create task with initial values
                TodoItem createdTask = createTask("Recurring Task", "Work");
                Long taskId = createdTask.getId();

                // Act - Set repeat type
                java.net.URI repeatTypeUrl = UriComponentsBuilder.fromUriString(baseUrl + "/update")
                                .queryParam("id", taskId)
                                .queryParam("field", "repeatType")
                                .queryParam("value", "EVERY_X_DAYS")
                                .build()
                                .toUri();

                ResponseEntity<TodoOperationResult> repeatTypeResponse = restTemplate.postForEntity(
                                repeatTypeUrl, null, TodoOperationResult.class);

                // Assert repeat type
                assertThat(repeatTypeResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
                assertThat(repeatTypeResponse.getBody().getItem().getRepeatType())
                                .isEqualTo(TodoItem.RepeatPattern.EVERY_X_DAYS);

                // Act - Set repeat duration
                java.net.URI repeatDurationUrl = UriComponentsBuilder.fromUriString(baseUrl + "/update")
                                .queryParam("id", taskId)
                                .queryParam("field", "repeatDuration")
                                .queryParam("value", "7")
                                .build()
                                .toUri();

                ResponseEntity<TodoOperationResult> durationResponse = restTemplate.postForEntity(
                                repeatDurationUrl, null, TodoOperationResult.class);

                // Assert repeat duration
                assertThat(durationResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
                assertThat(durationResponse.getBody().getItem().getRepeatDuration()).isEqualTo(7);
        }

        @Test
        @Order(9)
        @DisplayName("POST /todo/update - should update task date correctly (Bug 756)")
        void testUpdateTaskDate() {
                // Arrange - Create a task
                TodoItem createdTask = createTask("Task to Reschedule", "Work");
                Long taskId = createdTask.getId();
                LocalDate newDate = LocalDate.now().plusDays(7);

                // Act - Update date
                java.net.URI updateUrl = UriComponentsBuilder.fromUriString(baseUrl + "/update")
                                .queryParam("id", taskId)
                                .queryParam("field", "taskDate")
                                .queryParam("value", newDate.toString())
                                .build()
                                .toUri();

                ResponseEntity<TodoOperationResult> response = restTemplate.postForEntity(
                                updateUrl, null, TodoOperationResult.class);

                // Assert
                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
                assertThat(response.getBody()).isNotNull();
                assertThat(response.getBody().getItem().getTaskDate()).isEqualTo(newDate);
        }

        @Test
        @Order(10)
        @DisplayName("POST /todo/update - should update priority field")
        void testUpdatePriority() {
                // Arrange
                TodoItem createdTask = createTask("Priority Task", "Work");
                Long taskId = createdTask.getId();

                // Act
                java.net.URI updateUrl = UriComponentsBuilder.fromUriString(baseUrl + "/update")
                                .queryParam("id", taskId)
                                .queryParam("field", "priority")
                                .queryParam("value", "3")
                                .build()
                                .toUri();

                ResponseEntity<TodoOperationResult> response = restTemplate.postForEntity(
                                updateUrl, null, TodoOperationResult.class);

                // Assert
                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
                assertThat(response.getBody().getItem().getPriority()).isEqualTo(3);
        }

        @Test
        @Order(11)
        @DisplayName("POST /todo/update - should update dayOrder correctly")
        void testUpdateDayOrder() {
                // Arrange
                TodoItem task1 = createTask("Task 1", "Work");
                createTask("Task 2", "Work"); // Create second task to establish ordering context

                // Act - Reorder task1 to position 3
                java.net.URI updateUrl = UriComponentsBuilder.fromUriString(baseUrl + "/update")
                                .queryParam("id", task1.getId())
                                .queryParam("field", "dayOrder")
                                .queryParam("value", "3")
                                .build()
                                .toUri();

                ResponseEntity<TodoOperationResult> response = restTemplate.postForEntity(
                                updateUrl, null, TodoOperationResult.class);

                // Assert
                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
                assertThat(response.getBody().getItem().getDayOrder()).isEqualTo(3);
        }

        @Test
        @Order(12)
        @DisplayName("POST /todo/update - should update inProgress field")
        void testUpdateInProgress() {
                // Arrange
                TodoItem createdTask = createTask("In Progress Task", "Work");
                Long taskId = createdTask.getId();

                // Act
                java.net.URI updateUrl = UriComponentsBuilder.fromUriString(baseUrl + "/update")
                                .queryParam("id", taskId)
                                .queryParam("field", "inProgress")
                                .queryParam("value", "true")
                                .build()
                                .toUri();

                ResponseEntity<TodoOperationResult> response = restTemplate.postForEntity(
                                updateUrl, null, TodoOperationResult.class);

                // Assert
                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
                assertThat(response.getBody().getItem().isInProgress()).isTrue();
        }

        @Test
        @Order(13)
        @DisplayName("POST /todo/update - should update longTerm field")
        void testUpdateLongTerm() {
                // Arrange
                TodoItem createdTask = createTask("Long Term Task", "Work");
                Long taskId = createdTask.getId();

                // Act
                java.net.URI updateUrl = UriComponentsBuilder.fromUriString(baseUrl + "/update")
                                .queryParam("id", taskId)
                                .queryParam("field", "longTerm")
                                .queryParam("value", "true")
                                .build()
                                .toUri();

                ResponseEntity<TodoOperationResult> response = restTemplate.postForEntity(
                                updateUrl, null, TodoOperationResult.class);

                // Assert
                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
                assertThat(response.getBody().getItem().isLongTerm()).isTrue();
        }

        @Test
        @Order(14)
        @DisplayName("POST /todo/update - should update timeTaken field")
        void testUpdateTimeTaken() {
                // Arrange
                TodoItem createdTask = createTask("Timed Task", "Work");
                Long taskId = createdTask.getId();

                // Mark as in progress first, then complete with time
                java.net.URI completeUrl = UriComponentsBuilder.fromUriString(baseUrl + "/update")
                                .queryParam("id", taskId)
                                .queryParam("field", "complete")
                                .queryParam("value", "true")
                                .build()
                                .toUri();
                restTemplate.postForEntity(completeUrl, null, TodoOperationResult.class);

                // Act - Set time taken
                java.net.URI updateUrl = UriComponentsBuilder.fromUriString(baseUrl + "/update")
                                .queryParam("id", taskId)
                                .queryParam("field", "timeTaken")
                                .queryParam("value", "3600000") // 1 hour in milliseconds
                                .build()
                                .toUri();

                ResponseEntity<TodoOperationResult> response = restTemplate.postForEntity(
                                updateUrl, null, TodoOperationResult.class);

                // Assert
                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
                assertThat(response.getBody().getItem().getTimeTaken()).isEqualTo(3600000L);
        }

        @Test
        @Order(15)
        @DisplayName("POST /todo/update - should return error for invalid field")
        void testUpdateInvalidField() {
                // Arrange
                TodoItem createdTask = createTask("Test Task", "Work");
                Long taskId = createdTask.getId();

                // Act
                java.net.URI updateUrl = UriComponentsBuilder.fromUriString(baseUrl + "/update")
                                .queryParam("id", taskId)
                                .queryParam("field", "invalidField")
                                .queryParam("value", "value")
                                .build()
                                .toUri();

                ResponseEntity<TodoOperationResult> response = restTemplate.postForEntity(
                                updateUrl, null, TodoOperationResult.class);

                // Assert
                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
                assertThat(response.getBody().getStatus()).contains("Error");
        }

        @Test
        @Order(16)
        @DisplayName("POST /todo/update - should return error for non-existent task")
        void testUpdateNonExistentTask() {
                // Act
                java.net.URI updateUrl = UriComponentsBuilder.fromUriString(baseUrl + "/update")
                                .queryParam("id", 99999)
                                .queryParam("field", "taskName")
                                .queryParam("value", "New Name")
                                .build()
                                .toUri();

                ResponseEntity<TodoOperationResult> response = restTemplate.postForEntity(
                                updateUrl, null, TodoOperationResult.class);

                // Assert
                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
                assertThat(response.getBody().getStatus()).contains("Error");
                assertThat(response.getBody().getItem()).isNull();
        }

        /**
         * Helper method to create a task for testing
         */
        @edu.umd.cs.findbugs.annotations.SuppressFBWarnings(value = "NP_NULL_ON_SOME_PATH_FROM_RETURN_VALUE", justification = "Objects.requireNonNull ensures non-null values in test helper method")
        private TodoItem createTask(String name, String category) {
                java.net.URI url = UriComponentsBuilder.fromUriString(baseUrl + "/add")
                                .queryParam("name", name)
                                .queryParam("category", category)
                                .queryParam("taskDate", LocalDate.now().toString())
                                .queryParam("priority", 0)
                                .build()
                                .toUri();

                ResponseEntity<TodoOperationResult> response = restTemplate.postForEntity(
                                url, null, TodoOperationResult.class);

                // Null safety check for response body
                TodoOperationResult result = response.getBody();
                Objects.requireNonNull(result, "Response body should not be null");
                TodoItem item = result.getItem();
                Objects.requireNonNull(item, "Created item should not be null");
                return item;
        }
}
