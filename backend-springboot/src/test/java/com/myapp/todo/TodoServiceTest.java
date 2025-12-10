package com.myapp.todo;

import com.myapp.todo.dto.TodoOperationResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TodoServiceTest {

    @Mock
    private TodoItemRepository repository;

    @InjectMocks
    private TodoService todoService;

    private TodoItem sampleItem;

    @BeforeEach
    void setUp() {
        sampleItem = new TodoItem(LocalDate.now(), 1, "Work", "Test Task");
        sampleItem.setId(1L);
    }

    @Test
    void testGetGroupedByDate() {
        // Arrange
        TodoItem item1 = new TodoItem(LocalDate.of(2023, 10, 27), 1, "Work", "Task 1");
        TodoItem item2 = new TodoItem(LocalDate.of(2023, 10, 26), 1, "Personal", "Task 2");
        when(repository.findAll()).thenReturn(Arrays.asList(item1, item2));

        // Act
        GroupedTodoItems result = todoService.getGroupedByDate();

        // Assert
        assertNotNull(result);
        assertNotNull(result.getItemsByDate());
        assertEquals(2, result.getItemsByDate().size());
        assertTrue(result.getItemsByDate().containsKey("2023-10-26"));
        assertTrue(result.getItemsByDate().containsKey("2023-10-27"));

        // Verify sorting (LinkedHashMap should preserve insertion order which we expect
        // to be sorted by date)
        List<String> keys = new ArrayList<>(result.getItemsByDate().keySet());
        assertEquals("2023-10-26", keys.get(0));
        assertEquals("2023-10-27", keys.get(1));
    }

    @Test
    void testAddTask() {
        // Arrange
        when(repository.findByTaskDate(any(LocalDate.class))).thenReturn(new ArrayList<>());
        when(repository.save(any(TodoItem.class))).thenAnswer(invocation -> {
            TodoItem item = invocation.getArgument(0);
            item.setId(1L);
            return item;
        });

        // Act
        TodoOperationResult result = todoService.addTask("Work", "New Task", LocalDate.now(),
                TodoItem.RepeatPattern.NONE, 0, 1);

        // Assert
        assertNotNull(result);
        assertEquals("Added", result.getStatus());
        assertNotNull(result.getItem());
        assertEquals("New Task", result.getItem().getName());
        assertEquals(1, result.getItem().getDayOrder()); // Should be 1 as list was empty
        verify(repository).save(any(TodoItem.class));
    }

    @Test
    void testUpdateTaskField_TaskName() {
        // Arrange
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(repository.save(any(TodoItem.class))).thenReturn(sampleItem);

        // Act
        TodoOperationResult result = todoService.updateTaskField(1L, "taskName", "Updated Task");

        // Assert
        assertEquals("Updated", result.getStatus());
        assertEquals("Updated Task", sampleItem.getName());
    }

    @Test
    void testUpdateTaskField_Complete() {
        // Arrange
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(repository.save(any(TodoItem.class))).thenReturn(sampleItem);

        // Act
        TodoOperationResult result = todoService.updateTaskField(1L, "complete", "true");

        // Assert
        assertEquals("Updated", result.getStatus());
        assertTrue(sampleItem.isComplete());
        assertNotNull(sampleItem.getAssignedTime()); // Check if correct time is assigned
    }

    @Test
    void testUpdateTaskField_InvalidField() {
        // Arrange
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));

        // Act
        TodoOperationResult result = todoService.updateTaskField(1L, "invalidField", "value");

        // Assert
        assertTrue(result.getStatus().contains("Error"));
        assertEquals("Error: Invalid field", result.getStatus());
        verify(repository, never()).save(any(TodoItem.class));
    }

    @Test
    void testUpdateTaskField_NotFound() {
        // Arrange
        when(repository.findById(1L)).thenReturn(Optional.empty());

        // Act
        TodoOperationResult result = todoService.updateTaskField(1L, "taskName", "New Name");

        // Assert
        assertEquals("Error: Item not found", result.getStatus());
    }

    @Test
    void testDeleteTask_Success() {
        // Arrange
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));

        // Act
        boolean result = todoService.deleteTask(1L);

        // Assert
        assertFalse(result); // returns item.isComplete() which is false initially
        verify(repository).deleteById(1L);
    }

    @Test
    void testDeleteTask_NotFound() {
        // Arrange
        when(repository.findById(1L)).thenReturn(Optional.empty());

        // Act
        boolean result = todoService.deleteTask(1L);

        // Assert
        assertFalse(result);
        verify(repository, never()).deleteById(anyLong());
    }
}
