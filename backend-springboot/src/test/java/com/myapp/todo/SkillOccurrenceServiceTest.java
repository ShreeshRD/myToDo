package com.myapp.todo;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SkillOccurrenceServiceTest {

    @Mock
    private SkillOccurrenceRepository repository;

    @Mock
    private GoalRepository goalRepository;

    @InjectMocks
    private SkillOccurrenceService skillOccurrenceService;

    private Goal skill() {
        Goal goal = new Goal("Guitar");
        goal.setId(1L);
        goal.setKind(Goal.Kind.SKILL);
        return goal;
    }

    @Test
    void testCreateLogsOccurrence() {
        when(goalRepository.findById(1L)).thenReturn(Optional.of(skill()));
        when(repository.save(any(SkillOccurrence.class))).thenAnswer(invocation -> {
            SkillOccurrence o = invocation.getArgument(0);
            o.setId(9L);
            return o;
        });

        SkillOccurrence created = skillOccurrenceService.create(1L, "2026-02-10", "25", "4");

        assertEquals(9L, created.getId());
        assertEquals(1L, created.getGoalId());
        assertEquals(LocalDate.of(2026, 2, 10), created.getDate());
        assertEquals(25, created.getDurationMinutes());
        assertEquals(4, created.getRating());
    }

    @Test
    void testCreateDefaultsDateToToday() {
        when(goalRepository.findById(1L)).thenReturn(Optional.of(skill()));
        when(repository.save(any(SkillOccurrence.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SkillOccurrence created = skillOccurrenceService.create(1L, null, "10", "3");

        assertEquals(LocalDate.now(), created.getDate());
    }

    @Test
    void testCreateRejectsNonSkillGoal() {
        Goal plain = new Goal("Run more");
        plain.setId(1L);
        plain.setKind(Goal.Kind.GOAL);
        when(goalRepository.findById(1L)).thenReturn(Optional.of(plain));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> skillOccurrenceService.create(1L, "2026-02-10", "10", "3"));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(repository, never()).save(any(SkillOccurrence.class));
    }

    @Test
    void testCreateRejectsMissingSkill() {
        when(goalRepository.findById(1L)).thenReturn(Optional.empty());

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> skillOccurrenceService.create(1L, "2026-02-10", "10", "3"));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
    }

    @Test
    void testCreateRejectsMissingDuration() {
        when(goalRepository.findById(1L)).thenReturn(Optional.of(skill()));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> skillOccurrenceService.create(1L, "2026-02-10", null, "3"));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
    }

    @Test
    void testCreateRejectsRatingOutOfRange() {
        when(goalRepository.findById(1L)).thenReturn(Optional.of(skill()));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> skillOccurrenceService.create(1L, "2026-02-10", "10", "6"));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
    }

    @Test
    void testUpdateChangesDurationAndRating() {
        SkillOccurrence existing = new SkillOccurrence(1L, LocalDate.of(2026, 2, 10), 15, 3);
        existing.setId(5L);
        when(repository.findById(5L)).thenReturn(Optional.of(existing));
        when(repository.save(any(SkillOccurrence.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SkillOccurrence updated = skillOccurrenceService.update(5L, Map.of(
                "durationMinutes", "40",
                "rating", "5",
                "date", "2026-02-11"));

        assertEquals(40, updated.getDurationMinutes());
        assertEquals(5, updated.getRating());
        assertEquals(LocalDate.of(2026, 2, 11), updated.getDate());
    }

    @Test
    void testListRequiresSkill() {
        Goal plain = new Goal("Run more");
        plain.setId(1L);
        plain.setKind(Goal.Kind.GOAL);
        when(goalRepository.findById(1L)).thenReturn(Optional.of(plain));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> skillOccurrenceService.list(1L));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
    }

    @Test
    void testListReturnsOrderedOccurrences() {
        SkillOccurrence first = new SkillOccurrence(1L, LocalDate.of(2026, 2, 10), 20, 4);
        when(goalRepository.findById(1L)).thenReturn(Optional.of(skill()));
        when(repository.findByGoalIdOrderByDateDescIdDesc(1L)).thenReturn(List.of(first));

        List<SkillOccurrence> rows = skillOccurrenceService.list(1L);
        assertEquals(1, rows.size());
        verify(repository).findByGoalIdOrderByDateDescIdDesc(1L);
    }

    @Test
    void testDeleteIsIdempotent() {
        when(repository.existsById(5L)).thenReturn(false);
        skillOccurrenceService.delete(5L);
        verify(repository, never()).deleteById(5L);
    }
}
