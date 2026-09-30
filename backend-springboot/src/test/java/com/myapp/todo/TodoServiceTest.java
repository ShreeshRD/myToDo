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
                TodoItem.RepeatPattern.NONE, 0, 1, false);

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
        assertTrue(sampleItem.isDeleted()); // soft delete keeps a tombstone for sync
        assertNotNull(sampleItem.getUpdatedAt());
        verify(repository, never()).deleteById(anyLong());
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

    // --- Recurrence (moved from the frontend's addNextRepeat) ---

    private TodoItem recurring(TodoItem.RepeatPattern type, int duration, LocalDate date) {
        TodoItem item = new TodoItem(date, 1, "Home", "Water plants");
        item.setId(7L);
        item.setRepeatType(type);
        item.setRepeatDuration(duration);
        item.setPriority(2);
        item.setAssignedTime(java.time.LocalTime.of(9, 30));
        item.setReminderMinutesBefore(15);
        return item;
    }

    private void stubSaves() {
        when(repository.save(any(TodoItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void completingRecurringTaskCreatesNextOccurrence() {
        TodoItem item = recurring(TodoItem.RepeatPattern.EVERY_X_DAYS, 3, LocalDate.of(2026, 9, 29));
        when(repository.findById(7L)).thenReturn(Optional.of(item));
        when(repository.findByTaskDate(LocalDate.of(2026, 10, 2))).thenReturn(new ArrayList<>());
        stubSaves();

        TodoOperationResult result = todoService.updateTaskField(7L, "complete", "true");

        TodoItem next = result.getNextItem();
        assertNotNull(next);
        assertEquals(LocalDate.of(2026, 10, 2), next.getTaskDate());
        assertEquals("Water plants", next.getName());
        assertEquals(2, next.getPriority());
        assertEquals(TodoItem.RepeatPattern.EVERY_X_DAYS, next.getRepeatType());
        assertFalse(next.isComplete());
        // Keeps the scheduled time even though completion overwrote the original's assignedTime
        assertEquals(java.time.LocalTime.of(9, 30), next.getAssignedTime());
        assertEquals(15, next.getReminderMinutesBefore());
        assertNotNull(next.getUuid());
    }

    @Test
    void completingRecurringTaskSkipsDuplicate() {
        TodoItem item = recurring(TodoItem.RepeatPattern.EVERY_X_WEEKS, 1, LocalDate.of(2026, 9, 29));
        TodoItem existing = new TodoItem(LocalDate.of(2026, 10, 6), 1, "Home", "Water plants");
        existing.setId(8L);
        when(repository.findById(7L)).thenReturn(Optional.of(item));
        when(repository.findByTaskDate(LocalDate.of(2026, 10, 6))).thenReturn(List.of(existing));
        stubSaves();

        TodoOperationResult result = todoService.updateTaskField(7L, "complete", "true");

        assertEquals("Updated", result.getStatus());
        assertNull(result.getNextItem());
    }

    @Test
    void completingAlreadyCompleteTaskDoesNotRepeat() {
        TodoItem item = recurring(TodoItem.RepeatPattern.EVERY_X_DAYS, 1, LocalDate.of(2026, 9, 29));
        item.setComplete(true);
        when(repository.findById(7L)).thenReturn(Optional.of(item));
        stubSaves();

        assertNull(todoService.updateTaskField(7L, "complete", "true").getNextItem());
    }

    @Test
    void completingNonRecurringTaskHasNoNextItem() {
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        stubSaves();

        assertNull(todoService.updateTaskField(1L, "complete", "true").getNextItem());
    }

    @Test
    void updateReminderMinutesBefore() {
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        stubSaves();

        todoService.updateTaskField(1L, "reminderMinutesBefore", "10");
        assertEquals(10, sampleItem.getReminderMinutesBefore());
        todoService.updateTaskField(1L, "reminderMinutesBefore", "null");
        assertNull(sampleItem.getReminderMinutesBefore());
    }

    @Test
    void groupedByDateSkipsDeletedAndToleratesNullDayOrder() {
        TodoItem a = new TodoItem(LocalDate.of(2026, 9, 29), null, "Work", "No order");
        TodoItem b = new TodoItem(LocalDate.of(2026, 9, 29), 1, "Work", "First");
        TodoItem gone = new TodoItem(LocalDate.of(2026, 9, 30), 1, "Work", "Deleted");
        gone.setDeleted(true);
        when(repository.findAll()).thenReturn(Arrays.asList(a, b, gone));

        GroupedTodoItems result = todoService.getGroupedByDate();

        assertEquals(1, result.getItemsByDate().size());
        List<TodoItem> day = result.getItemsByDate().get("2026-09-29");
        assertEquals("First", day.get(0).getName());
        assertEquals("No order", day.get(1).getName());
    }

    @Test
    void editTaskUpdatesInPlaceAndKeepsProgress() {
        sampleItem.setUuid("fixed-uuid");
        sampleItem.setInProgress(true);
        sampleItem.setTimeTaken(120L);
        sampleItem.setDayOrder(4);
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        stubSaves();

        TodoOperationResult result = todoService.editTask(1L, "Home", "Renamed", sampleItem.getTaskDate(),
                TodoItem.RepeatPattern.NONE, 0, 3, false, java.time.LocalTime.of(9, 0), 10);

        assertEquals("Updated", result.getStatus());
        assertSame(sampleItem, result.getItem());
        assertEquals("fixed-uuid", sampleItem.getUuid());
        assertEquals("Renamed", sampleItem.getName());
        assertEquals("Home", sampleItem.getCategory());
        assertEquals(3, sampleItem.getPriority());
        assertEquals(10, sampleItem.getReminderMinutesBefore());
        assertEquals(4, sampleItem.getDayOrder());
        assertTrue(sampleItem.isInProgress());
        assertEquals(120L, sampleItem.getTimeTaken());
        verify(repository, never()).delete(any());
    }

    @Test
    void editTaskMovedToAnotherDayGoesLast() {
        LocalDate newDate = sampleItem.getTaskDate().plusDays(1);
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(repository.findByTaskDate(newDate)).thenReturn(new ArrayList<>(List.of(
                new TodoItem(newDate, 1, "Work", "A"), new TodoItem(newDate, 2, "Work", "B"))));
        stubSaves();

        todoService.editTask(1L, "Work", "Test Task", newDate, null, null, null, null, null, null);

        assertEquals(newDate, sampleItem.getTaskDate());
        assertEquals(3, sampleItem.getDayOrder());
    }

    @Test
    void editTaskRejectsDeletedTask() {
        sampleItem.setDeleted(true);
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));

        TodoOperationResult result = todoService.editTask(1L, "Work", "X", sampleItem.getTaskDate(),
                null, null, null, null, null, null);

        assertEquals("Error: Item not found", result.getStatus());
        verify(repository, never()).save(any());
    }
}
