package com.myapp.todo;

import com.myapp.todo.dto.GoalView;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class GoalService {

    private static final Logger logger = LoggerFactory.getLogger(GoalService.class);

    private final GoalRepository repository;
    private final TodoItemRepository taskRepository;

    public GoalService(GoalRepository repository, TodoItemRepository taskRepository) {
        this.repository = repository;
        this.taskRepository = taskRepository;
    }

    public List<GoalView> list() {
        List<GoalView> views = new ArrayList<>();
        for (Goal goal : repository.findAll()) {
            views.add(toView(goal));
        }
        views.sort(Comparator
                .comparing((GoalView v) -> v.getStatus() != Goal.Status.ACTIVE)
                .thenComparing(GoalView::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(GoalView::getId, Comparator.nullsLast(Comparator.reverseOrder())));
        return views;
    }

    public GoalView get(Long id) {
        return toView(find(id));
    }

    public GoalView create(String title, Goal.Kind kind, Goal.Mode mode) {
        String trimmed = cleanTitle(title);
        Goal goal = new Goal(trimmed);
        if (kind != null) {
            goal.setKind(kind);
        }
        if (mode != null) {
            goal.setMode(mode);
        }
        Goal saved = repository.save(goal);
        logger.info("Created goal {} '{}'", saved.getId(), saved.getTitle());
        return toView(saved);
    }

    /**
     * Partial update. Mode may switch freely in core; roadmap draft handling
     * lives with the roadmap feature. Linking is not done here — tasks carry
     * {@code goalId}.
     */
    public GoalView update(Long id, Map<String, String> fields) {
        Goal goal = find(id);
        if (fields != null) {
            if (fields.containsKey("title")) {
                goal.setTitle(cleanTitle(fields.get("title")));
            }
            if (fields.containsKey("mode")) {
                goal.setMode(parseMode(fields.get("mode")));
            }
            if (fields.containsKey("metricCurrent")) {
                goal.setMetricCurrent(parseDouble(fields.get("metricCurrent"), "metricCurrent"));
            }
            if (fields.containsKey("metricTarget")) {
                String raw = fields.get("metricTarget");
                goal.setMetricTarget(raw == null || raw.isBlank() || "null".equals(raw)
                        ? null : parseDouble(raw, "metricTarget"));
            }
            if (fields.containsKey("metricUnit")) {
                String raw = fields.get("metricUnit");
                goal.setMetricUnit(raw == null || "null".equals(raw) || raw.isBlank() ? null : raw.trim());
            }
            if (fields.containsKey("repsTarget")) {
                String raw = fields.get("repsTarget");
                if (raw == null || raw.isBlank() || "null".equals(raw)) {
                    goal.setRepsTarget(null);
                } else {
                    try {
                        goal.setRepsTarget(Integer.parseInt(raw.trim()));
                    } catch (NumberFormatException e) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "repsTarget must be a number");
                    }
                }
            }
        }
        Goal saved = repository.save(goal);
        return toView(saved);
    }

    /** Manual completion: archived, reopenable. */
    public GoalView complete(Long id) {
        Goal goal = find(id);
        if (goal.getStatus() != Goal.Status.COMPLETED) {
            goal.setStatus(Goal.Status.COMPLETED);
            goal.setCompletedAt(LocalDateTime.now());
            repository.save(goal);
            logger.info("Completed goal {}", id);
        }
        return toView(goal);
    }

    public GoalView reopen(Long id) {
        Goal goal = find(id);
        if (goal.getStatus() != Goal.Status.ACTIVE) {
            goal.setStatus(Goal.Status.ACTIVE);
            goal.setCompletedAt(null);
            repository.save(goal);
            logger.info("Reopened goal {}", id);
        }
        return toView(goal);
    }

    /**
     * Deleting a goal unlinks its tasks (goalId cleared) but leaves longTerm
     * alone — unlinking never auto-clears the growth flag.
     */
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            return;
        }
        for (TodoItem task : taskRepository.findByGoalId(id)) {
            task.setGoalId(null);
            taskRepository.save(task);
        }
        repository.deleteById(id);
        logger.info("Deleted goal {}", id);
    }

    public List<TodoItem> linkedTasks(Long id) {
        find(id);
        return taskRepository.findByGoalId(id);
    }

    public boolean exists(Long id) {
        return id != null && repository.existsById(id);
    }

    private GoalView toView(Goal goal) {
        GoalView view = GoalView.from(goal);
        List<TodoItem> linked = taskRepository.findByGoalId(goal.getId());
        long completed = linked.stream().filter(TodoItem::isComplete).count();
        view.setLinkedTotal(linked.size());
        view.setLinkedCompleted(completed);
        view.setRepsCount(completed);
        view.setTargetMet(isTargetMet(goal, completed));
        return view;
    }

    private boolean isTargetMet(Goal goal, long completedReps) {
        if (goal.getStatus() == Goal.Status.COMPLETED) {
            return false;
        }
        switch (goal.getMode()) {
            case METRIC:
                return goal.getMetricTarget() != null
                        && goal.getMetricCurrent() != null
                        && goal.getMetricCurrent() >= goal.getMetricTarget();
            case REPS:
                return goal.getRepsTarget() != null && completedReps >= goal.getRepsTarget();
            default:
                return false;
        }
    }

    private Goal find(Long id) {
        Optional<Goal> match = repository.findById(id);
        if (match.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Goal not found");
        }
        return match.get();
    }

    private String cleanTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title is required");
        }
        return title.trim();
    }

    private Goal.Mode parseMode(String raw) {
        try {
            return Goal.Mode.valueOf(raw.trim().toUpperCase());
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid mode: " + raw);
        }
    }

    private Double parseDouble(String raw, String field) {
        if (raw == null || raw.isBlank() || "null".equals(raw)) {
            return null;
        }
        try {
            return Double.parseDouble(raw.trim());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be a number");
        }
    }
}
