package com.myapp.todo;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubtaskServiceTest {

    @Mock
    private SubtaskRepository repository;

    @Mock
    private TodoItemRepository taskRepository;

    @InjectMocks
    private SubtaskService subtaskService;

    @Test
    void testCreateAppendsToEnd() {
        when(taskRepository.existsById(1L)).thenReturn(true);
        when(repository.countByTaskId(1L)).thenReturn(2L);
        when(repository.save(any(Subtask.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Subtask created = subtaskService.create(1L, "  Buy milk  ");

        assertEquals("Buy milk", created.getTitle());
        assertEquals(2, created.getSortOrder());
        assertFalse(created.isDone());
    }

    @Test
    void testCreateRejectsMissingTask() {
        when(taskRepository.existsById(1L)).thenReturn(false);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> subtaskService.create(1L, "Step"));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
        verify(repository, never()).save(any(Subtask.class));
    }

    @Test
    void testCreateRejectsBlankTitle() {
        when(taskRepository.existsById(1L)).thenReturn(true);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> subtaskService.create(1L, "   "));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
    }

    @Test
    void testUpdateTogglesDoneAndRenames() {
        Subtask existing = new Subtask(1L, "Old", 0);
        existing.setId(5L);
        when(repository.findById(5L)).thenReturn(Optional.of(existing));
        when(repository.save(any(Subtask.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Subtask updated = subtaskService.update(5L, Map.of("title", "New", "done", "true"));

        assertTrue(updated.isDone());
        assertEquals("New", updated.getTitle());
    }

    @Test
    void testReorderAppliesClientOrder() {
        Subtask first = new Subtask(1L, "A", 0);
        first.setId(10L);
        Subtask second = new Subtask(1L, "B", 1);
        second.setId(11L);
        List<Subtask> stored = new ArrayList<>(Arrays.asList(first, second));
        when(repository.findByTaskIdOrderBySortOrderAscIdAsc(1L)).thenReturn(stored);

        List<Subtask> result = subtaskService.reorder(1L, Arrays.asList(11L, 10L));

        assertEquals(0, second.getSortOrder());
        assertEquals(1, first.getSortOrder());
        assertEquals(2, result.size());
        verify(repository).saveAll(stored);
    }

    @Test
    void testCountsGroupsByTask() {
        Subtask first = new Subtask(1L, "A", 0);
        first.setDone(true);
        Subtask second = new Subtask(1L, "B", 1);
        Subtask other = new Subtask(2L, "C", 0);
        when(repository.findAll()).thenReturn(Arrays.asList(first, second, other));

        var counts = subtaskService.counts();

        assertEquals(2, counts.size());
        var firstCount = counts.stream().filter(c -> c.getTaskId().equals(1L)).findFirst().orElseThrow();
        assertEquals(2, firstCount.getTotal());
        assertEquals(1, firstCount.getDone());
    }

    @Test
    void testDeleteForTaskDelegates() {
        subtaskService.deleteForTask(3L);
        verify(repository).deleteByTaskId(3L);
    }
}
