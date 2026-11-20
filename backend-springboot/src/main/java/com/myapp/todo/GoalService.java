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
    private final SubtaskService subtaskService;
    private final TaskEventService taskEventService;

    public GoalService(GoalRepository repository, TodoItemRepository taskRepository,
            SubtaskService subtaskService, TaskEventService taskEventService) {
        this.repository = repository;
        this.taskRepository = taskRepository;
        this.subtaskService = subtaskService;
        this.taskEventService = taskEventService;
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
     * Partial update. Switching modes never deletes steps: undated incomplete
     * roadmap steps stay as a hidden draft while the goal is not in ROADMAP
     * mode, and reappear when the mode switches back. Linking is not done here
     * — tasks carry {@code goalId}.
     */
    public GoalView update(Long id, Map<String, String> fields) {
        Goal goal = find(id);
        Goal.Mode previousMode = goal.getMode();
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
        if (previousMode != saved.getMode()) {
            logger.info("Goal {} mode {} -> {}", id, previousMode, saved.getMode());
        }
        return toView(saved);
    }

    /**
     * Manual completion: archived, reopenable. When the goal is not in ROADMAP
     * mode, undated incomplete steps are draft leftovers and are deleted;
     * dated or completed steps remain as normal goal tasks.
     */
    public GoalView complete(Long id) {
        Goal goal = find(id);
        if (goal.getStatus() != Goal.Status.COMPLETED) {
            if (goal.getMode() != Goal.Mode.ROADMAP) {
                cleanupDraftRoadmapSteps(id);
            }
            goal.setStatus(Goal.Status.COMPLETED);
            goal.setCompletedAt(LocalDateTime.now());
            repository.save(goal);
            logger.info("Completed goal {}", id);
        }
        return toView(goal);
    }

    private void cleanupDraftRoadmapSteps(Long goalId) {
        for (TodoItem step : taskRepository.findByGoalId(goalId)) {
            boolean isDraftStep = step.getRoadmapOrder() != null
                    && step.getTaskDate() == null
                    && !step.isComplete();
            if (isDraftStep) {
                taskRepository.deleteById(step.getId());
                taskEventService.deleteForTask(step.getId());
                subtaskService.deleteForTask(step.getId());
                logger.info("Deleted undated incomplete roadmap step {}", step.getId());
            }
        }
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
     * Deleting a goal unlinks its tasks (goalId and roadmapOrder cleared) but
     * leaves longTerm alone — unlinking never auto-clears the growth flag.
     */
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            return;
        }
        for (TodoItem task : taskRepository.findByGoalId(id)) {
            task.setGoalId(null);
            task.setRoadmapOrder(null);
            taskRepository.save(task);
        }
        repository.deleteById(id);
        logger.info("Deleted goal {}", id);
    }

    public List<TodoItem> linkedTasks(Long id) {
        find(id);
        return taskRepository.findByGoalId(id);
    }

    /**
     * Creates a roadmap step: a goal-linked task with the next roadmapOrder.
     * A null date leaves it in the backlog (never in day lists).
     */
    public TodoItem addRoadmapStep(Long goalId, String name, java.time.LocalDate date) {
        Goal goal = find(goalId);
        if (goal.getStatus() != Goal.Status.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Goal is completed");
        }
        String trimmed = cleanTitle(name);
        List<TodoItem> linked = taskRepository.findByGoalId(goalId);
        int nextOrder = linked.stream()
                .map(TodoItem::getRoadmapOrder)
                .filter(order -> order != null)
                .mapToInt(Integer::intValue)
                .max()
                .orElse(0) + 1;
        int dayOrder = date != null ? taskRepository.findByTaskDate(date).size() + 1 : 0;
        // "None" (not null) matches what normal tasks use for "no project" —
        // a null category renders as "#null" in day-list infobars.
        TodoItem step = new TodoItem(date, dayOrder, "None", trimmed);
        step.setGoalId(goalId);
        step.setRoadmapOrder(nextOrder);
        step.setLongTerm(true);
        step.setPriority(0);
        step.setRepeatType(TodoItem.RepeatPattern.NONE);
        step.setRepeatDuration(0);
        TodoItem saved = taskRepository.save(step);
        logger.info("Added roadmap step {} to goal {}", saved.getId(), goalId);
        return saved;
    }

    /** Reorders roadmap steps for a goal; ids must be the full ordered set. */
    public void reorderRoadmap(Long goalId, List<Long> orderedIds) {
        find(goalId);
        if (orderedIds == null || orderedIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "orderedIds is required");
        }
        List<TodoItem> steps = taskRepository.findByGoalId(goalId);
        Map<Long, TodoItem> byId = new java.util.HashMap<>();
        for (TodoItem step : steps) {
            if (step.getRoadmapOrder() != null) {
                byId.put(step.getId(), step);
            }
        }
        if (orderedIds.size() != byId.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "orderedIds must include every roadmap step");
        }
        int order = 1;
        for (Long taskId : orderedIds) {
            TodoItem step = byId.get(taskId);
            if (step == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Task " + taskId + " is not a roadmap step of this goal");
            }
            step.setRoadmapOrder(order++);
            taskRepository.save(step);
        }
    }

    public boolean exists(Long id) {
        return id != null && repository.existsById(id);
    }

    private GoalView toView(Goal goal) {
        GoalView view = GoalView.from(goal);
        List<TodoItem> linked = taskRepository.findByGoalId(goal.getId());
        long completed = linked.stream().filter(TodoItem::isComplete).count();
        long roadmapTotal = linked.stream().filter(t -> t.getRoadmapOrder() != null).count();
        long roadmapCompleted = linked.stream()
                .filter(t -> t.getRoadmapOrder() != null && t.isComplete())
                .count();
        view.setLinkedTotal(linked.size());
        view.setLinkedCompleted(completed);
        view.setRepsCount(completed);
        view.setRoadmapTotal(roadmapTotal);
        view.setRoadmapCompleted(roadmapCompleted);
        view.setTargetMet(isTargetMet(goal, completed, roadmapTotal, roadmapCompleted));
        return view;
    }

    private boolean isTargetMet(Goal goal, long completedReps, long roadmapTotal, long roadmapCompleted) {
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
            case ROADMAP:
                return roadmapTotal > 0 && roadmapCompleted >= roadmapTotal;
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
