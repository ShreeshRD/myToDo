package com.myapp.todo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class SkillOccurrenceService {

    private static final Logger logger = LoggerFactory.getLogger(SkillOccurrenceService.class);

    private final SkillOccurrenceRepository repository;
    private final GoalRepository goalRepository;

    public SkillOccurrenceService(SkillOccurrenceRepository repository, GoalRepository goalRepository) {
        this.repository = repository;
        this.goalRepository = goalRepository;
    }

    public List<SkillOccurrence> list(Long skillId) {
        findSkill(skillId);
        return repository.findByGoalIdOrderByDateDescIdDesc(skillId);
    }

    // No @Transactional: SQLite table-sequence generator commits on a second
    // connection and self-locks inside an outer transaction (see SubtaskService).
    public SkillOccurrence create(Long skillId, String date, String durationMinutes, String rating) {
        findSkill(skillId);
        SkillOccurrence saved = repository.save(new SkillOccurrence(
                skillId,
                parseDate(date),
                requireDuration(parseInt(durationMinutes, "durationMinutes")),
                requireRating(parseInt(rating, "rating"))));
        logger.info("Logged occurrence {} for skill {}", saved.getId(), skillId);
        return saved;
    }

    public SkillOccurrence update(Long id, Map<String, String> fields) {
        SkillOccurrence occurrence = find(id);
        if (fields != null) {
            if (fields.containsKey("date")) {
                occurrence.setDate(parseDate(fields.get("date")));
            }
            if (fields.containsKey("durationMinutes")) {
                occurrence.setDurationMinutes(requireDuration(parseInt(fields.get("durationMinutes"), "durationMinutes")));
            }
            if (fields.containsKey("rating")) {
                occurrence.setRating(requireRating(parseInt(fields.get("rating"), "rating")));
            }
        }
        return repository.save(occurrence);
    }

    public void delete(Long id) {
        if (!repository.existsById(id)) {
            return;
        }
        repository.deleteById(id);
        logger.info("Deleted skill occurrence {}", id);
    }

    @Transactional
    public void deleteForSkill(Long skillId) {
        repository.deleteByGoalId(skillId);
    }

    public long countForSkill(Long skillId) {
        return repository.countByGoalId(skillId);
    }

    private void findSkill(Long skillId) {
        Goal goal = goalRepository.findById(skillId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Skill not found"));
        if (goal.getKind() != Goal.Kind.SKILL) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Goal is not a skill");
        }
    }

    private SkillOccurrence find(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Occurrence not found"));
    }

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank() || "null".equals(raw)) {
            return LocalDate.now();
        }
        try {
            return LocalDate.parse(raw.trim());
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date: " + raw);
        }
    }

    private Integer requireDuration(Integer durationMinutes) {
        if (durationMinutes == null || durationMinutes <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "durationMinutes is required and must be > 0");
        }
        return durationMinutes;
    }

    private Integer requireRating(Integer rating) {
        if (rating == null || rating < 1 || rating > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "rating is required and must be 1–5");
        }
        return rating;
    }

    private Integer parseInt(String raw, String field) {
        if (raw == null || raw.isBlank() || "null".equals(raw)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is required");
        }
        try {
            return Integer.parseInt(raw.trim());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be a number");
        }
    }
}
