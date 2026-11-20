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

    @Mock
    private SubtaskService subtaskService;

    @Mock
    private TaskEventService taskEventService;

    @InjectMocks
    private GoalService goalService;

    private Goal activeGoal() {
        Goal goal = new Goal("Run more");
        goal.setId(1L);
        return goal;
    }

    private TodoItem roadmapStep(Long id, Integer order, LocalDate date, boolean complete) {
        TodoItem step = new TodoItem(date, 1, null, "Step " + id);
        step.setId(id);
        step.setGoalId(1L);
        step.setRoadmapOrder(order);
        step.setComplete(complete);
        return step;
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
    void testRoadmapProgressAndTargetMet() {
        Goal existing = activeGoal();
        existing.setMode(Goal.Mode.ROADMAP);
        when(repository.findById(1L)).thenReturn(Optional.of(existing));

        TodoItem doneStep = roadmapStep(10L, 1, LocalDate.now(), true);
        TodoItem openDated = roadmapStep(11L, 2, LocalDate.now().plusDays(1), false);
        TodoItem openBacklog = roadmapStep(12L, 3, null, false);
        when(taskRepository.findByGoalId(1L)).thenReturn(List.of(doneStep, openDated, openBacklog));

        GoalView view = goalService.get(1L);

        assertEquals(3, view.getRoadmapTotal());
        assertEquals(1, view.getRoadmapCompleted());
        assertFalse(view.isTargetMet());

        openDated.setComplete(true);
        openBacklog.setComplete(true);
        GoalView finished = goalService.get(1L);
        assertEquals(3, finished.getRoadmapCompleted());
        assertTrue(finished.isTargetMet());
    }

    @Test
    void testModeSwitchKeepsRoadmapDraftSteps() {
        Goal existing = activeGoal();
        existing.setMode(Goal.Mode.ROADMAP);
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        when(repository.save(any(Goal.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(taskRepository.findByGoalId(1L)).thenReturn(List.of(roadmapStep(10L, 1, null, false)));

        GoalView updated = goalService.update(1L, Map.of("mode", "METRIC"));

        assertEquals(Goal.Mode.METRIC, updated.getMode());
        // Draft step is untouched — still linked with its roadmapOrder.
        verify(taskRepository, never()).deleteById(any());
        verify(taskRepository, never()).save(any(TodoItem.class));
    }

    @Test
    void testCompleteInNonRoadmapModeDeletesUndatedIncompleteSteps() {
        Goal existing = activeGoal();
        existing.setMode(Goal.Mode.METRIC);
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        when(repository.save(any(Goal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TodoItem draft = roadmapStep(10L, 1, null, false);
        TodoItem dated = roadmapStep(11L, 2, LocalDate.now(), false);
        TodoItem finished = roadmapStep(12L, 3, null, true);
        when(taskRepository.findByGoalId(1L)).thenReturn(List.of(draft, dated, finished));

        GoalView completed = goalService.complete(1L);

        assertEquals(Goal.Status.COMPLETED, completed.getStatus());
        verify(taskRepository).deleteById(10L);
        verify(taskEventService).deleteForTask(10L);
        verify(subtaskService).deleteForTask(10L);
        verify(taskRepository, never()).deleteById(11L);
        verify(taskRepository, never()).deleteById(12L);
    }

    @Test
    void testCompleteInRoadmapModeKeepsSteps() {
        Goal existing = activeGoal();
        existing.setMode(Goal.Mode.ROADMAP);
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        when(repository.save(any(Goal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TodoItem draft = roadmapStep(10L, 1, null, false);
        when(taskRepository.findByGoalId(1L)).thenReturn(List.of(draft));

        goalService.complete(1L);

        verify(taskRepository, never()).deleteById(any());
    }

    @Test
    void testAddRoadmapStepAssignsNextOrder() {
        Goal existing = activeGoal();
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        when(taskRepository.findByGoalId(1L)).thenReturn(List.of(
                roadmapStep(10L, 1, null, false),
                roadmapStep(11L, 3, LocalDate.now(), false)));
        when(taskRepository.save(any(TodoItem.class))).thenAnswer(invocation -> {
            TodoItem step = invocation.getArgument(0);
            step.setId(99L);
            return step;
        });

        TodoItem created = goalService.addRoadmapStep(1L, "  Draft step  ", null);

        assertEquals("Draft step", created.getName());
        assertEquals(4, created.getRoadmapOrder());
        assertNull(created.getTaskDate());
        assertEquals(1L, created.getGoalId());
        assertTrue(created.isLongTerm());
        // "None" not null — null category renders as "#null" in day lists.
        assertEquals("None", created.getCategory());
        // Backlog steps never touch the day list.
        verify(taskRepository, never()).findByTaskDate(any());
    }

    @Test
    void testReorderRoadmap() {
        Goal existing = activeGoal();
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        TodoItem a = roadmapStep(10L, 1, null, false);
        TodoItem b = roadmapStep(11L, 2, null, false);
        when(taskRepository.findByGoalId(1L)).thenReturn(List.of(a, b));
        when(taskRepository.save(any(TodoItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        goalService.reorderRoadmap(1L, List.of(11L, 10L));

        assertEquals(2, a.getRoadmapOrder());
        assertEquals(1, b.getRoadmapOrder());
        verify(taskRepository, atLeast(2)).save(any(TodoItem.class));
    }

    @Test
    void testReorderRoadmapRejectsForeignTask() {
        Goal existing = activeGoal();
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        when(taskRepository.findByGoalId(1L)).thenReturn(List.of(roadmapStep(10L, 1, null, false)));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> goalService.reorderRoadmap(1L, List.of(10L, 99L)));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
    }

    @Test
    void testDeleteClearsRoadmapOrder() {
        when(repository.existsById(1L)).thenReturn(true);
        TodoItem linked = roadmapStep(10L, 1, null, false);
        linked.setLongTerm(true);
        when(taskRepository.findByGoalId(1L)).thenReturn(List.of(linked));

        goalService.delete(1L);

        assertNull(linked.getGoalId());
        assertNull(linked.getRoadmapOrder());
        assertTrue(linked.isLongTerm());
        verify(taskRepository).save(linked);
        verify(repository).deleteById(1L);
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
