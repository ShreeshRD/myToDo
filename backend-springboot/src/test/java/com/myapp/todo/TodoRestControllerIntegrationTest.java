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

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for TodoRestController.
 * Tests the full HTTP request/response cycle with an embedded H2 database.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class TodoRestControllerIntegrationTest {

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

                java.net.URI url = UriComponentsBuilder.fromHttpUrl(baseUrl + "/add")
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
                                new ParameterizedTypeReference<List<TodoItem>>() {
                                });

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

                java.net.URI updateUrl = UriComponentsBuilder.fromHttpUrl(baseUrl + "/update")
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

                java.net.URI updateUrl = UriComponentsBuilder.fromHttpUrl(baseUrl + "/update")
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
                                new ParameterizedTypeReference<List<TodoItem>>() {
                                });

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

        /**
         * Helper method to create a task for testing
         */
        private TodoItem createTask(String name, String category) {
                java.net.URI url = UriComponentsBuilder.fromHttpUrl(baseUrl + "/add")
                                .queryParam("name", name)
                                .queryParam("category", category)
                                .queryParam("taskDate", LocalDate.now().toString())
                                .queryParam("priority", 0)
                                .build()
                                .toUri();

                ResponseEntity<TodoOperationResult> response = restTemplate.postForEntity(
                                url, null, TodoOperationResult.class);

                return response.getBody().getItem();
        }
}
