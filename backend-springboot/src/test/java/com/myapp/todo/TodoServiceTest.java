package com.myapp.todo;

import com.myapp.todo.dto.TodoOperationResult;
import com.myapp.todo.dto.PushResult;
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
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TodoServiceTest {

    @Mock
    private TodoItemRepository repository;

    @Mock
    private TaskEventService taskEventService;

    @Mock
    private SubtaskService subtaskService;

    @Mock
    private GoalRepository goalRepository;

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
        TodoItem backlog = new TodoItem(null, 0, null, "Backlog step");
        backlog.setRoadmapOrder(1);
        when(repository.findAll()).thenReturn(Arrays.asList(item1, item2, backlog));

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
        // Undated roadmap backlog never appears in day lists.
        result.getItemsByDate().values().forEach(list ->
                assertTrue(list.stream().noneMatch(t -> t.getTaskDate() == null)));
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
                TodoItem.RepeatPattern.NONE, 0, 1, false, null);

        // Assert
        assertNotNull(result);
        assertEquals("Added", result.getStatus());
        assertNotNull(result.getItem());
        assertEquals("New Task", result.getItem().getName());
        assertEquals(1, result.getItem().getDayOrder()); // Should be 1 as list was empty
        verify(repository).save(any(TodoItem.class));
        verify(taskEventService).record(1L, "CREATED", "Task created");
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
        sampleItem.setAssignedTime(java.time.LocalTime.of(9, 0));
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(repository.save(any(TodoItem.class))).thenReturn(sampleItem);

        // Act
        TodoOperationResult result = todoService.updateTaskField(1L, "complete", "true");

        // Assert
        assertEquals("Updated", result.getStatus());
        assertTrue(sampleItem.isComplete());
        assertNotNull(sampleItem.getCompletedAt());
        // Completion must not overwrite the scheduled time.
        assertEquals(java.time.LocalTime.of(9, 0), sampleItem.getAssignedTime());
        // Non-recurring task: no next occurrence.
        assertNull(result.getNextTask());
    }

    @Test
    void testCompleteRecurringTaskCreatesNextOccurrence() {
        // Arrange: daily task on 2026-10-28
        sampleItem.setTaskDate(LocalDate.of(2026, 10, 28));
        sampleItem.setRepeatType(TodoItem.RepeatPattern.EVERY_X_DAYS);
        sampleItem.setRepeatDuration(1);
        sampleItem.setPriority(2);
        sampleItem.setLongTerm(true);
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(repository.findByTaskDate(LocalDate.of(2026, 10, 29))).thenReturn(new ArrayList<>());
        when(repository.save(any(TodoItem.class))).thenAnswer(invocation -> {
            TodoItem item = invocation.getArgument(0);
            if (item.getId() == null) {
                item.setId(2L);
            }
            return item;
        });

        // Act
        TodoOperationResult result = todoService.updateTaskField(1L, "complete", "true");

        // Assert
        assertTrue(sampleItem.isComplete());
        TodoItem next = result.getNextTask();
        assertNotNull(next);
        assertEquals(LocalDate.of(2026, 10, 29), next.getTaskDate());
        assertEquals("Test Task", next.getName());
        assertEquals("Work", next.getCategory());
        assertEquals(2, next.getPriority());
        assertTrue(next.isLongTerm());
        assertEquals(TodoItem.RepeatPattern.EVERY_X_DAYS, next.getRepeatType());
        assertEquals(1, next.getRepeatDuration());
        assertFalse(next.isComplete());
        verify(taskEventService).record(eq(2L), eq("CREATED"), contains("Next occurrence"));
    }

    @Test
    void testCompleteRecurringTaskSkipsDuplicate() {
        // Arrange: next day already has the same task
        sampleItem.setTaskDate(LocalDate.of(2026, 10, 28));
        sampleItem.setRepeatType(TodoItem.RepeatPattern.EVERY_X_DAYS);
        sampleItem.setRepeatDuration(1);
        TodoItem existingNext = new TodoItem(LocalDate.of(2026, 10, 29), 1, "Work", "Test Task");
        existingNext.setId(9L);
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(repository.findByTaskDate(LocalDate.of(2026, 10, 29))).thenReturn(List.of(existingNext));
        when(repository.save(any(TodoItem.class))).thenReturn(sampleItem);

        // Act
        TodoOperationResult result = todoService.updateTaskField(1L, "complete", "true");

        // Assert
        assertTrue(sampleItem.isComplete());
        assertNull(result.getNextTask());
        // Only the original was saved (no second save for a clone)
        verify(repository, times(1)).save(any(TodoItem.class));
    }

    @Test
    void testPushDoesNotGenerateRecurrence() {
        // Arrange: push path completes the original without going through updateTaskField
        LocalDate destination = LocalDate.now().plusDays(3);
        sampleItem.setTaskDate(LocalDate.now());
        sampleItem.setRepeatType(TodoItem.RepeatPattern.EVERY_X_DAYS);
        sampleItem.setRepeatDuration(1);
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(repository.markCompleteIfOpen(eq(1L), any(java.time.LocalDateTime.class))).thenReturn(1);
        when(repository.findByTaskDate(any(LocalDate.class))).thenReturn(new ArrayList<>());
        when(repository.save(any(TodoItem.class))).thenAnswer(invocation -> {
            TodoItem item = invocation.getArgument(0);
            if (item.getId() == null) {
                item.setId(3L);
            }
            return item;
        });

        // Act
        PushResult result = todoService.pushTask(1L, "Busy", destination);

        // Assert: clone exists, but no separate recurrence occurrence
        assertNotNull(result.getClone());
        assertEquals(destination, result.getClone().getTaskDate());
        // Only original + clone saved — no third recurrence row
        verify(repository, times(2)).save(any(TodoItem.class));
    }

    @Test
    void testNextOccurrenceDatePatterns() {
        assertEquals(LocalDate.of(2026, 10, 29),
                TodoService.nextOccurrenceDate(LocalDate.of(2026, 10, 28), TodoItem.RepeatPattern.EVERY_X_DAYS, 1));
        assertEquals(LocalDate.of(2026, 11, 4),
                TodoService.nextOccurrenceDate(LocalDate.of(2026, 10, 28), TodoItem.RepeatPattern.EVERY_X_WEEKS, 1));
        // Month-end clamps: Jan 31 + 1 month → Feb 28 (2026 is not a leap year)
        assertEquals(LocalDate.of(2026, 2, 28),
                TodoService.nextOccurrenceDate(LocalDate.of(2026, 1, 31), TodoItem.RepeatPattern.EVERY_X_MONTHS, 1));
        // Mask 84 = Mon+Wed+Fri (bits 6+4+2); from Wed 2026-10-28 next is Fri 2026-10-30
        assertEquals(LocalDate.of(2026, 10, 30),
                TodoService.nextOccurrenceDate(LocalDate.of(2026, 10, 28), TodoItem.RepeatPattern.SPECIFIC_WEEKDAYS, 84));
        assertNull(TodoService.nextOccurrenceDate(LocalDate.of(2026, 10, 28), TodoItem.RepeatPattern.NONE, 1));
        assertNull(TodoService.nextOccurrenceDate(LocalDate.of(2026, 10, 28), TodoItem.RepeatPattern.EVERY_X_DAYS, 0));
    }

    @Test
    void testUpdateTaskField_UncompleteClearsCompletedAt() {
        // Arrange
        sampleItem.setComplete(true);
        sampleItem.setCompletedAt(java.time.LocalDateTime.now());
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(repository.save(any(TodoItem.class))).thenReturn(sampleItem);

        // Act
        TodoOperationResult result = todoService.updateTaskField(1L, "complete", "false");

        // Assert
        assertEquals("Updated", result.getStatus());
        assertFalse(sampleItem.isComplete());
        assertNull(sampleItem.getCompletedAt());
    }

    @Test
    void testPatchTaskUpdatesMultipleFields() {
        // Arrange
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(repository.save(any(TodoItem.class))).thenReturn(sampleItem);

        java.util.Map<String, String> fields = new java.util.LinkedHashMap<>();
        fields.put("taskName", "Patched Task");
        fields.put("category", "Personal");
        fields.put("priority", "3");
        fields.put("description", "Some detail");

        // Act
        TodoOperationResult result = todoService.patchTask(1L, fields);

        // Assert
        assertEquals("Updated", result.getStatus());
        assertEquals("Patched Task", sampleItem.getName());
        assertEquals("Personal", sampleItem.getCategory());
        assertEquals(3, sampleItem.getPriority());
        assertEquals("Some detail", sampleItem.getDescription());
        verify(repository).save(sampleItem);
    }

    @Test
    void testUpdateTaskField_Description() {
        // Arrange
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(repository.save(any(TodoItem.class))).thenReturn(sampleItem);

        // Act
        TodoOperationResult result = todoService.updateTaskField(1L, "description", "  some notes  ");

        // Assert
        assertEquals("Updated", result.getStatus());
        assertEquals("  some notes  ", sampleItem.getDescription());
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
        verify(subtaskService).deleteForTask(1L);
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

    @Test
    void testPushTask_CompletesOriginalAndClonesUncheckedSubtasks() {
        // Arrange
        LocalDate destination = LocalDate.now().plusDays(3);
        Subtask done = new Subtask(1L, "Already done", 0);
        done.setDone(true);
        Subtask open = new Subtask(1L, "Still open", 1);
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(repository.markCompleteIfOpen(eq(1L), any(java.time.LocalDateTime.class))).thenReturn(1);
        when(repository.findByTaskDate(destination)).thenReturn(new ArrayList<>());
        when(repository.save(any(TodoItem.class))).thenAnswer(invocation -> {
            TodoItem item = invocation.getArgument(0);
            if (item.getId() == null) {
                item.setId(2L);
            }
            return item;
        });
        when(subtaskService.listForTask(1L)).thenReturn(Arrays.asList(done, open));

        // Act
        PushResult result = todoService.pushTask(1L, "  Waiting on client  ", destination);

        // Assert
        assertNotNull(result);
        assertEquals("Pushed", result.getStatus());
        assertTrue(result.getOriginal().isComplete());
        assertNotNull(result.getOriginal().getCompletedAt());
        assertEquals(1, result.getOriginal().getPushCount());
        assertEquals(1L, result.getOriginal().getChainRootId());

        TodoItem clone = result.getClone();
        assertEquals(destination, clone.getTaskDate());
        assertEquals(sampleItem.getName(), clone.getName());
        assertEquals(sampleItem.getCategory(), clone.getCategory());
        assertFalse(clone.isComplete());
        assertEquals(1L, clone.getPushedFromId());
        assertEquals(1L, clone.getChainRootId());
        assertEquals(1, clone.getPushCount());

        // Only the unchecked checklist row moves to the clone.
        verify(subtaskService).create(2L, "Still open");
        verify(subtaskService, never()).create(2L, "Already done");
        verify(taskEventService).record(1L, "PUSHED", "Pushed: Waiting on client",
                sampleItem.getTaskDate(), destination);
    }

    @Test
    void testPushTask_MovesRoadmapOrderToCloneWithoutTickingStep() {
        // Arrange: an open roadmap step being pushed
        LocalDate destination = LocalDate.now().plusDays(3);
        sampleItem.setRoadmapOrder(2);
        sampleItem.setGoalId(7L);
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(repository.markCompleteIfOpen(eq(1L), any(java.time.LocalDateTime.class))).thenReturn(1);
        when(repository.findByTaskDate(destination)).thenReturn(new ArrayList<>());
        when(repository.save(any(TodoItem.class))).thenAnswer(invocation -> {
            TodoItem item = invocation.getArgument(0);
            if (item.getId() == null) {
                item.setId(2L);
            }
            return item;
        });
        when(subtaskService.listForTask(1L)).thenReturn(new ArrayList<>());

        // Act
        PushResult result = todoService.pushTask(1L, "Blocked", destination);

        // Assert: original is history without the step; clone holds the pending step.
        assertNull(result.getOriginal().getRoadmapOrder());
        assertTrue(result.getOriginal().isComplete());
        assertEquals(2, result.getClone().getRoadmapOrder());
        assertEquals(7L, result.getClone().getGoalId());
        assertFalse(result.getClone().isComplete());
    }

    @Test
    void testUncompletePushedTaskRestoresRoadmapOrderFromDeletedClone() {
        // Arrange
        sampleItem.setComplete(true);
        TodoItem clone = new TodoItem(LocalDate.now().plusDays(3), 1, "Work", "Test Task");
        clone.setId(2L);
        clone.setPushedFromId(1L);
        clone.setRoadmapOrder(5);
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(repository.findByPushedFromId(1L)).thenReturn(List.of(clone));
        when(repository.save(any(TodoItem.class))).thenReturn(sampleItem);
        when(taskEventService.countActivity(2L)).thenReturn(0L);
        when(subtaskService.listForTask(2L)).thenReturn(new ArrayList<>());

        // Act
        TodoOperationResult result = todoService.updateTaskField(1L, "complete", "false");

        // Assert
        assertEquals("Updated", result.getStatus());
        assertEquals(5, sampleItem.getRoadmapOrder());
        verify(repository).deleteById(2L);
        verify(taskEventService).deleteForTask(2L);
        verify(subtaskService).deleteForTask(2L);
    }

    @Test
    void testClearTaskDateReturnsStepToBacklog() {
        // Arrange
        sampleItem.setTaskDate(LocalDate.of(2026, 10, 28));
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(repository.save(any(TodoItem.class))).thenReturn(sampleItem);

        // Act
        TodoOperationResult result = todoService.updateTaskField(1L, "taskDate", "null");

        // Assert
        assertEquals("Updated", result.getStatus());
        assertNull(sampleItem.getTaskDate());
        verify(repository).save(sampleItem);
        verify(taskEventService).record(1L, "EDITED", "Updated date");
    }

    @Test
    void testUnlinkGoalClearsRoadmapOrder() {
        // Arrange
        sampleItem.setGoalId(7L);
        sampleItem.setRoadmapOrder(3);
        sampleItem.setLongTerm(true);
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(repository.save(any(TodoItem.class))).thenReturn(sampleItem);

        // Act
        TodoOperationResult result = todoService.updateTaskField(1L, "goalId", "null");

        // Assert: unlink clears goal + roadmap slot but never auto-clears longTerm.
        assertEquals("Updated", result.getStatus());
        assertNull(sampleItem.getGoalId());
        assertNull(sampleItem.getRoadmapOrder());
        assertTrue(sampleItem.isLongTerm());
        verify(repository).save(sampleItem);
    }

    @Test
    void testPushTask_DefaultsToOneDay() {
        // Arrange
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(repository.markCompleteIfOpen(eq(1L), any(java.time.LocalDateTime.class))).thenReturn(1);
        when(repository.findByTaskDate(any(LocalDate.class))).thenReturn(new ArrayList<>());
        when(repository.save(any(TodoItem.class))).thenAnswer(invocation -> {
            TodoItem item = invocation.getArgument(0);
            if (item.getId() == null) {
                item.setId(2L);
            }
            return item;
        });
        when(subtaskService.listForTask(1L)).thenReturn(new ArrayList<>());

        // Act
        PushResult result = todoService.pushTask(1L, "Later", null);

        // Assert
        LocalDate expected = LocalDate.now(java.time.ZoneId.of("Asia/Kolkata")).plusDays(1);
        assertEquals(expected, result.getClone().getTaskDate());
    }

    @Test
    void testPushTask_RequiresReason() {
        // Arrange
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));

        // Act + Assert
        org.springframework.web.server.ResponseStatusException error = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> todoService.pushTask(1L, "   ", LocalDate.now().plusDays(3)));
        assertEquals(org.springframework.http.HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(repository, never()).save(any(TodoItem.class));
    }

    @Test
    void testPushTask_RejectsCompletedTask() {
        // Arrange
        sampleItem.setComplete(true);
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));

        // Act + Assert
        org.springframework.web.server.ResponseStatusException error = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> todoService.pushTask(1L, "Again", LocalDate.now().plusDays(3)));
        assertEquals(org.springframework.http.HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(repository, never()).save(any(TodoItem.class));
        verify(repository, never()).markCompleteIfOpen(anyLong(), any());
    }

    @Test
    void testPushTask_CompensatesWhenCloneSaveFails() {
        LocalDate destination = LocalDate.now().plusDays(3);
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(repository.markCompleteIfOpen(eq(1L), any(java.time.LocalDateTime.class))).thenReturn(1);
        when(repository.save(any(TodoItem.class))).thenThrow(new RuntimeException("db busy"));

        org.springframework.web.server.ResponseStatusException error = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> todoService.pushTask(1L, "Later", destination));
        assertEquals(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, error.getStatusCode());
        // Original left open so the client can retry.
        assertFalse(sampleItem.isComplete());
        assertNull(sampleItem.getCompletedAt());
    }

    @Test
    void testPatchTaskForcesLongTermWhenGoalLinkedRegardlessOfFieldOrder() {
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(repository.save(any(TodoItem.class))).thenReturn(sampleItem);
        Goal goal = new Goal("Linked");
        goal.setId(7L);
        when(goalRepository.findById(7L)).thenReturn(Optional.of(goal));

        java.util.Map<String, String> fields = new java.util.LinkedHashMap<>();
        fields.put("goalId", "7");
        fields.put("longTerm", "false");

        TodoOperationResult result = todoService.patchTask(1L, fields);

        assertEquals("Updated", result.getStatus());
        assertEquals(7L, sampleItem.getGoalId());
        assertTrue(sampleItem.isLongTerm());
    }

    @Test
    void testAddTaskRejectsSkillGoal() {
        when(repository.findByTaskDate(any(LocalDate.class))).thenReturn(new ArrayList<>());
        Goal skill = new Goal("Practice");
        skill.setId(9L);
        skill.setKind(Goal.Kind.SKILL);
        when(goalRepository.findById(9L)).thenReturn(Optional.of(skill));

        org.springframework.web.server.ResponseStatusException error = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> todoService.addTask("Work", "T", LocalDate.now(),
                        TodoItem.RepeatPattern.NONE, 0, 0, false, 9L));
        assertEquals(org.springframework.http.HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(repository, never()).save(any(TodoItem.class));
    }

    @Test
    void testQueryTasksSortsUndatedBacklogWithoutError() {
        TodoItem dated = new TodoItem(LocalDate.of(2026, 10, 28), 1, "None", "Dated");
        dated.setId(1L);
        TodoItem backlog = new TodoItem(null, 0, "None", "Backlog");
        backlog.setId(2L);
        backlog.setRoadmapOrder(1);
        when(repository.findAll()).thenReturn(Arrays.asList(dated, backlog));

        com.myapp.todo.dto.TaskQuery query = new com.myapp.todo.dto.TaskQuery();
        List<TodoItem> result = todoService.queryTasks(query);

        assertEquals(2, result.size());
        assertEquals(2L, result.get(0).getId()); // undated first (nullsFirst)
        assertEquals(1L, result.get(1).getId());
    }

    @Test
    void testUpdateTaskField_UncompleteDeletesUntouchedClone() {
        // Arrange
        sampleItem.setComplete(true);
        TodoItem clone = new TodoItem(LocalDate.now().plusDays(3), 1, "Work", "Test Task");
        clone.setId(2L);
        clone.setPushedFromId(1L);
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(repository.findByPushedFromId(1L)).thenReturn(List.of(clone));
        when(repository.save(any(TodoItem.class))).thenReturn(sampleItem);
        when(taskEventService.countActivity(2L)).thenReturn(0L);
        when(subtaskService.listForTask(2L)).thenReturn(new ArrayList<>());

        // Act
        TodoOperationResult result = todoService.updateTaskField(1L, "complete", "false");

        // Assert
        assertEquals("Updated", result.getStatus());
        assertNull(result.getWarning());
        verify(repository).deleteById(2L);
        verify(taskEventService).deleteForTask(2L);
        verify(subtaskService).deleteForTask(2L);
    }

    @Test
    void testUpdateTaskField_UncompleteKeepsActiveCloneAndWarns() {
        // Arrange
        sampleItem.setComplete(true);
        TodoItem clone = new TodoItem(LocalDate.now().plusDays(3), 1, "Work", "Test Task");
        clone.setId(2L);
        clone.setPushedFromId(1L);
        when(repository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(repository.findByPushedFromId(1L)).thenReturn(List.of(clone));
        when(repository.save(any(TodoItem.class))).thenReturn(sampleItem);
        when(taskEventService.countActivity(2L)).thenReturn(1L);

        // Act
        TodoOperationResult result = todoService.updateTaskField(1L, "complete", "false");

        // Assert
        assertEquals("Updated", result.getStatus());
        assertNotNull(result.getWarning());
        verify(repository, never()).deleteById(2L);
    }
}
