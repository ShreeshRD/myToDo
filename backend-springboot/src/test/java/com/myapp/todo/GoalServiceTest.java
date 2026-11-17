package com.myapp.todo;

import com.myapp.todo.dto.GoalView;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GoalServiceTest {

    @Mock
    private GoalRepository repository;

    @Mock
    private TodoItemRepository taskRepository;

    @InjectMocks
    private GoalService goalService;

    private Goal activeGoal() {
        Goal goal = new Goal("Run more");
        goal.setId(1L);
        return goal;
    }

    @Test
    void testCreateDefaults() {
        when(repository.save(any(Goal.class))).thenAnswer(invocation -> {
            Goal g = invocation.getArgument(0);
            g.setId(7L);
            return g;
        });

        GoalView created = goalService.create("  Run more  ", null, null);

        assertEquals("Run more", created.getTitle());
        assertEquals(Goal.Kind.GOAL, created.getKind());
        assertEquals(Goal.Mode.METRIC, created.getMode());
        assertEquals(Goal.Status.ACTIVE, created.getStatus());
    }

    @Test
    void testCreateRejectsBlankTitle() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> goalService.create("   ", null, null));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
    }

    @Test
    void testUpdateMetricFields() {
        Goal existing = activeGoal();
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        when(repository.save(any(Goal.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(taskRepository.findByGoalId(1L)).thenReturn(List.of());

        GoalView updated = goalService.update(1L, Map.of(
                "metricCurrent", "12",
                "metricTarget", "50",
                "metricUnit", "km"));

        assertEquals(12.0, updated.getMetricCurrent());
        assertEquals(50.0, updated.getMetricTarget());
        assertEquals("km", updated.getMetricUnit());
        assertFalse(updated.isTargetMet());
    }

    @Test
    void testTargetMetWhenCurrentReachesTarget() {
        Goal existing = activeGoal();
        existing.setMetricCurrent(50.0);
        existing.setMetricTarget(50.0);
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        when(taskRepository.findByGoalId(1L)).thenReturn(List.of());

        GoalView view = goalService.get(1L);

        assertTrue(view.isTargetMet());
    }

    @Test
    void testRepsCountFromCompletedLinkedTasks() {
        Goal existing = activeGoal();
        existing.setMode(Goal.Mode.REPS);
        existing.setRepsTarget(3);
        when(repository.findById(1L)).thenReturn(Optional.of(existing));

        TodoItem done = new TodoItem(LocalDate.now(), 1, "None", "A");
        done.setComplete(true);
        TodoItem open = new TodoItem(LocalDate.now(), 2, "None", "B");
        when(taskRepository.findByGoalId(1L)).thenReturn(Arrays.asList(done, open));

        GoalView view = goalService.get(1L);

        assertEquals(1, view.getRepsCount());
        assertEquals(2, view.getLinkedTotal());
        assertEquals(1, view.getLinkedCompleted());
        assertFalse(view.isTargetMet());
    }

    @Test
    void testCompleteAndReopen() {
        Goal existing = activeGoal();
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        when(repository.save(any(Goal.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(taskRepository.findByGoalId(1L)).thenReturn(List.of());

        GoalView completed = goalService.complete(1L);
        assertEquals(Goal.Status.COMPLETED, completed.getStatus());
        assertNotNull(completed.getCompletedAt());

        GoalView reopened = goalService.reopen(1L);
        assertEquals(Goal.Status.ACTIVE, reopened.getStatus());
        assertNull(reopened.getCompletedAt());
    }

    @Test
    void testDeleteUnlinksTasks() {
        when(repository.existsById(1L)).thenReturn(true);
        TodoItem linked = new TodoItem(LocalDate.now(), 1, "None", "A");
        linked.setGoalId(1L);
        linked.setLongTerm(true);
        when(taskRepository.findByGoalId(1L)).thenReturn(List.of(linked));

        goalService.delete(1L);

        assertNull(linked.getGoalId());
        assertTrue(linked.isLongTerm());
        verify(taskRepository).save(linked);
        verify(repository).deleteById(1L);
    }

    @Test
    void testGetMissingGoalThrows() {
        when(repository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResponseStatusException.class, () -> goalService.get(99L));
    }
}
